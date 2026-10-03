"""Routes contexte métier : résolution, création d'engagement, bindings apps."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from gsms_core.context.applications import APPLICATION_REGISTRY
from gsms_core.context.catalog import SERVICE_CATALOG
from gsms_core.context.models import Contact
from gsms_core.context.resolver import ContextResolver, bind_client_to_app, bind_contact_to_app
from gsms_core.context.schemas import (
    ApplicationBindingOut,
    ApplicationSpecOut,
    AttachApplicationIn,
    BindClientIn,
    BindContactIn,
    ContactIn,
    ContactOut,
    CreateEngagementIn,
    EngagementTypeOut,
    EngagementWorkspaceOut,
)
from gsms_core.context.workspace_manager import WorkspaceManager, WorkspaceManagerError
from gsms_core.deps import Principal, get_current_principal, get_db, require_workspace
from gsms_core.identity.models import CLIENT_ADMIN_ROLES, MANAGE_ROLES

router = APIRouter(prefix="/api/v1", tags=["context"])


@router.get("/context/applications", response_model=list[ApplicationSpecOut])
def list_applications(_: Principal = Depends(get_current_principal)) -> list[ApplicationSpecOut]:
    return [
        ApplicationSpecOut(
            id=spec.id.value,
            label=spec.label,
            role=spec.role,
            kind=spec.kind.value,
            capabilities=list(spec.capabilities),
        )
        for spec in APPLICATION_REGISTRY.values()
    ]


@router.get("/context/engagement-types", response_model=list[EngagementTypeOut])
def list_engagement_types(_: Principal = Depends(get_current_principal)) -> list[EngagementTypeOut]:
    return [
        EngagementTypeOut(
            id=spec.id,
            label=spec.label,
            mission_type=spec.mission_type.value,
            applications=[a.value for a in spec.applications],
            workflow_steps=list(spec.workflow_steps),
        )
        for spec in SERVICE_CATALOG.values()
    ]


@router.post("/engagements", response_model=EngagementWorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_engagement(
    body: CreateEngagementIn,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> EngagementWorkspaceOut:
    """Crée engagement + workspace déterministe + attache les apps du catalogue."""
    try:
        created = WorkspaceManager(db).create_workspace_for_engagement(
            client_id=body.client_id,
            site_id=body.site_id,
            engagement_type=body.engagement_type,
            title=body.title,
            actor=principal.actor,
            owner_id=principal.user.id,
            origin=body.origin,
            attach_catalog_apps=body.attach_catalog_apps,
            description=body.description,
        )
        db.commit()
    except KeyError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except WorkspaceManagerError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return EngagementWorkspaceOut(
        client_id=created.client_id,
        site_id=created.site_id,
        engagement_id=created.engagement_id,
        workspace_id=created.workspace_id,
        engagement_type=created.engagement_type,
        applications=list(created.applications),
    )


@router.get("/context/by-workspace/{workspace_id}")
def resolve_workspace(
    workspace_id: uuid.UUID,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    _ = principal
    try:
        return ContextResolver(db).resolve_from_workspace(workspace_id).to_dict()
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.get("/context/by-engagement/{engagement_id}")
def resolve_engagement(
    engagement_id: uuid.UUID,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    _ = principal
    try:
        return ContextResolver(db).resolve_from_engagement(engagement_id).to_dict()
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.get("/context/by-site/{site_id}")
def resolve_site(
    site_id: uuid.UUID,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    _ = principal
    try:
        return ContextResolver(db).resolve_from_site(site_id).to_dict()
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.get("/context/by-client/{client_id}")
def resolve_client(
    client_id: uuid.UUID,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    _ = principal
    try:
        return ContextResolver(db).resolve_from_client(client_id).to_dict()
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.get("/workspaces/{ws}/context")
def workspace_context(
    ctx=Depends(require_workspace),
    db: Session = Depends(get_db),
) -> dict:
    try:
        return ContextResolver(db).resolve_from_workspace(ctx.workspace_id).to_dict()
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.post(
    "/workspaces/{ws}/applications",
    response_model=ApplicationBindingOut,
    status_code=status.HTTP_201_CREATED,
)
def attach_application(
    body: AttachApplicationIn,
    ctx=Depends(require_workspace),
    db: Session = Depends(get_db),
) -> ApplicationBindingOut:
    if ctx.role not in (MANAGE_ROLES | CLIENT_ADMIN_ROLES):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "rôle insuffisant")
    try:
        binding = WorkspaceManager(db).attach_application(
            workspace_id=ctx.workspace_id,
            application_id=body.application_id,
            external_workspace_id=body.external_workspace_id,
            mission_id=body.mission_id,
            metadata=body.metadata,
        )
        db.commit()
    except (KeyError, ValueError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return ApplicationBindingOut(
        id=binding.id,
        gsms_workspace_id=binding.gsms_workspace_id,
        application_id=binding.application_id,
        external_workspace_id=binding.external_workspace_id,
        status=binding.status.value,
        mission_id=binding.mission_id,
    )


@router.get("/workspaces/{ws}/applications", response_model=list[ApplicationBindingOut])
def list_workspace_applications(
    ctx=Depends(require_workspace),
    db: Session = Depends(get_db),
) -> list[ApplicationBindingOut]:
    return [
        ApplicationBindingOut(
            id=b.id,
            gsms_workspace_id=b.gsms_workspace_id,
            application_id=b.application_id,
            external_workspace_id=b.external_workspace_id,
            status=b.status.value,
            mission_id=b.mission_id,
        )
        for b in WorkspaceManager(db).list_bindings(ctx.workspace_id)
    ]


@router.post("/contacts", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def create_contact(
    body: ContactIn,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> ContactOut:
    _ = principal
    contact = Contact(
        organization_id=body.organization_id,
        email=body.email,
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        title=body.title,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return ContactOut(
        id=contact.id,
        organization_id=contact.organization_id,
        email=contact.email,
        first_name=contact.first_name,
        last_name=contact.last_name,
        phone=contact.phone,
        title=contact.title,
    )


@router.post("/clients/{client_id}/bindings")
def bind_client(
    client_id: uuid.UUID,
    body: BindClientIn,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    _ = principal
    row = bind_client_to_app(
        db,
        client_id=client_id,
        application_id=body.application_id,
        external_client_id=body.external_client_id,
    )
    db.commit()
    return {
        "client_id": str(row.client_id),
        "application_id": row.application_id,
        "external_client_id": row.external_client_id,
        "status": row.status.value,
    }


@router.post("/contacts/{contact_id}/bindings")
def bind_contact(
    contact_id: uuid.UUID,
    body: BindContactIn,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    _ = principal
    if db.get(Contact, contact_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contact")
    row = bind_contact_to_app(
        db,
        contact_id=contact_id,
        application_id=body.application_id,
        external_contact_id=body.external_contact_id,
    )
    db.commit()
    return {
        "contact_id": str(row.contact_id),
        "application_id": row.application_id,
        "external_contact_id": row.external_contact_id,
        "status": row.status.value,
    }
