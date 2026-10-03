"""Réglages de la plateforme (messagerie, IA) et tests de connectivité du Core.

Les réglages saisis dans le portail priment sur ceux du ``.env`` ; les secrets (mot de passe SMTP, clé API)
sont chiffrés par la clé maître et ne sortent jamais du Core (l'API dit seulement s'ils sont renseignés).
"""

from __future__ import annotations

import smtplib
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session

from gsms_core.audit.service import record, verify_chain
from gsms_core.db import utcnow
from gsms_core.platform.models import PlatformSetting
from gsms_core.settings import Settings
from gsms_core.vault import crypto
from gsms_core.vault.storage import Vault

MAIL_KEY = "mail"
LLM_KEY = "llm"
LLM_PROVIDERS = ("anthropic", "openai", "openai_compatible")
DEFAULT_LLM_MODEL = {"anthropic": "claude-sonnet-5-5", "openai": "gpt-5", "openai_compatible": ""}


@dataclass
class MailConfig:
    """Mêmes noms d'attributs que ``Settings`` : utilisable directement par ``SmtpSender``."""

    mail_enabled: bool
    smtp_host: str
    smtp_port: int
    smtp_ssl: bool
    smtp_starttls: bool
    smtp_user: str
    smtp_password: str
    smtp_from: str
    smtp_from_name: str
    source: str  # « portail » ou « environnement »


@dataclass
class LlmConfig:
    provider: str
    model: str
    base_url: str
    api_key: str
    source: str


@dataclass
class Check:
    name: str
    ok: bool
    detail: str
    latency_ms: int | None = None
    skipped: bool = False
    extra: dict[str, Any] = field(default_factory=dict)


def _get(session: Session, key: str) -> PlatformSetting | None:
    return session.get(PlatformSetting, key)


def _save(
    session: Session, key: str, value: dict, secret: str | None, keep_secret: bool, vault: Vault, actor: str
):
    row = _get(session, key) or PlatformSetting(key=key, value={}, updated_by=actor)
    before = dict(row.value or {})
    row.value = value
    if not keep_secret:
        row.secret = vault.seal(secret, f"platform:{key}") if secret else None
    row.updated_by = actor
    row.updated_at = utcnow()
    session.add(row)
    record(
        session,
        actor=actor,
        action=f"platform.settings.{key}",
        subject_uri=f"core://platform/settings/{key}",
        before=before,
        after={**value, "secret_changed": not keep_secret},
    )
    return row


def _secret(row: PlatformSetting | None, vault: Vault, key: str) -> str:
    if row is None or not row.secret:
        return ""
    try:
        return vault.unseal(row.secret, f"platform:{key}")
    except crypto.IntegrityError:
        return ""


# --- messagerie ----------------------------------------------------------------------------------------


def mail_config(session: Session, settings: Settings, vault: Vault) -> MailConfig:
    row = _get(session, MAIL_KEY)
    if row is None:
        return MailConfig(
            settings.mail_enabled,
            settings.smtp_host,
            settings.smtp_port,
            settings.smtp_ssl,
            settings.smtp_starttls,
            settings.smtp_user,
            settings.smtp_password,
            settings.smtp_from,
            settings.smtp_from_name,
            "environnement",
        )
    v = row.value
    return MailConfig(
        bool(v.get("enabled", False)),
        str(v.get("host", "")),
        int(v.get("port", 465)),
        bool(v.get("ssl", True)),
        bool(v.get("starttls", False)),
        str(v.get("user", "")),
        _secret(row, vault, MAIL_KEY) or settings.smtp_password,
        str(v.get("from", "")),
        str(v.get("from_name", "GSMS Sécurité")),
        "portail",
    )


def save_mail(session: Session, vault: Vault, actor: str, data: dict, password: str | None) -> None:
    value = {k: data[k] for k in ("enabled", "host", "port", "ssl", "starttls", "user", "from", "from_name")}
    _save(session, MAIL_KEY, value, password, password is None, vault, actor)


def check_smtp(cfg: MailConfig) -> Check:
    """Connexion + authentification au serveur SMTP, sans rien envoyer."""
    if not cfg.smtp_host:
        return Check("smtp", False, "serveur SMTP non renseigné", skipped=True)
    start = time.monotonic()
    try:
        smtp_cls = smtplib.SMTP_SSL if cfg.smtp_ssl else smtplib.SMTP
        with smtp_cls(cfg.smtp_host, cfg.smtp_port, timeout=10) as smtp:
            if cfg.smtp_starttls and not cfg.smtp_ssl:
                smtp.starttls()
            if cfg.smtp_user:
                smtp.login(cfg.smtp_user, cfg.smtp_password)
            smtp.noop()
    except Exception as exc:
        return Check(
            "smtp", False, f"{type(exc).__name__}: {exc}"[:300], int((time.monotonic() - start) * 1000)
        )
    state = "envoi activé" if cfg.mail_enabled else "connexion OK mais envoi désactivé"
    detail = f"{cfg.smtp_host}:{cfg.smtp_port} — authentifié ({cfg.smtp_user or 'sans compte'}), {state}"
    return Check("smtp", True, detail, int((time.monotonic() - start) * 1000))


# --- IA (clé API du LLM) --------------------------------------------------------------------------------


def llm_config(session: Session, vault: Vault) -> LlmConfig:
    row = _get(session, LLM_KEY)
    if row is None:
        return LlmConfig("anthropic", DEFAULT_LLM_MODEL["anthropic"], "", "", "aucune")
    v = row.value
    return LlmConfig(
        str(v.get("provider", "anthropic")),
        str(v.get("model", "")),
        str(v.get("base_url", "")),
        _secret(row, vault, LLM_KEY),
        "portail",
    )


