"""HTTP Appels d'offres — dossiers AO (workspace dédié), DCE, onglets, statut, go-no-go, veille."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.deps import (
    Principal,
    WorkspaceContext,
    get_current_principal,
    get_db,
    get_settings_dep,
    require_roles,
    require_workspace,
)
from gsms_core.identity.models import CONTRIBUTE_ROLES, MANAGE_ROLES, Workspace
from gsms_core.identity.service import accessible_workspaces, staff_role
from gsms_core.missions import service as missions
from gsms_core.settings import Settings
from gsms_core.tenders import dossier, lifecycle, service, views
from gsms_core.tenders.models import GoNoGo, TenderCase
from gsms_core.tenders.opportunities import fetch_opportunities
from gsms_core.tenders.schemas import (
    CriterionOut,
    DceFileOut,
    DceIngestOut,
    DceSkippedOut,
    DecisionIn,
    DecisionOut,
    DossierStatusOut,
    GoNoGoOut,
    OpportunityOut,
    StatusChangeIn,
    StatusChangeOut,
    StatusTransitionOut,
    TenderCreateIn,
    TenderListItem,
    TenderOpenIn,
    TenderSummaryOut,
)
from gsms_core.vault.folders import CLIENT_ROLES

router = APIRouter(prefix="/api/v1/workspaces/{ws}/tenders", tags=["tenders"])
# Vue transverse : tous les dossiers AO accessibles, création d'un dossier (workspace dédié).
dossiers_router = APIRouter(prefix="/api/v1/tenders", tags=["tenders"])


def _status(case: TenderCase) -> str:
    if case.decision != GoNoGo.PENDING:
        return case.decision.value
    if case.recommendation != GoNoGo.PENDING:
        return f"REC_{case.recommendation.value}"
    return "OPEN"


def _reference(db: Session, case: TenderCase) -> str:
    ws = db.get(Workspace, case.workspace_id)
    return ws.reference if ws and ws.reference else str(case.id)


def _list_item(db: Session, case: TenderCase) -> TenderListItem:
    return TenderListItem(
        id=case.mission_id,
        case_id=case.id,
        title=case.title,
        buyer=case.buyer,
        status=_status(case),
        submission_deadline=case.submission_deadline,
        workspace_id=case.workspace_id,
        reference=_reference(db, case),
        dossier_status=case.status,
    )


def _summary(db: Session, case: TenderCase) -> TenderSummaryOut:
    upcoming = [d for d in views.deadlines(db, case) if d["status"] == "a_venir"]
    return TenderSummaryOut(
        id=case.mission_id,
        title=case.title,
        reference=_reference(db, case),
        buyer=case.buyer,
        status=_status(case),
        submission_deadline=case.submission_deadline,
        next_deadlines=[
            {"id": d["id"], "title": d["title"], "due_at": d["due_at"], "source": d["source"]}
            for d in upcoming[:5]
        ],
        recommendation=case.recommendation,
        decision=case.decision if case.decision != GoNoGo.PENDING else None,
        score=case.score,
        workspace_id=case.workspace_id,
        mission_id=case.mission_id,
        consultation_ref=case.consultation_ref,
        dossier_status=case.status,
        dossier_status_label=lifecycle.STATUS_LABELS[case.status],
    )


def _dossier_status(db: Session, case: TenderCase, ctx: WorkspaceContext) -> DossierStatusOut:
    return DossierStatusOut(
        status=case.status,
        label=lifecycle.STATUS_LABELS[case.status],
        decision=case.decision,
        transitions=[
            StatusTransitionOut(
                to=t.target, label=t.label, comment_required=t.comment_required, requires_go=t.requires_go
            )
            for t in lifecycle.available(case, ctx.role)
        ],
        history=[
            StatusChangeOut(
                from_status=c.from_status,
                to_status=c.to_status,
                actor=views.actor_names(db, {c.actor}).get(c.actor, c.actor),
                comment=c.comment,
                at=c.created_at,
            )
            for c in lifecycle.history(db, case)
        ],
    )


def _team(ctx: WorkspaceContext) -> None:
    if ctx.role in CLIENT_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "réservé à l'équipe GSMS")


@dossiers_router.get("", response_model=list[TenderListItem])
def list_all_dossiers(
    principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)
) -> list[TenderListItem]:
    """Tous les dossiers AO des workspaces accessibles, remise la plus proche en tête."""
    ws_ids = [a.workspace.id for a in accessible_workspaces(db, principal.user.id)]
    if not ws_ids:
        return []
    cases = db.scalars(
        select(TenderCase)
        .where(TenderCase.workspace_id.in_(ws_ids))
        .order_by(TenderCase.submission_deadline.asc().nullslast(), TenderCase.created_at.desc())
    )
    return [_list_item(db, c) for c in cases]


@dossiers_router.post("", response_model=TenderSummaryOut, status_code=status.HTTP_201_CREATED)
def create_dossier(
    body: TenderCreateIn, principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)
) -> TenderSummaryOut:
    """Réservé à l'équipe GSMS : le workspace AO appartient à l'organisation GSMS, jamais à l'acheteur."""
    role = staff_role(db, principal.user.id)
    if role is None or role not in MANAGE_ROLES:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "création réservée à l'équipe GSMS (chargé d'affaires)"
        )
    try:
        case = dossier.create_dossier(
            db,
            title=body.title,
            actor=principal.actor,
            buyer=body.buyer,
            consultation_ref=body.consultation_ref,
            submission_deadline=body.submission_deadline,
        )
    except dossier.DossierError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    db.commit()
    return _summary(db, case)


