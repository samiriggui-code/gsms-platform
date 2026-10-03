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

from gsms_core.db import utcnow
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
from gsms_core.tenders import dossier, engine, feasibility, lifecycle, service, views
from gsms_core.tenders import profile as company
from gsms_core.tenders import requirements as matrix
from gsms_core.tenders.models import GoNoGo, TenderCase, TenderRequirement
from gsms_core.tenders.opportunities import fetch_opportunities
from gsms_core.tenders.schemas import (
    ComplianceOut,
    CriteriaIn,
    CriterionOut,
    DceFileOut,
    DceIngestOut,
    DceSkippedOut,
    DecisionIn,
    DecisionOut,
    DossierStatusOut,
    EngineOut,
    GoNoGoOut,
    OpportunityOut,
    RequirementCreate,
    RequirementOut,
    RequirementPatch,
    StatusChangeIn,
    StatusChangeOut,
    StatusTransitionOut,
    SyncOut,
    TenderCreateIn,
    TenderListItem,
    TenderOpenIn,
    TenderPatch,
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
        amount=case.estimated_amount,
    )


def _summary(db: Session, case: TenderCase) -> TenderSummaryOut:
    upcoming = [d for d in views.deadlines(db, case) if d["status"] == "a_venir"]
    return TenderSummaryOut(
        id=case.mission_id,
        title=case.title,
        reference=_reference(db, case),
        buyer=case.buyer,
        status=_status(case),
        amount=case.estimated_amount,
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
            estimated_amount=body.estimated_amount,
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


@router.get("/{mission_id}/engine", response_model=EngineOut)
def get_engine(
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> EngineOut:
    """État du moteur AO (dernier chargement) ; aucun appel réseau."""
    _team(ctx)
    return EngineOut(**engine.engine_state(db, case, settings))


@router.post("/{mission_id}/engine", response_model=EngineOut)
async def post_engine(
    request: Request,
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> EngineOut:
    """Transmet le dossier et ses pièces au moteur AO. Une panne du moteur renvoie 200 « indisponible »."""
    _team(ctx)
    state = await engine.load_case(
        db,
        request.app.state.vault,
        settings,
        case,
        actor=ctx.actor,
        transport=getattr(request.app.state, "mcp_transport", None),
    )
    db.commit()
    return EngineOut(**state)


@router.get("/{mission_id}/go-no-go", response_model=GoNoGoOut)
def get_go_no_go(case: TenderCase = Depends(_load_case), db: Session = Depends(get_db)) -> GoNoGoOut:
    out = _go_no_go(db, case)
    out.feasibility = _feasibility(db, case)
    return out


@router.post("/{mission_id}/go-no-go/decision", response_model=GoNoGoOut)
def post_go_no_go_decision(
    body: DecisionIn,
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
) -> GoNoGoOut:
    try:
        assessed = _feasibility(db, case)
        snapshot = {
            "status": assessed["status"],
            "dimensions": {d["key"]: d["status"] for d in assessed["dimensions"]},
        }
        service.decide(
            db, case, body.decision, decided_by=ctx.actor, rationale=body.rationale, feasibility=snapshot
        )
    except service.TenderError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    db.commit()
    db.refresh(case)
    out = _go_no_go(db, case)
    out.feasibility = _feasibility(db, case)
    return out


def _requirement_out(row: TenderRequirement) -> RequirementOut:
    return RequirementOut(
        id=row.id,
        code=row.code,
        origin=row.origin,
        type=row.type,
        type_label=matrix.TYPE_LABELS.get(row.type, row.type),
        text=row.text,
        mandatory=row.mandatory,
        source=row.source,
        source_label=row.source_label,
        planned_response=row.planned_response,
        evidence=row.evidence,
        target_document=row.target_document,
        owner=row.owner,
        status=row.status,
        stale=row.stale,
        updated_by=row.updated_by,
        updated_at=row.updated_at,
    )


def _rows_out(db: Session, rows: list[TenderRequirement]) -> list[RequirementOut]:
    names = views.actor_names(db, {r.updated_by for r in rows if r.updated_by})
    out = []
    for row in rows:
        item = _requirement_out(row)
        if row.updated_by:
            item.updated_by = names.get(row.updated_by, row.updated_by)
        out.append(item)
    return out


@router.get("/{mission_id}/analysis")
def tender_analysis(case: TenderCase = Depends(_load_case), db: Session = Depends(get_db)) -> dict[str, Any]:
    return views.analysis(db, case)


@router.get("/{mission_id}/risks")
def tender_risks(
    case: TenderCase = Depends(_load_case), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    return views.risks(db, case)


@router.get("/{mission_id}/requirements", response_model=list[RequirementOut])
def list_requirements(
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
) -> list[RequirementOut]:
    _team(ctx)
    return _rows_out(db, matrix.list_requirements(db, case))


@router.post("/{mission_id}/requirements", response_model=RequirementOut, status_code=status.HTTP_201_CREATED)
def create_requirement(
    body: RequirementCreate,
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
) -> RequirementOut:
    _team(ctx)
    try:
        row = matrix.add_manual(
            db, case, text=body.text, type_=body.type, mandatory=body.mandatory, actor=ctx.actor
        )
    except matrix.RequirementError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    db.commit()
    return _rows_out(db, [row])[0]


@router.post("/{mission_id}/requirements/sync", response_model=SyncOut)
def sync_requirements(
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
) -> SyncOut:
    """Relit le dernier Digest : nouvelles exigences ajoutées, disparues marquées, réponses conservées."""
    _team(ctx)
    report = matrix.sync_from_digest(db, case, ctx.actor)
    db.commit()
    return SyncOut(added=report.added, refreshed=report.refreshed, stale=report.stale, total=report.total)


@router.patch("/{mission_id}/requirements/{requirement_id}", response_model=RequirementOut)
def patch_requirement(
    requirement_id: uuid.UUID,
    body: RequirementPatch,
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
) -> RequirementOut:
    _team(ctx)
    changes = body.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "statut obligatoire")
    try:
        row = matrix.update_requirement(db, case, requirement_id, changes, ctx.actor)
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "exigence introuvable") from exc
    except matrix.RequirementError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    db.commit()
    return _rows_out(db, [row])[0]


@router.get("/{mission_id}/compliance", response_model=ComplianceOut)
def compliance_matrix(
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
) -> ComplianceOut:
    _team(ctx)
    rows = matrix.list_requirements(db, case)
    return ComplianceOut(
        summary=matrix.coverage(rows),
        types=matrix.TYPE_LABELS,
        targets=matrix.TARGET_LABELS,
        rows=_rows_out(db, rows),
    )


def _feasibility(db: Session, case: TenderCase) -> dict[str, Any]:
    profile, _meta = company.load_profile(db)
    return feasibility.assess(
        case,
        views.digest_of(db, case.workspace_id),
        matrix.list_requirements(db, case),
        profile,
        utcnow().date(),
    )


@router.put("/{mission_id}/go-no-go/criteria", response_model=GoNoGoOut)
def put_go_no_go_criteria(
    body: CriteriaIn,
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
) -> GoNoGoOut:
    """Grille de notation complémentaire (adéquation, rentabilité…) ; le score est calculé par le Core."""
    _team(ctx)
    if case.decision != GoNoGo.PENDING:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "décision déjà prise : grille figée")
    service.set_grid(db, case, [c.model_dump() for c in body.criteria], ctx.actor)
    db.commit()
    out = _go_no_go(db, case)
    out.feasibility = _feasibility(db, case)
    return out


@router.patch("/{mission_id}", response_model=TenderSummaryOut)
def patch_tender(
    body: TenderPatch,
    case: TenderCase = Depends(_load_case),
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
) -> TenderSummaryOut:
    _team(ctx)
    try:
        service.update_case(db, case, body.model_dump(exclude_unset=True), ctx.actor)
    except service.TenderError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    db.commit()
    return _summary(db, case)


@dossiers_router.get("/profile")
def get_profile(
    principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)
) -> dict[str, Any]:
    """Profil GSMS pour les AO (équipe GSMS uniquement)."""
    if staff_role(db, principal.user.id) is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "réservé à l'équipe GSMS")
    profile, meta = company.load_profile(db)
    return {
        "profile": profile.model_dump(mode="json"),
        "qualifications": company.QUALIFICATION_LABELS,
        "missing": profile.missing_fields(),
        **meta,
    }


@dossiers_router.put("/profile")
def put_profile(
    body: company.CompanyProfile,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    role = staff_role(db, principal.user.id)
    if role is None or role not in MANAGE_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "modification réservée à l'équipe GSMS (gestion)")
    company.save_profile(db, body, principal.actor)
    db.commit()
    return get_profile(principal, db)
