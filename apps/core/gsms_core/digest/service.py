"""Construction et lecture du ``WorkspaceDigest`` d'un workspace Core canonique.

Événements (EventBus existant) : ``digest.build.started``, ``digest.updated``, ``digest.failed``,
``digest.conflict.detected``, ``digest.missing_information.detected``. Aucune destination sortante
n'est routée pour l'instant : le contrat est prêt pour l'orchestration (Tender, GRACE, QAtrial, Eve).
"""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.digest.engine import DigestEngine
from gsms_core.digest.models import DigestStatus, WorkspaceDigestRecord
from gsms_core.digest.schemas import WorkspaceDigest
from gsms_core.documents.parsing import parsed_documents
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.identity.models import Workspace
from gsms_core.missions.models import Mission

log = logging.getLogger(__name__)


class DigestBuildError(RuntimeError):
    pass


def digest_uri(workspace_id: uuid.UUID) -> str:
    return f"digest://{workspace_id}"


def _engagement(session: Session, ws: Workspace, mission_id: uuid.UUID | None) -> Mission | None:
    """Même règle que le ContextResolver : mission explicite, sinon d'origine, sinon la plus récente."""
    if mission_id is not None:
        mission = session.get(Mission, mission_id)
        if mission is None or mission.workspace_id != ws.id:
            raise LookupError("mission")
        return mission
    if ws.created_from_mission_id:
        mission = session.get(Mission, ws.created_from_mission_id)
        if mission is not None:
            return mission
    return session.scalar(
        select(Mission).where(Mission.workspace_id == ws.id).order_by(Mission.opened_at.desc()).limit(1)
    )


def rebuild_digest(
    session: Session,
    workspace_id: uuid.UUID,
    *,
    actor: str,
    trigger: str,
    mission_id: uuid.UUID | None = None,
    engine: DigestEngine | None = None,
) -> WorkspaceDigestRecord:
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise LookupError("workspace")
    mission = _engagement(session, ws, mission_id)
    base = {
        "source": "core",
        "subject": digest_uri(workspace_id),
        "workspace_id": workspace_id,
        "mission_id": mission.id if mission else None,
        "actor": actor,
    }
    started, _ = publish(
        session, EventEnvelope(type="digest.build.started", data={"trigger": trigger}, **base)
    )
    try:
        documents = parsed_documents(session, workspace_id, mission_id)
        digest = (engine or DigestEngine()).build(
            workspace_id,
            documents,
            engagement_id=mission.id if mission else None,
            engagement_type=mission.type if mission else None,
            client_id=ws.organization_id,
            site_id=ws.site_id,
        )
    except Exception as exc:
        log.exception("échec du Digest pour %s", workspace_id)
        record = WorkspaceDigestRecord(
            workspace_id=workspace_id,
            mission_id=mission.id if mission else None,
            status=DigestStatus.FAILED,
            trigger=trigger,
            error_message=str(exc)[:1000],
        )
        session.add(record)
        publish(
            session,
            EventEnvelope(
                type="digest.failed", data={"error": str(exc)[:500]}, causation_id=started.id, **base
            ),
        )
        session.commit()
        raise DigestBuildError(str(exc)) from exc

    counts = digest.counts()
    record = WorkspaceDigestRecord(
        workspace_id=workspace_id,
        mission_id=mission.id if mission else None,
        status=DigestStatus.BUILT,
        built_at=digest.generated_at,
        trigger=trigger,
        document_count=counts["documents"],
        conflict_count=counts["conflicts"],
        missing_count=counts["missing_information"],
        counts=counts,
        payload=digest.model_dump(mode="json"),
    )
    session.add(record)
    session.flush()
    data = {"digest_id": str(record.id), "counts": counts, "trigger": trigger}
    publish(session, EventEnvelope(type="digest.updated", data=data, causation_id=started.id, **base))
    if digest.conflicts:
        publish(
            session,
            EventEnvelope(
                type="digest.conflict.detected",
                data={
                    "digest_id": str(record.id),
                    "conflicts": [
                        {"code": c.code, "key": c.key, "message": c.message} for c in digest.conflicts
                    ],
                },
                causation_id=started.id,
                **base,
            ),
        )
    if digest.missing_information:
        publish(
            session,
            EventEnvelope(
                type="digest.missing_information.detected",
                data={
                    "digest_id": str(record.id),
                    "missing": [
                        {"code": m.code, "key": m.key, "message": m.message}
                        for m in digest.missing_information
                    ],
                },
                causation_id=started.id,
                **base,
            ),
        )
    session.commit()
    return record


def latest_digest(session: Session, workspace_id: uuid.UUID) -> WorkspaceDigestRecord | None:
    return session.scalar(
        select(WorkspaceDigestRecord)
        .where(
            WorkspaceDigestRecord.workspace_id == workspace_id,
            WorkspaceDigestRecord.status == DigestStatus.BUILT,
        )
        .order_by(WorkspaceDigestRecord.built_at.desc(), WorkspaceDigestRecord.created_at.desc())
        .limit(1)
    )


def load_digest(record: WorkspaceDigestRecord) -> WorkspaceDigest:
    return WorkspaceDigest.model_validate(record.payload)