def _go_no_go(db: Session, case: TenderCase) -> GoNoGoOut:
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
            by=views.actor_names(db, {case.decided_by}).get(case.decided_by, case.decided_by),
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
    return [_list_item(db, c) for c in service.list_cases(db, ctx.workspace_id)]


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
    return _summary(db, case)


@router.get("/current", response_model=TenderSummaryOut)
def current_tender(
    ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
) -> TenderSummaryOut:
    """Le dossier AO de ce workspace (un workspace AO porte un seul dossier)."""
    case = dossier.current_case(db, ctx.workspace_id)
    if case is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "aucun dossier AO dans ce workspace")
    return _summary(db, case)


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
def tender_summary(case: TenderCase = Depends(_load_case), db: Session = Depends(get_db)) -> TenderSummaryOut:
    return _summary(db, case)


@router.post("/{mission_id}/dce", response_model=DceIngestOut, status_code=status.HTTP_201_CREATED)
def upload_dce(
    request: Request,
    background: BackgroundTasks,
    files: list[UploadFile] = File(...),
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> DceIngestOut:
    """Dépôt du DCE (fichiers ou ZIP) dans « Dossier de consultation », puis analyse (Docling + Digest)."""
    _team(ctx)
    try:
        result = dossier.ingest_dce(
            db,
            request.app.state.vault,
            case,
            [(f.filename or "document", f.file) for f in files],
            actor=ctx.actor,
            max_bytes=settings.max_upload_mb * 1024 * 1024,
            parser=request.app.state.document_parser,
        )
    except dossier.DossierError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    db.commit()
    from gsms_core.documents.router import run_parse_and_digest

    for parse_id in result.parse_ids:
        background.add_task(run_parse_and_digest, request.app, parse_id)
    return DceIngestOut(
        files=[
            DceFileOut(
                document_id=f.document_id,
                filename=f.filename,
                path=f.path,
                version_created=f.version_created,
                deduplicated=f.deduplicated,
                analysis_requested=f.parse_id is not None,
            )
            for f in result.files
        ],
        skipped=[DceSkippedOut(name=s.name, reason=s.reason) for s in result.skipped],
    )


@router.get("/{mission_id}/pieces")
def tender_pieces(
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    return views.pieces(db, case, ctx.role)


@router.get("/{mission_id}/documents")
def tender_documents(
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    return views.documents(db, case, ctx.role)


@router.get("/{mission_id}/deadlines")
def tender_deadlines(
    case: TenderCase = Depends(_load_case), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    return views.deadlines(db, case)


@router.get("/{mission_id}/history")
def tender_history(
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    _team(ctx)
    return views.history(db, case)


@router.get("/{mission_id}/status", response_model=DossierStatusOut)
def get_dossier_status(
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
) -> DossierStatusOut:
    return _dossier_status(db, case, ctx)


@router.post("/{mission_id}/status", response_model=DossierStatusOut)
def post_dossier_status(
    body: StatusChangeIn,
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
) -> DossierStatusOut:
    try:
        lifecycle.change_status(db, case, body.to, actor=ctx.actor, role=ctx.role, comment=body.comment)
    except lifecycle.LifecycleForbidden as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from exc
    except lifecycle.LifecycleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    db.commit()
    db.refresh(case)
    return _dossier_status(db, case, ctx)


@router.get("/{mission_id}/go-no-go", response_model=GoNoGoOut)
def get_go_no_go(case: TenderCase = Depends(_load_case), db: Session = Depends(get_db)) -> GoNoGoOut:
    return _go_no_go(db, case)


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
    return _go_no_go(db, case)
