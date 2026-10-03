"""Schémas API Appels d'offres (Annexe B — spine minimale)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from gsms_core.tenders.models import DossierStatus, GoNoGo


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