def save_llm(session: Session, vault: Vault, actor: str, data: dict, api_key: str | None) -> None:
    if data["provider"] not in LLM_PROVIDERS:
        raise ValueError("fournisseur inconnu")
    if data["provider"] == "openai_compatible" and not data.get("base_url"):
        raise ValueError("URL de l'API obligatoire pour un fournisseur compatible OpenAI")
    value = {k: data.get(k) or "" for k in ("provider", "model", "base_url")}
    _save(session, LLM_KEY, value, api_key, api_key is None, vault, actor)


def check_llm(cfg: LlmConfig, client: httpx.Client | None = None) -> Check:
    """Vérifie la clé en listant les modèles disponibles (aucun jeton consommé)."""
    if not cfg.api_key:
        return Check("llm", False, "aucune clé API renseignée", skipped=True)
    if cfg.provider == "anthropic":
        url = f"{(cfg.base_url or 'https://api.anthropic.com').rstrip('/')}/v1/models"
        headers = {"x-api-key": cfg.api_key, "anthropic-version": "2023-06-01"}
    else:
        base = cfg.base_url or "https://api.openai.com/v1"
        url = f"{base.rstrip('/')}/models"
        headers = {"Authorization": f"Bearer {cfg.api_key}"}
    start = time.monotonic()
    try:
        http = client or httpx.Client(timeout=10)
        try:
            r = http.get(url, headers=headers)
        finally:
            if client is None:
                http.close()
    except httpx.HTTPError as exc:
        return Check(
            "llm",
            False,
            f"{cfg.provider} injoignable : {type(exc).__name__}",
            int((time.monotonic() - start) * 1000),
        )
    latency = int((time.monotonic() - start) * 1000)
    if r.status_code in (401, 403):
        return Check("llm", False, f"clé refusée par {cfg.provider} (HTTP {r.status_code})", latency)
    if r.status_code >= 400:
        return Check("llm", False, f"{cfg.provider} : HTTP {r.status_code}", latency)
    try:
        ids = [m.get("id") for m in r.json().get("data", []) if isinstance(m, dict)]
    except ValueError:
        ids = []
    found = not cfg.model or cfg.model in ids
    detail = f"clé valide ({len(ids)} modèles)" + (
        "" if found else f" — modèle « {cfg.model} » absent de la liste"
    )
    return Check("llm", found, detail, latency, extra={"models": ids[:50]})


# --- connectivité du Core --------------------------------------------------------------------------------


def _timed(name: str, fn) -> Check:
    start = time.monotonic()
    try:
        ok, detail = fn()
    except Exception as exc:
        ok, detail = False, f"{type(exc).__name__}: {exc}"[:300]
    return Check(name, ok, detail, int((time.monotonic() - start) * 1000))


def diagnostics(session: Session, settings: Settings, vault: Vault, parser) -> list[Check]:
    checks: list[Check] = []

    def database():
        session.execute(text("SELECT 1"))
        return True, session.get_bind().dialect.name

    def storage():
        """Écrit, relit, vérifie et efface un objet chiffré de test dans le stockage du coffre-fort."""
        import io
        import tempfile
        from pathlib import Path

        key = crypto.generate_key()
        payload = b"gsms-diagnostic-" + uuid.uuid4().bytes
        name = f"diagnostics/{uuid.uuid4()}.enc"
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            crypto.encrypt_stream(key, 1, io.BytesIO(payload), tmp)
        try:
            vault.storage.put_file(name, Path(tmp.name), "application/octet-stream")
            with vault.storage.open(name) as src:
                header, _ = crypto.read_header(src)
                back = b"".join(crypto.decrypt_stream(key, header, src))
        finally:
            Path(tmp.name).unlink(missing_ok=True)
            vault.storage.delete(name)
        master = "clé maître de développement" if not settings.storage_master_key else "clé maître configurée"
        return back == payload, f"écriture / lecture chiffrées OK ({vault.storage.bucket}, {master})"

    def audit():
        result = verify_chain(session)
        return result.ok, f"{result.checked} entrées vérifiées" + (
            "" if result.ok else f", rupture à {result.broken_at}"
        )

    def docling():
        name = getattr(parser, "name", "?")
        version = getattr(parser, "version", None)
        if name == "docling" and version is None:
            try:
                import docling  # noqa: F401
            except ImportError:
                return False, "Docling non installé dans ce Core"
        return True, f"{name} {version or ''}".strip()

    checks.append(_timed("database", database))
    checks.append(_timed("storage", storage))
    checks.append(_timed("audit", audit))
    checks.append(_timed("docling", docling))
    checks.append(check_smtp(mail_config(session, settings, vault)))
    checks.append(check_llm(llm_config(session, vault)))
    for name, url in (
        ("crm", settings.crm_url),
        ("grace", settings.grace_url),
        ("qatrial", settings.qatrial_url),
    ):
        if not url or "localhost" in url:
            checks.append(Check(name, False, "connecteur non configuré", skipped=True))
            continue
        start = time.monotonic()
        try:
            r = httpx.get(url, timeout=5, follow_redirects=False)
            checks.append(
                Check(
                    name, r.status_code < 500, f"HTTP {r.status_code}", int((time.monotonic() - start) * 1000)
                )
            )
        except httpx.HTTPError as exc:
            checks.append(
                Check(
                    name, False, f"injoignable : {type(exc).__name__}", int((time.monotonic() - start) * 1000)
                )
            )
    return checks
