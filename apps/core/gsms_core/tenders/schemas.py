"""Schémas API Appels d'offres (Annexe B — spine minimale)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from gsms_core.tenders.models import GoNoGo


class TenderOpenIn(BaseModel):
    mission_id: uuid.UUID
    title: str = Field(min_length=1, max_length=300)
    buyer: str | None = Field(default=None, max_length=300)
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
