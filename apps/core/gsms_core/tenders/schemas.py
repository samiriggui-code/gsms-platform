"""Schémas API Appels d'offres (Annexe B — spine minimale)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from gsms_core.tenders.models import DossierStatus, GoNoGo, RequirementStatus


class TenderOpenIn(BaseModel):
    mission_id: uuid.UUID
    title: str = Field(min_length=1, max_length=300)
    buyer: str | None = Field(default=None, max_length=300)
    submission_deadline: datetime | None = None


class TenderCreateIn(BaseModel):
    """Nouveau dossier AO : crée son workspace dédié (organisation GSMS) et sa référence WS-AO-AAAA-NNNN."""

    title: str = Field(min_length=1, max_length=300)
    buyer: str | None = Field(default=None, max_length=300)
    consultation_ref: str | None = Field(default=None, max_length=120)
    submission_deadline: datetime | None = None
    estimated_amount: float | None = Field(default=None, ge=0)


class TenderPatch(BaseModel):
    """Informations du dossier modifiables par l'équipe ; seuls les champs envoyés changent."""

    title: str | None = Field(default=None, min_length=1, max_length=300)
    buyer: str | None = Field(default=None, max_length=300)
    consultation_ref: str | None = Field(default=None, max_length=120)
    submission_deadline: datetime | None = None
    estimated_amount: float | None = Field(default=None, ge=0)


class TenderListItem(BaseModel):
    """``id`` = mission_id (lien UI ``/app/tenders/{missionId}``)."""

    id: uuid.UUID
    case_id: uuid.UUID
    title: str
    buyer: str | None = None
    status: str
    amount: float | None = None
    submission_deadline: datetime | None = None
    workspace_id: uuid.UUID | None = None
    reference: str | None = None
    dossier_status: DossierStatus | None = None


class TenderSummaryOut(BaseModel):
    id: uuid.UUID
    title: str
    reference: str | None = None
    buyer: str | None = None
    status: str
    amount: float | None = None
    lots: list[dict[str, Any]] = Field(default_factory=list)
    submission_deadline: datetime | None = None
    next_deadlines: list[dict[str, Any]] = Field(default_factory=list)
    recommendation: GoNoGo | None = None
    decision: GoNoGo | None = None
    score: float | None = None
    workspace_id: uuid.UUID | None = None
    mission_id: uuid.UUID | None = None
    consultation_ref: str | None = None
    dossier_status: DossierStatus | None = None
    dossier_status_label: str | None = None


class CriterionOut(BaseModel):
    code: str
    label: str
    score: float
    weight: float
    max: float = 5.0
    eliminatory: bool = False


class DecisionOut(BaseModel):
    value: GoNoGo
    by: str
    at: datetime
    rationale: str | None = None


class GoNoGoOut(BaseModel):
    criteria: list[CriterionOut]
    score: float | None = None
    recommendation: GoNoGo
    decision: DecisionOut | None = None
    assistant_opinion: str | None = None
    # Matrice de faisabilité : status READY | WARNING | BLOCKED, dimensions justifiées et sourcées.
    feasibility: dict[str, Any] | None = None


class CriterionIn(BaseModel):
    code: str = Field(min_length=1, max_length=60)
    label: str = Field(min_length=1, max_length=200)
    weight: float = Field(ge=0, le=100)
    score: float = Field(ge=0, le=5)
    eliminatory: bool = False


class CriteriaIn(BaseModel):
    criteria: list[CriterionIn] = Field(max_length=30)


class DecisionIn(BaseModel):
    decision: GoNoGo
    rationale: str = Field(min_length=1, max_length=4000)


class OpportunityOut(BaseModel):
    id: str
    title: str
    buyer: str | None = None
    cpv: str | None = None
    nuts: str | None = None
    amount: float | None = None
    deadline: str | None = None


class StatusTransitionOut(BaseModel):
    to: DossierStatus
    label: str
    comment_required: bool
    requires_go: bool


class StatusChangeOut(BaseModel):
    from_status: DossierStatus
    to_status: DossierStatus
    actor: str
    comment: str | None = None
    at: datetime


class DossierStatusOut(BaseModel):
    status: DossierStatus
    label: str
    decision: GoNoGo
    transitions: list[StatusTransitionOut]
    history: list[StatusChangeOut]


class StatusChangeIn(BaseModel):
    to: DossierStatus
    comment: str | None = Field(default=None, max_length=4000)


class DceFileOut(BaseModel):
    document_id: uuid.UUID
    filename: str
    path: str
    version_created: bool
    deduplicated: bool
    analysis_requested: bool


class DceSkippedOut(BaseModel):
    name: str
    reason: str


class DceIngestOut(BaseModel):
    files: list[DceFileOut]
    skipped: list[DceSkippedOut]


class RequirementOut(BaseModel):
    id: uuid.UUID
    code: str
    origin: str
    type: str
    type_label: str
    text: str
    mandatory: bool
    source: dict[str, Any] | None = None
    source_label: str | None = None
    planned_response: str | None = None
    evidence: str | None = None
    target_document: str | None = None
    owner: str | None = None
    status: RequirementStatus
    stale: bool
    updated_by: str | None = None
    updated_at: datetime | None = None


class RequirementPatch(BaseModel):
    """Champs humains de la matrice ; seuls les champs envoyés sont modifiés."""

    status: RequirementStatus | None = None
    owner: str | None = Field(default=None, max_length=200)
    planned_response: str | None = Field(default=None, max_length=8000)
    evidence: str | None = Field(default=None, max_length=4000)
    target_document: str | None = Field(default=None, max_length=20)
    mandatory: bool | None = None
    type: str | None = Field(default=None, max_length=40)
    text: str | None = Field(default=None, min_length=3, max_length=4000)


class RequirementCreate(BaseModel):
    text: str = Field(min_length=3, max_length=4000)
    type: str = Field(default="obligation", max_length=40)
    mandatory: bool = True


class SyncOut(BaseModel):
    added: int
    refreshed: int
    stale: int
    total: int


class ComplianceOut(BaseModel):
    summary: dict[str, Any]
    types: dict[str, str]
    targets: dict[str, str]
    rows: list[RequirementOut]


class EnginePieceOut(BaseModel):
    filename: str
    reason: str


class EngineCapabilityOut(BaseModel):
    key: str
    label: str


class EngineOut(BaseModel):
    """État du moteur AO pour ce dossier (dernier chargement), en termes métier."""

    status: str  # connecte | indisponible | non_configure | jamais
    label: str
    connected: bool
    configured: bool
    reference: str | None = None
    binding_status: str | None = None
    last_call_at: datetime | None = None
    last_success_at: datetime | None = None
    last_error: str | None = None
    documents_sent: int = 0
    documents_rejected: list[EnginePieceOut] = Field(default_factory=list)
    documents_skipped: list[EnginePieceOut] = Field(default_factory=list)
    capabilities: list[EngineCapabilityOut] = Field(default_factory=list)
