"""DigestEngine : dossier complet d'un workspace (N ``NormalizedDocument``) → ``WorkspaceDigest``.

Le code calcule (règles déterministes, provenance obligatoire) ; aucune décision n'est déléguée à un
LLM ici. Garde-fou : tous les documents doivent appartenir au workspace demandé — le Digest ne
mélange jamais deux workspaces.
"""

from __future__ import annotations

import uuid
from collections import defaultdict

from gsms_core.digest.classifier import classify
from gsms_core.digest.completeness import detect_missing
from gsms_core.digest.conflicts import detect_conflicts
from gsms_core.digest.deadlines import extract_deadlines
from gsms_core.digest.deliverables import extract_deliverables
from gsms_core.digest.obligations import extract_obligations
from gsms_core.digest.requirements import QUALIFICATIONS, extract_requirements
from gsms_core.digest.risks import extract_risks
from gsms_core.digest.schemas import (
    DigestDocument,
    Entity,
    NextAction,
    NextActionKind,
    WorkspaceDigest,
)
from gsms_core.documents.parsers.schemas import NormalizedDocument, SourceRef
from gsms_core.missions.models import MissionType


class WorkspaceMismatch(ValueError):
    """Un document d'un autre workspace a été fourni au Digest."""


class DigestEngine:
    def build(
        self,
        workspace_id: uuid.UUID,
        documents: list[NormalizedDocument],
        *,
        engagement_id: uuid.UUID | None = None,
        engagement_type: MissionType | None = None,
        client_id: uuid.UUID | None = None,
        site_id: uuid.UUID | None = None,
    ) -> WorkspaceDigest:
        foreign = [d.filename for d in documents if d.workspace_id != workspace_id]
        if foreign:
            raise WorkspaceMismatch(f"documents hors workspace {workspace_id} : {', '.join(foreign)}")

        docs = sorted(documents, key=lambda d: (d.filename, str(d.document_id)))
        digest = WorkspaceDigest(
            workspace_id=workspace_id,
            engagement_id=engagement_id,
            engagement_type=engagement_type.value if engagement_type else None,
            client_id=client_id,
            site_id=site_id,
        )
        for doc in docs:
            c = classify(doc)
            digest.documents.append(
                DigestDocument(
                    document_id=doc.document_id,
                    version_id=doc.version_id,
                    filename=doc.filename,
                    business_type=c.business_type,
                    classification_confidence=c.confidence,
                    classification_reason=c.reason,
                    parser=doc.parser,
                    page_count=doc.page_count,
                    n_blocks=len(doc.blocks),
                    n_tables=len(doc.tables),
                )
            )
            digest.requirements.extend(extract_requirements(doc))
            digest.obligations.extend(extract_obligations(doc))
            digest.deadlines.extend(extract_deadlines(doc))
            digest.deliverables.extend(extract_deliverables(doc))
            digest.risks.extend(extract_risks(doc))

        digest.entities = self._entities(digest)
        digest.conflicts = detect_conflicts(digest.requirements, digest.deadlines)
        digest.missing_information = detect_missing(digest.documents, digest.deadlines, engagement_type)
        digest.next_actions = self._next_actions(digest)
        return digest

    @staticmethod
    def _entities(digest: WorkspaceDigest) -> list[Entity]:
        by_key: dict[str, list[SourceRef]] = defaultdict(list)
        for req in digest.requirements:
            by_key[req.key].append(req.source)
        return [
            Entity(kind="qualification", value=QUALIFICATIONS[key][0], sources=sources)
            for key, sources in sorted(by_key.items())
        ]

    @staticmethod
    def _next_actions(digest: WorkspaceDigest) -> list[NextAction]:
        actions = [
            NextAction(kind=NextActionKind.RESOLVE_CONFLICT, label=c.message, ref=f"{c.code}:{c.key}")
            for c in digest.conflicts
        ]
        for m in digest.missing_information:
            kind = (
                NextActionKind.REQUEST_DOCUMENT
                if m.code == "MISSING_DOCUMENT"
                else NextActionKind.CONFIRM_DEADLINE
            )
            actions.append(NextAction(kind=kind, label=m.message, ref=f"{m.code}:{m.key}"))
        if any(r.kind == "eliminatoire" for r in digest.risks):
            actions.append(
                NextAction(
                    kind=NextActionKind.REVIEW_RISK,
                    label="Vérifier les critères éliminatoires relevés dans les pièces.",
                    ref="RISK:eliminatoire",
                )
            )
        return actions
