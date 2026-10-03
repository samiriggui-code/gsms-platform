"""Administration de la plateforme (super admin et administrateurs de l'équipe GSMS uniquement) :
réglages messagerie et IA, tests d'envoi et de clé, connectivité du Core."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from gsms_core.communications import service as messaging
from gsms_core.communications import templates
from gsms_core.communications.models import MessageStatus
from gsms_core.communications.sender import SmtpSender
from gsms_core.deps import Principal, get_current_principal, get_db
from gsms_core.identity.models import Role
from gsms_core.identity.service import staff_role
from gsms_core.platform import service
from gsms_core.platform.models import PlatformSetting

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])
ADMIN_ROLES = frozenset({Role.OWNER, Role.ADMIN})


def require_platform_admin(
    principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)
) -> Principal:
    if staff_role(db, principal.user.id) not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "réservé aux administrateurs de la plateforme")
    return principal


class CheckOut(BaseModel):
    name: str
    ok: bool
    detail: str
    latency_ms: int | None = None
    skipped: bool = False
    extra: dict = Field(default_factory=dict)


class MailIn(BaseModel):
    enabled: bool = False
    host: str = Field(min_length=1, max_length=200)
    port: int = Field(ge=1, le=65535)
    ssl: bool = True
    starttls: bool = False
    user: str = Field(default="", max_length=320)
    from_: str = Field(alias="from", pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=320)
    from_name: str = Field(default="GSMS Sécurité", max_length=120)
    # Absent = mot de passe inchangé ; chaîne vide = mot de passe effacé.
    password: str | None = Field(default=None, max_length=500)

    model_config = {"populate_by_name": True}


class MailOut(BaseModel):
    enabled: bool
    host: str
    port: int
    ssl: bool
    starttls: bool
    user: str
    from_: str = Field(serialization_alias="from")
    from_name: str
    password_set: bool
    source: str
    updated_by: str | None = None
    updated_at: datetime | None = None


class MailTestIn(BaseModel):
    to: str | None = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=320)


class LlmIn(BaseModel):
    provider: str
    model: str = Field(default="", max_length=120)
    base_url: str = Field(default="", max_length=300)
    api_key: str | None = Field(default=None, max_length=500)


class LlmOut(BaseModel):
    provider: str
    model: str
    base_url: str
    api_key_set: bool
    api_key_hint: str | None
    source: str
    providers: list[str]
    updated_by: str | None = None
    updated_at: datetime | None = None


def _meta(db: Session, key: str) -> dict:
    row = db.get(PlatformSetting, key)
    return {"updated_by": row.updated_by, "updated_at": row.updated_at} if row else {}


def _mail_out(db: Session, request: Request) -> MailOut:
    cfg = service.mail_config(db, request.app.state.settings, request.app.state.vault)
    return MailOut(
        enabled=cfg.mail_enabled,
        host=cfg.smtp_host,
        port=cfg.smtp_port,
        ssl=cfg.smtp_ssl,
        starttls=cfg.smtp_starttls,
        user=cfg.smtp_user,
        from_=cfg.smtp_from,
        from_name=cfg.smtp_from_name,
        password_set=bool(cfg.smtp_password),
        source=cfg.source,
        **_meta(db, service.MAIL_KEY),
    )


@router.get("/settings/mail", response_model=MailOut, response_model_by_alias=True)
def get_mail(request: Request, _: Principal = Depends(require_platform_admin), db: Session = Depends(get_db)):
    return _mail_out(db, request)


@router.put("/settings/mail", response_model=MailOut, response_model_by_alias=True)
def put_mail(
    body: MailIn,
    request: Request,
    admin: Principal = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    data = body.model_dump(by_alias=True, exclude={"password"})
    service.save_mail(db, request.app.state.vault, admin.actor, data, body.password)
    db.commit()
    return _mail_out(db, request)


@router.post("/settings/mail/test", response_model=CheckOut)
def test_mail(
    request: Request,
    body: MailTestIn | None = None,
    admin: Principal = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    """Envoie un vrai e-mail de test (par défaut à l'administrateur connecté), réglages enregistrés."""
    cfg = service.mail_config(db, request.app.state.settings, request.app.state.vault)
    to = str(body.to) if body and body.to else admin.user.email
    msg = messaging.create_message(
        db,
        templates.smtp_test(sent_by=admin.user.email),
        to=to,
        to_name=None,
        actor=admin.actor,
        external=False,
    )
    sender = request.app.state.mail_sender or SmtpSender(cfg)
    messaging.send(db, msg, sender, cfg.mail_enabled, admin.actor)
    db.commit()
    ok = msg.status == MessageStatus.SENT
    return CheckOut(
        name="mail", ok=ok, detail=f"Envoyé à {to} ({msg.reference})" if ok else msg.last_error or "échec"
    )


def _llm_out(db: Session, request: Request) -> LlmOut:
    cfg = service.llm_config(db, request.app.state.vault)
    hint = f"…{cfg.api_key[-4:]}" if len(cfg.api_key) >= 8 else None
    return LlmOut(
        provider=cfg.provider,
        model=cfg.model,
        base_url=cfg.base_url,
        api_key_set=bool(cfg.api_key),
        api_key_hint=hint,
        source=cfg.source,
        providers=list(service.LLM_PROVIDERS),
        **_meta(db, service.LLM_KEY),
    )


@router.get("/settings/llm", response_model=LlmOut)
def get_llm(request: Request, _: Principal = Depends(require_platform_admin), db: Session = Depends(get_db)):
    return _llm_out(db, request)


@router.put("/settings/llm", response_model=LlmOut)
def put_llm(
    body: LlmIn,
    request: Request,
    admin: Principal = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    try:
        service.save_llm(db, request.app.state.vault, admin.actor, body.model_dump(), body.api_key)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    db.commit()
    return _llm_out(db, request)


@router.post("/settings/llm/test", response_model=CheckOut)
def test_llm(request: Request, _: Principal = Depends(require_platform_admin), db: Session = Depends(get_db)):
    check = service.check_llm(service.llm_config(db, request.app.state.vault), request.app.state.llm_http)
    return CheckOut(**check.__dict__)


@router.get("/diagnostics", response_model=list[CheckOut])
def diagnostics(
    request: Request, _: Principal = Depends(require_platform_admin), db: Session = Depends(get_db)
):
    """Connectivité du Core : base, stockage chiffré, journal d'audit, Docling, SMTP, LLM, connecteurs."""
    checks = service.diagnostics(
        db, request.app.state.settings, request.app.state.vault, request.app.state.document_parser
    )
    db.rollback()  # aucun effet de bord
    return [CheckOut(**c.__dict__) for c in checks]
