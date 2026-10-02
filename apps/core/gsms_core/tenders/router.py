"""HTTP Appels d'offres — list / summary / go-no-go / opportunités (LexSocket MCP)."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from gsms_core.deps import WorkspaceContext, get_db, get_settings_dep, require_roles, require_workspace
from gsms_core.identity.models import MANAGE_ROLES
from gsms_core.missions import service as missions
from gsms_core.settings import Settings
from gsms_core.tenders import service
from gsms_core.tenders.models import GoNoGo, TenderCase
from gsms_core.tenders.opportunities import fetch_opportunities
from gsms_core.tenders.schemas import (
    CriterionOut,
    DecisionIn,
    DecisionOut,
    GoNoGoOut,
    OpportunityOut,
    TenderListItem,
    TenderOpenIn,
    TenderSummaryOut,
)

router = APIRouter(prefix="/api/v1/workspaces/{ws}/tenders", tags=["tenders"])


def _status(case: TenderCase) -> str:
    if case.decision != GoNoGo.PENDING:
        return case.decision.value
    if case.recommendation != GoNoGo.PENDING:
        return f"REC_{case.recommendation.value}"
    return "OPEN"


def _list_item(case: TenderCase) -> TenderListItem:
    return TenderListItem(
        id=case.mission_id,
        case_id=case.id,
        title=case.title,
        buyer=case.buyer,
        status=_status(case),
        submission_deadline=case.submission_deadline,
    )


def _summary(case: TenderCase) -> TenderSummaryOut:
    deadlines: list[dict[str, Any]] = []
    if case.submission_deadline is not None:
        deadlines.append(
            {"id": "submission", "title": "Remise de l'offre", "due_at": case.submission_deadline.isoformat()}
        )
    return TenderSummaryOut(
        id=case.mission_id,
        title=case.title,
        reference=str(case.id),
        buyer=case.buyer,
        status=_status(case),
        submission_deadline=case.submission_deadline,
        next_deadlines=deadlines,
        recommendation=case.recommendation,
        decision=case.decision if case.decision != GoNoGo.PENDING else None,
        score=case.score,
    )


def _go_no_go(case: TenderCase) -> GoNoGoOut:
    criteria: list[CriterionOut] = []
    for row in case.criteria or []:
        if not isinstance(row, dict):
            continue
        code = str(row.get("code") or "critere")
        criteria.append(
            CriterionOut(
                code=code,
                label=str(row.get("label") or code),
                score=float(row.get("score") or 0),
                weight=float(row.get("weight") or 0),
                eliminatory=bool(row.get("eliminatory")),
            )
        )
    decision = None
    if case.decision != GoNoGo.PENDING and case.decided_by and case.decided_at:
        decision = DecisionOut(
            value=case.decision,
            by=case.decided_by,
            at=case.decided_at,
            rationale=case.rationale,
        )
    return GoNoGoOut(
        criteria=criteria,
        score=case.score,
        recommendation=case.recommendation,
        decision=decision,
    )


def _load_case(
    mission_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
) -> TenderCase:
    try:
        return service.get_case_by_mission(db, ctx.workspace_id, mission_id)
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "dossier AO introuvable") from exc


@router.get("", response_model=list[TenderListItem])
def list_tenders(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
) -> list[TenderListItem]:
    return [_list_item(c) for c in service.list_cases(db, ctx.workspace_id)]


@router.post("", response_model=TenderSummaryOut, status_code=status.HTTP_201_CREATED)
def open_tender(
    body: TenderOpenIn,
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
) -> TenderSummaryOut:
    try:
        mission = missions.get_mission(db, ctx.workspace_id, body.mission_id)
    except missions.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "mission introuvable") from exc
    try:
        case = service.open_case(
            db,
            mission,
            title=body.title,
            actor=ctx.actor,
            buyer=body.buyer,
            submission_deadline=body.submission_deadline,
        )
    except service.TenderError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    db.commit()
    return _summary(case)


@router.get("/opportunities", response_model=list[OpportunityOut])
async def list_opportunities(
    request: Request,
    ctx: WorkspaceContext = Depends(require_workspace),
    settings: Settings = Depends(get_settings_dep),
    q: str | None = Query(default=None),
    cpv: str | None = Query(default=None),
    nuts: str | None = Query(default=None),
    min_amount: float | None = Query(default=None),
    max_amount: float | None = Query(default=None),
    deadline_before: str | None = Query(default=None),
) -> list[OpportunityOut]:
    _ = ctx  # membership déjà vérifiée
    transport = getattr(request.app.state, "mcp_transport", None)
    return await fetch_opportunities(
        settings,
        q=q,
        cpv=cpv,
        nuts=nuts,
        min_amount=min_amount,
        max_amount=max_amount,
        deadline_before=deadline_before,
        transport=transport,
        correlation_id=str(ctx.workspace_id),
    )


@router.get("/{mission_id}", response_model=TenderSummaryOut)
def tender_summary(case: TenderCase = Depends(_load_case)) -> TenderSummaryOut:
    return _summary(case)


@router.get("/{mission_id}/go-no-go", response_model=GoNoGoOut)
def get_go_no_go(case: TenderCase = Depends(_load_case)) -> GoNoGoOut:
    return _go_no_go(case)


@router.post("/{mission_id}/go-no-go/decision", response_model=GoNoGoOut)
def post_go_no_go_decision(
    body: DecisionIn,
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
) -> GoNoGoOut:
    try:
        service.decide(db, case, body.decision, decided_by=ctx.actor, rationale=body.rationale)
    except service.TenderError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    db.commit()
    db.refresh(case)
    return _go_no_go(case)
