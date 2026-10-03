import logging
import uuid as uuid_mod
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

from pydantic import TypeAdapter
from sqlalchemy import and_

from app.api.dependencies import db_session
from app.api.event_schema import EventSchema
from app.config.celery_config import celery_app
from app.config.settings import get_settings
from app.database.event import Event
from app.database.models import DocumentClassificationHistory
from app.database.repository import GenericRepository
from app.gsms.core_notify import notify_document_classified, notify_document_ingested
from app.gsms.workspace import attach_workspace, workspace_from_event_data
from app.pipelines.registry import PipelineRegistry
from app.services.classification_audit import record_classification_result
from app.services.classification_service import get_classification_service
from app.services.label_service import LabelService

"""
Pipeline Task Processing Module

This module handles asynchronous processing of pipeline events using Celery.
It manages the lifecycle of event processing from database retrieval through
pipeline execution and result storage.
"""

logger = logging.getLogger(__name__)


@celery_app.task(name="process_incoming_event")
def process_incoming_event(event_id: str):
    """Processes an incoming event through its designated pipeline.

    This Celery task handles the asynchronous processing of events by:
    1. Retrieving the event from the database
    2. Determining the appropriate pipeline
    3. Executing the pipeline
    4. Storing the results

    Args:
        event_id: Unique identifier of the event to process
    """
    with contextmanager(db_session)() as session:
        repository = GenericRepository(session=session, model=Event)

        db_event = repository.get(id=event_id)
        if db_event is None:
            raise ValueError(f"Event with id {event_id} not found")

        event = event_schema_adapter.validate_python(db_event.data)
        pipeline = PipelineRegistry.get_pipeline(event)

        task_context = pipeline.run(event)
        db_event.task_context = task_context.model_dump(mode="json")
        repository.update(obj=db_event)

        workspace_id = workspace_from_event_data(db_event.data if isinstance(db_event.data, dict) else None)

        try:
            if event.event_type == "document_upload":
                _notify_ingested(workspace_id, task_context, db_event)
                _schedule_post_ingestion_jobs(session, task_context, workspace_id=workspace_id)
            elif event.event_type == "document_summary":
                _auto_classify_from_summary(session, task_context, workspace_id=workspace_id)
        except Exception:
            logger.exception("Post-processing hook failed for event %s", event_id)


def _notify_ingested(workspace_id: Optional[str], task_context, db_event: Event) -> None:
    if not workspace_id:
        logger.debug("Skip Core notify: missing workspace_id on upload event %s", db_event.id)
        return
    metadata = task_context.metadata or {}
    document_meta: Dict[str, Any] = metadata.get("document") or {}
    document_id = document_meta.get("id") or str(db_event.id)
    data = db_event.data if isinstance(db_event.data, dict) else {}
    meta = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}
    notify_document_ingested(
        workspace_id=workspace_id,
        document_id=str(document_id),
        doc_type=document_meta.get("doc_type") or data.get("doc_type"),
        filename=(
            document_meta.get("original_filename")
            or document_meta.get("stored_filename")
            or meta.get("uploaded_filename")
        ),
        mission_id=meta.get("mission_id") or data.get("mission_id"),
        core_document_id=meta.get("core_document_id"),
        core_version_id=meta.get("core_version_id"),
    )


def _schedule_post_ingestion_jobs(
    session, task_context, *, workspace_id: Optional[str] = None
) -> None:
    metadata = task_context.metadata or {}
    document_meta: Dict[str, Any] = metadata.get("document") or {}
    document_id = document_meta.get("id")
    if not document_id:
        return

    existing_summary = (
        session.query(Event)
        .filter(
            and_(
                Event.data["event_type"].astext == "document_summary",
                Event.data["document_id"].astext == document_id,
            )
        )
        .first()
    )
    if existing_summary:
        return

    settings = get_settings()
    filename = (
        document_meta.get("original_filename")
        or document_meta.get("stored_filename")
        or document_meta.get("ingest_source")
    )

    payload: Dict[str, Any] = {
        "event_type": "document_summary",
        "document_id": document_id,
        "filename": filename,
        "doc_type": document_meta.get("doc_type"),
        "chunks_limit": settings.summary_chunk_limit,
    }
    if workspace_id:
        payload = attach_workspace(payload, workspace_id=workspace_id)
    summary_event = Event(data=payload)
    session.add(summary_event)
    session.commit()
    celery_app.send_task("process_incoming_event", args=[str(summary_event.id)])
    logger.info("Queued automatic summary event %s for document %s", summary_event.id, document_id)


def _auto_classify_from_summary(
    session, task_context, *, workspace_id: Optional[str] = None
) -> None:
    metadata = task_context.metadata or {}
    summaries: Dict[str, Any] = metadata.get("document_summaries") or {}
    if not summaries:
        return

    ws_uuid = None
    if workspace_id:
        try:
            ws_uuid = uuid_mod.UUID(workspace_id)
        except ValueError:
            ws_uuid = None

    label_service = LabelService(session=session, workspace_id=ws_uuid)
    candidate_labels = label_service.get_candidate_labels()
    if not candidate_labels:
        logger.info("Skipping auto classification; no candidate labels configured.")
        return

    classifier = get_classification_service()

    for document_id, summary_payload in summaries.items():
        if not document_id or not isinstance(summary_payload, dict):
            continue

        exists = (
            session.query(DocumentClassificationHistory)
            .filter(DocumentClassificationHistory.document_id == document_id)
            .first()
        )
        if exists:
            continue

        text_input = _render_summary_for_classification(summary_payload)
        if not text_input:
            continue

        try:
            result = classifier.classify(text=text_input, candidate_labels=candidate_labels)
        except Exception as exc:
            logger.warning("Automatic classification failed for document %s: %s", document_id, exc)
            continue

        record_classification_result(
            session,
            document_id,
            result,
            source="ai",
            classifier_version=getattr(classifier, "version", None),
            metadata_extra={"auto_classified": True},
        )
        logger.info("Stored automatic classification for document %s label=%s", document_id, result.label)

        if workspace_id:
            notify_document_classified(
                workspace_id=workspace_id,
                document_id=str(document_id),
                doc_type=result.label,
                confidence=result.confidence,
            )


def _render_summary_for_classification(summary_payload: Dict[str, Any]) -> Optional[str]:
    segments: List[str] = []

    summary = summary_payload.get("summary")
    if isinstance(summary, str) and summary.strip():
        segments.append(summary.strip())

    bullet_points = summary_payload.get("bullet_points")
    if isinstance(bullet_points, list):
        bullets = [str(item).strip() for item in bullet_points if str(item).strip()]
        if bullets:
            segments.append("Highlights:\n" + "\n".join(f"- {line}" for line in bullets))

    next_steps = summary_payload.get("next_steps")
    if isinstance(next_steps, list):
        steps = [str(item).strip() for item in next_steps if str(item).strip()]
        if steps:
            segments.append("Next steps:\n" + "\n".join(f"- {line}" for line in steps))

    combined = "\n\n".join(segment for segment in segments if segment)
    return combined or None


event_schema_adapter = TypeAdapter(EventSchema)
