"""Points d'accès OIDC (publiés par le portail : ``/.well-known``, ``/oidc/*``) et clients."""

from __future__ import annotations

import base64
import binascii
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.deps import Principal, get_current_principal, get_db
from gsms_core.identity import apps as app_catalog
from gsms_core.oidc import service
from gsms_core.oidc.models import OidcClient
from gsms_core.platform.router import require_platform_admin

router = APIRouter(prefix="/api/v1", tags=["oidc"])
_NO_STORE = {"Cache-Control": "no-store", "Pragma": "no-cache"}


def _oauth_error(err: service.OidcError) -> JSONResponse:
    headers = dict(_NO_STORE)
    if err.status == 401:
        headers["WWW-Authenticate"] = f'Bearer error="{err.error}"'
    return JSONResponse(
        {"error": err.error, "error_description": err.description}, status_code=err.status, headers=headers
    )


@router.get("/oidc/discovery")
def discovery(request: Request) -> dict:
    return service.discovery(request.app.state.settings)


@router.get("/oidc/jwks")
def jwks(request: Request, db: Session = Depends(get_db)) -> dict:
    keys = service.jwks(db, request.app.state.vault)
    db.commit()  # la clé est créée au premier appel
    return keys


class AuthorizeIn(BaseModel):
    client_id: str = Field(max_length=64)
    redirect_uri: str = Field(max_length=500)
    response_type: str = Field(default="code", max_length=40)
    scope: str = Field(default="openid", max_length=200)
    state: str | None = Field(default=None, max_length=500)
    nonce: str | None = Field(default=None, max_length=300)
    code_challenge: str | None = Field(default=None, min_length=43, max_length=128)
    code_challenge_method: str | None = Field(default=None, max_length=10)
    prompt: str | None = Field(default=None, max_length=40)


@router.post("/oidc/authorize")
def authorize(
    body: AuthorizeIn, principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)
) -> dict:
    """Appelé par la page ``/oidc/authorize`` du portail, avec la session du membre connecté."""
    try:
        target = service.authorize(
            db, principal.user, service.AuthorizeRequest(**body.model_dump()), principal.actor
        )
    except service.OidcError as err:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, err.description) from err
    db.commit()
    return {"redirect_to": target}


def _basic(request: Request) -> tuple[str | None, str | None]:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("basic "):
        return None, None
    try:
        raw = base64.b64decode(header[6:].strip(), validate=True).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError):
        return None, None
    client_id, _, secret = raw.partition(":")
    return unquote(client_id), unquote(secret)


@router.post("/oidc/token")
def token(
    request: Request,
    db: Session = Depends(get_db),
    grant_type: str | None = Form(default=None),
    code: str | None = Form(default=None),
    redirect_uri: str | None = Form(default=None),
    client_id: str | None = Form(default=None),
    client_secret: str | None = Form(default=None),
    code_verifier: str | None = Form(default=None),
):
    basic_id, basic_secret = _basic(request)
    try:
        tokens = service.exchange_code(
            db,
            request.app.state.settings,
            request.app.state.vault,
            grant_type=grant_type,
            code=code,
            redirect_uri=redirect_uri,
            client_id=basic_id or client_id,
            client_secret=basic_secret or client_secret,
            code_verifier=code_verifier,
        )
    except service.OidcError as err:
        db.commit()  # un code présenté est consommé, même en cas d'erreur
        return _oauth_error(err)
    db.commit()
    return JSONResponse(tokens, headers=_NO_STORE)


@router.api_route("/oidc/userinfo", methods=["GET", "POST"])
def userinfo(request: Request, db: Session = Depends(get_db)):
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        return _oauth_error(service.OidcError("invalid_token", "jeton absent", status=401))
    try:
        info = service.userinfo(db, request.app.state.settings, request.app.state.vault, header[7:].strip())
    except service.OidcError as err:
        return _oauth_error(err)
    return JSONResponse(info, headers=_NO_STORE)


class EndSessionIn(BaseModel):
    post_logout_redirect_uri: str | None = Field(default=None, max_length=500)


@router.post("/oidc/end-session")
def end_session(body: EndSessionIn, request: Request, db: Session = Depends(get_db)) -> dict:
    return {
        "redirect_to": service.end_session_redirect(
            db, request.app.state.settings, body.post_logout_redirect_uri
        )
    }


# --- administration des clients (Paramètres → Applications connectées) ----------------------------------


class ClientIn(BaseModel):
    redirect_uris: list[str] = Field(min_length=1, max_length=10)
    post_logout_redirect_uris: list[str] = Field(default_factory=list, max_length=10)


@router.get("/admin/sso/clients")
def list_clients(
    request: Request, _: Principal = Depends(require_platform_admin), db: Session = Depends(get_db)
) -> dict:
    settings = request.app.state.settings
    clients = {c.app: c for c in db.scalars(select(OidcClient))}
    out = []
    for app in app_catalog.APPS:
        if not app.sso:
            continue
        client = clients.get(app.key)
        out.append(
            {
                "app": app.key,
                "name": app.name,
                "configured": client is not None,
                "client": service.client_view(client) if client else None,
                "suggested_redirect_uris": service.default_redirect_uris(settings, app.key),
            }
        )
    return {"issuer": service.issuer(settings), "clients": out}


@router.put("/admin/sso/clients/{app}")
def save_client(
    app: str,
    body: ClientIn,
    admin: Principal = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> dict:
    try:
        client, secret = service.save_client(
            db, app, body.redirect_uris, admin.actor, body.post_logout_redirect_uris
        )
    except ValueError as err:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(err)) from err
    db.commit()
    return {"client": service.client_view(client), "client_secret": secret}


@router.post("/admin/sso/clients/{app}/secret")
def rotate_secret(
    app: str, admin: Principal = Depends(require_platform_admin), db: Session = Depends(get_db)
) -> dict:
    client = db.get(OidcClient, app)
    if client is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "application non configurée")
    client, secret = service.save_client(
        db, app, client.redirect_uris, admin.actor, client.post_logout_redirect_uris, rotate=True
    )
    db.commit()
    return {"client": service.client_view(client), "client_secret": secret}
