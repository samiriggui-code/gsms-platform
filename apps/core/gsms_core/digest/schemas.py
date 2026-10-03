"""Schémas du Digest : intelligence métier produite par le Core à partir des ``NormalizedDocument``.

Toute donnée extraite porte au moins un ``SourceRef`` : le Core ne crée jamais une vérité
documentaire impossible à retracer.
"""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from gsms_core.db import utcnow
from gsms_core.documents.parsers.schemas import SourceRef


class DigestDocument(BaseModel):
    document_id: uuid.UUID
    version_id: uuid.UUID | None = None
    filename: str
    business_type: str  # rc, cctp, ccap, bpu, dpgf, … ou « autre »
    classification_confidence: float = Field(ge=0, le=1)
    classification_reason: str
    parser: str
    page_count: int | None = None
    n_blocks: int = 0
    n_tables: int = 0


class Entity(BaseModel):
    kind: str  # qualification, organisme, site…
    value: str
    sources: list[SourceRef]


class Requirement(BaseModel):
    id: str
    type: str  # staffing, …
    key: str  # clé de réconciliation (ex. « SSIAP1 »)
    label: str
    value: str
    quantity: float | None = None
    unit: str | None = None
    source: SourceRef


class Obligation(BaseModel):
    id: str
    text: str
    source: SourceRef


class Deadline(BaseModel):
    id: str
    kind: str  # remise_offres, visite, questions, autre
    label: str
    due_date: date
    due_time: str | None = None
    source: SourceRef


class Deliverable(BaseModel):
    id: str
    label: str
    source: SourceRef


class Risk(BaseModel):
    id: str
    kind: str  # penalite, resiliation, …
    text: str
    source: SourceRef


class ConflictValue(BaseModel):
    value: str
    source: SourceRef


class Conflict(BaseModel):
    code: str  # STAFFING_QUANTITY_MISMATCH, DEADLINE_MISMATCH
    key: str
    message: str
    values: list[ConflictValue]

    @property
    def sources(self) -> list[SourceRef]:
        return [v.source for v in self.values]


class MissingInformation(BaseModel):
    code: str  # MISSING_DOCUMENT, MISSING_DEADLINE
    key: str
    message: str


class NextActionKind(enum.StrEnum):
    RESOLVE_CONFLICT = "resolve_conflict"
    REQUEST_DOCUMENT = "request_document"
    CONFIRM_DEADLINE = "confirm_deadline"
    REVIEW_RISK = "review_risk"


class NextAction(BaseModel):
    kind: NextActionKind
    label: str
    ref: str  # code/clé de l'élément qui la motive


class WorkspaceDigest(BaseModel):
    """Synthèse multi-document d'un workspace Core (dossier complet, pas un résumé par pièce)."""

    workspace_id: uuid.UUID
    engagement_id: uuid.UUID | None = None  # = Mission Core
    engagement_type: str | None = None
    client_id: uuid.UUID | None = None
    site_id: uuid.UUID | None = None
    generated_at: datetime = Field(default_factory=utcnow)
    documents: list[DigestDocument] = Field(default_factory=list)
    entities: list[Entity] = Field(default_factory=list)
    requirements: list[Requirement] = Field(default_factory=list)
    obligations: list[Obligation] = Field(default_factory=list)
    deadlines: list[Deadline] = Field(default_factory=list)
    deliverables: list[Deliverable] = Field(default_factory=list)
    risks: list[Risk] = Field(default_factory=list)
    missing_information: list[MissingInformation] = Field(default_factory=list)
    conflicts: list[Conflict] = Field(default_factory=list)
    next_actions: list[NextAction] = Field(default_factory=list)

    def counts(self) -> dict[str, int]:
        return {
            "documents": len(self.documents),
            "requirements": len(self.requirements),
            "obligations": len(self.obligations),
            "deadlines": len(self.deadlines),
            "deliverables": len(self.deliverables),
            "risks": len(self.risks),
            "conflicts": len(self.conflicts),
            "missing_information": len(self.missing_information),
        }
