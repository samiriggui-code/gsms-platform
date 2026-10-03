"""Fournisseur OpenID Connect du Core (flux *authorization code*, PKCE S256, jetons RS256).

La page d'autorisation est celle du portail (``/oidc/authorize``) : le membre s'y connecte une fois, le
portail transmet la demande au Core avec sa session (``authorize``), puis renvoie le navigateur vers
l'application avec un code. L'application échange ce code contre les jetons (``exchange_code``).

La clé de signature RSA est générée au premier usage et gardée chiffrée par la clé maître du coffre-fort
(``platform_setting`` ``oidc_signing_key``). Référence : docs/architecture/IDENTITE-SSO.md.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from urllib.parse import urlencode, urlsplit

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.db import utcnow
from gsms_core.identity import apps as app_catalog
from gsms_core.identity.models import User
from gsms_core.identity.service import staff_role
from gsms_core.oidc.models import OidcClient, OidcCode
from gsms_core.platform.models import PlatformSetting
from gsms_core.settings import Settings
from gsms_core.vault.storage import Vault

KEY_SETTING = "oidc_signing_key"
CODE_TTL = timedelta(seconds=60)
TOKEN_TTL = timedelta(hours=1)
SCOPES = ("openid", "profile", "email")


class OidcError(Exception):
    """Erreur OAuth 2.0. ``redirect`` : renvoyable à l'application (sinon, affichée par le portail)."""

    def __init__(self, error: str, description: str, *, redirect: bool = False, status: int = 400):
        super().__init__(description)
        self.error = error
        self.description = description
        self.redirect = redirect
        self.status = status


def issuer(settings: Settings) -> str:
    return settings.app_url.rstrip("/")


def discovery(settings: Settings) -> dict:
    iss = issuer(settings)
    return {
        "issuer": iss,
        "authorization_endpoint": f"{iss}/oidc/authorize",
        "token_endpoint": f"{iss}/oidc/token",
        "userinfo_endpoint": f"{iss}/oidc/userinfo",
        "jwks_uri": f"{iss}/oidc/jwks",
        "end_session_endpoint": f"{iss}/oidc/logout",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256"],
        "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"],
        "code_challenge_methods_supported": ["S256"],
        "scopes_supported": list(SCOPES),
        "claims_supported": [
            "sub",
            "email",
            "email_verified",
            "name",
            "given_name",
            "family_name",
            "locale",
            "gsms_role",
            "gsms_core_role",
        ],
    }


# --- clé de signature ------------------------------------------------------------------------------------


@dataclass(frozen=True)
class SigningKey:
    kid: str
    private_pem: bytes

    @property
    def private(self) -> rsa.RSAPrivateKey:
        return serialization.load_pem_private_key(self.private_pem, password=None)  # type: ignore[return-value]

    def jwk(self) -> dict:
        numbers = self.private.public_key().public_numbers()

        def b64(value: int) -> str:
            raw = value.to_bytes((value.bit_length() + 7) // 8, "big")
            return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

        return {
            "kty": "RSA",
            "use": "sig",
            "alg": "RS256",
            "kid": self.kid,
            "n": b64(numbers.n),
            "e": b64(numbers.e),
        }


_key_cache: dict[str, SigningKey] = {}


def signing_key(session: Session, vault: Vault) -> SigningKey:
    row = session.get(PlatformSetting, KEY_SETTING)
    if row is not None and row.secret:
        kid = row.value["kid"]
        if kid not in _key_cache:
            pem = vault.unseal(row.secret, KEY_SETTING).encode("ascii")
            _key_cache[kid] = SigningKey(kid, pem)
        return _key_cache[kid]
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = private.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    )
    kid = utcnow().strftime("%Y%m%d") + "-" + secrets.token_hex(4)
    session.add(
        PlatformSetting(
            key=KEY_SETTING,
            value={"kid": kid, "algorithm": "RS256", "created_at": utcnow().isoformat()},
            secret=vault.seal(pem.decode("ascii"), KEY_SETTING),
            updated_by="system:oidc",
        )
    )
    session.flush()
    key = SigningKey(kid, pem)
    _key_cache[kid] = key
    return key


def jwks(session: Session, vault: Vault) -> dict:
    return {"keys": [signing_key(session, vault).jwk()]}


# --- clients ---------------------------------------------------------------------------------------------


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def default_redirect_uris(settings: Settings, app: str) -> list[str]:
    host = urlsplit(issuer(settings)).hostname or "localhost"
    paths = {
        "grace": f"https://grace.{host}/api/auth/sso/callback",
        "qatrial": f"https://qatrial.{host}/api/auth/sso/callback",
        "crm": f"https://crm.{host}/api/auth/callback/gsms",
    }
    return [paths[app]] if app in paths else []


def _check_uri(uri: str) -> str:
    parts = urlsplit(uri)
    local = parts.hostname in ("localhost", "127.0.0.1")
    if parts.scheme not in ("https", "http") or (parts.scheme == "http" and not local) or not parts.hostname:
        raise ValueError(f"adresse de retour refusée (https obligatoire) : {uri}")
    if parts.fragment:
        raise ValueError(f"adresse de retour sans fragment (#) : {uri}")
    return uri


def save_client(
    session: Session,
    app: str,
    redirect_uris: list[str],
    actor: str,
    post_logout_redirect_uris: list[str] | None = None,
    rotate: bool = False,
) -> tuple[OidcClient, str | None]:
    """Crée ou met à jour le client de l'application. Renvoie le secret en clair s'il est (re)généré."""
    catalog = app_catalog.APPS_BY_KEY.get(app)
    if catalog is None or not catalog.sso:
        raise ValueError(f"application inconnue : {app} (attendu : {', '.join(app_catalog.SSO_APPS)})")
    uris = [_check_uri(u.strip()) for u in redirect_uris if u.strip()]
    if not uris:
        raise ValueError("au moins une adresse de retour est requise")
    logout = [_check_uri(u.strip()) for u in (post_logout_redirect_uris or []) if u.strip()]
    client = session.get(OidcClient, app)
    secret = None
    if client is None:
        secret = secrets.token_urlsafe(32)
        client = OidcClient(
            client_id=app, app=app, name=catalog.name, secret_hash=_hash(secret), updated_by=actor
        )
        session.add(client)
    elif rotate:
        secret = secrets.token_urlsafe(32)
        client.secret_hash = _hash(secret)
        client.secret_rotated_at = utcnow()
    client.redirect_uris = uris
    client.post_logout_redirect_uris = logout
    client.is_active = True
    client.updated_by = actor
    session.flush()
    record(
        session,
        actor=actor,
        action="oidc.client_save",
        subject_uri=f"gsms://oidc/client/{app}",
        after={"redirect_uris": uris, "secret_regenere": secret is not None},
    )
    return client, secret


def client_view(client: OidcClient) -> dict:
    return {
        "client_id": client.client_id,
        "app": client.app,
        "name": client.name,
        "redirect_uris": client.redirect_uris,
        "post_logout_redirect_uris": client.post_logout_redirect_uris,
        "is_active": client.is_active,
        "secret_rotated_at": client.secret_rotated_at.isoformat(),
        "last_used_at": client.last_used_at.isoformat() if client.last_used_at else None,
    }


def _authenticate_client(session: Session, client_id: str | None, secret: str | None) -> OidcClient:
    client = session.get(OidcClient, client_id) if client_id else None
    if client is None or not client.is_active or not secret:
        raise OidcError("invalid_client", "client inconnu ou secret absent", status=401)
    if not hmac.compare_digest(client.secret_hash, _hash(secret)):
        raise OidcError("invalid_client", "secret du client invalide", status=401)
    return client


# --- autorisation ----------------------------------------------------------------------------------------


@dataclass(frozen=True)
class AppGrant:
    core_role: str
    app_role: str


def grant_for(session: Session, user: User, app: str) -> AppGrant:
    """Droit d'un membre sur une application ; lève access_denied s'il n'en a pas."""
    if not user.is_active:
        raise OidcError("access_denied", "compte désactivé", redirect=True)
    role = staff_role(session, user.id)
    if role is None or role.value not in app_catalog.TEAM_ROLE_VALUES:
        raise OidcError("access_denied", "réservé à l'équipe GSMS", redirect=True)
    access = app_catalog.effective_access(role, app, app_catalog.overrides(session, user.id).get(app))
    if not access.enabled or access.role is None:
        raise OidcError("access_denied", "accès à cette application non autorisé", redirect=True)
    return AppGrant(role.value, access.role)


@dataclass(frozen=True)
class AuthorizeRequest:
    client_id: str
    redirect_uri: str
    response_type: str
    scope: str
    state: str | None = None
    nonce: str | None = None
    code_challenge: str | None = None
    code_challenge_method: str | None = None
    prompt: str | None = None


def redirect_with(uri: str, params: dict) -> str:
    query = urlencode({k: v for k, v in params.items() if v is not None})
    return f"{uri}{'&' if '?' in uri else '?'}{query}"


def authorize(session: Session, user: User, req: AuthorizeRequest, actor: str) -> str:
    """Valide la demande et renvoie l'adresse de retour avec le code (ou avec l'erreur, si renvoyable)."""
    client = session.get(OidcClient, req.client_id)
    if client is None or not client.is_active:
        raise OidcError("invalid_client", "application inconnue : à déclarer par un administrateur")
    if req.redirect_uri not in client.redirect_uris:
        raise OidcError("invalid_request", "adresse de retour non déclarée pour cette application")
    try:
        if req.response_type != "code":
            raise OidcError("unsupported_response_type", "seul response_type=code est accepté", redirect=True)
        scopes = req.scope.split()
        if "openid" not in scopes:
            raise OidcError("invalid_scope", "le scope openid est obligatoire", redirect=True)
        if req.code_challenge and (req.code_challenge_method or "plain") != "S256":
            raise OidcError("invalid_request", "PKCE : seule la méthode S256 est acceptée", redirect=True)
        if req.prompt == "none":
            pass  # la session du portail existe déjà quand on arrive ici
        grant_for(session, user, client.app)
    except OidcError as err:
        record(
            session,
            actor=actor,
            action="oidc.authorize_denied",
            subject_uri=f"gsms://oidc/client/{client.client_id}",
            after={"erreur": err.error, "motif": err.description},
        )
        return redirect_with(
            req.redirect_uri, {"error": err.error, "error_description": err.description, "state": req.state}
        )
    code = secrets.token_urlsafe(32)
    now = utcnow()
    session.execute(delete(OidcCode).where(OidcCode.expires_at < now - timedelta(hours=1)))
    session.add(
        OidcCode(
            code_hash=_hash(code),
            client_id=client.client_id,
            user_id=user.id,
            redirect_uri=req.redirect_uri,
            scope=" ".join(s for s in scopes if s in SCOPES),
            nonce=req.nonce,
            code_challenge=req.code_challenge,
            auth_time=now,
            expires_at=now + CODE_TTL,
        )
    )
    session.flush()
    return redirect_with(req.redirect_uri, {"code": code, "state": req.state})


# --- jetons ----------------------------------------------------------------------------------------------


def _profile(user: User, grant: AppGrant, scope: str) -> dict:
    claims: dict = {"gsms_role": grant.app_role, "gsms_core_role": grant.core_role}
    if "email" in scope.split():
        claims |= {"email": user.email, "email_verified": True}
    if "profile" in scope.split():
        given, _, family = user.name.partition(" ")
        claims |= {
            "name": user.name,
            "given_name": given,
            "family_name": family or None,
            "locale": user.locale,
        }
    return {k: v for k, v in claims.items() if v is not None}


def exchange_code(
    session: Session,
    settings: Settings,
    vault: Vault,
    *,
    grant_type: str | None,
    code: str | None,
    redirect_uri: str | None,
    client_id: str | None,
    client_secret: str | None,
    code_verifier: str | None,
) -> dict:
    client = _authenticate_client(session, client_id, client_secret)
    if grant_type != "authorization_code":
        raise OidcError("unsupported_grant_type", "seul authorization_code est accepté")
    row = session.get(OidcCode, _hash(code)) if code else None
    now = utcnow()
    if row is None or row.client_id != client.client_id:
        raise OidcError("invalid_grant", "code inconnu")
    if row.used_at is not None:
        raise OidcError("invalid_grant", "code déjà utilisé")
    row.used_at = now
    if row.expires_at <= now:
        raise OidcError("invalid_grant", "code expiré")
    if redirect_uri != row.redirect_uri:
        raise OidcError("invalid_grant", "adresse de retour différente de celle de la demande")
    if row.code_challenge:
        if not code_verifier:
            raise OidcError("invalid_grant", "PKCE : code_verifier manquant")
        digest = hashlib.sha256(code_verifier.encode("ascii", "ignore")).digest()
        expected = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
        if not hmac.compare_digest(expected, row.code_challenge):
            raise OidcError("invalid_grant", "PKCE : code_verifier invalide")
    user = session.get(User, row.user_id)
    if user is None:
        raise OidcError("invalid_grant", "compte introuvable")
    try:
        grant = grant_for(session, user, client.app)
    except OidcError as err:
        raise OidcError("invalid_grant", err.description) from err
    client.last_used_at = now
    user.last_login_at = now
    key = signing_key(session, vault)
    iss = issuer(settings)
    exp = now + TOKEN_TTL
    base = {"iss": iss, "sub": str(user.id), "aud": client.client_id, "iat": int(now.timestamp())}
    id_claims = base | {"exp": int(exp.timestamp()), "auth_time": int(row.auth_time.timestamp())}
    if row.nonce:
        id_claims["nonce"] = row.nonce
    id_claims |= _profile(user, grant, row.scope)
    access_claims = base | {
        "exp": int(exp.timestamp()),
        "scope": row.scope,
        "client_id": client.client_id,
        "jti": str(uuid.uuid4()),
    }
    headers = {"kid": key.kid}
    record(
        session,
        actor=f"user:{user.id}",
        action="oidc.login",
        subject_uri=f"gsms://oidc/client/{client.client_id}",
        after={"app": client.app, "role": grant.app_role},
    )
    return {
        "access_token": jwt.encode(access_claims, key.private, algorithm="RS256", headers=headers),
        "token_type": "Bearer",
        "expires_in": int(TOKEN_TTL.total_seconds()),
        "id_token": jwt.encode(id_claims, key.private, algorithm="RS256", headers=headers),
        "scope": row.scope,
    }


def userinfo(session: Session, settings: Settings, vault: Vault, token: str) -> dict:
    key = signing_key(session, vault)
    try:
        claims = jwt.decode(
            token,
            key.private.public_key(),
            algorithms=["RS256"],
            issuer=issuer(settings),
            options={"verify_aud": False, "require": ["sub", "exp", "client_id", "scope"]},
        )
    except jwt.PyJWTError as exc:
        raise OidcError("invalid_token", "jeton invalide ou expiré", status=401) from exc
    client = session.get(OidcClient, claims["client_id"])
    user = session.get(User, uuid.UUID(claims["sub"]))
    if client is None or user is None:
        raise OidcError("invalid_token", "jeton invalide", status=401)
    try:
        grant = grant_for(session, user, client.app)
    except OidcError as err:
        raise OidcError("invalid_token", err.description, status=401) from err
    return {"sub": str(user.id)} | _profile(user, grant, claims["scope"])


def end_session_redirect(session: Session, settings: Settings, post_logout_redirect_uri: str | None) -> str:
    """Après déconnexion : retour vers l'application si l'adresse est déclarée, sinon la page de connexion."""
    if post_logout_redirect_uri:
        for client in session.scalars(select(OidcClient).where(OidcClient.is_active.is_(True))):
            if post_logout_redirect_uri in (client.post_logout_redirect_uris or []):
                return post_logout_redirect_uri
    return f"{issuer(settings)}/login"


def purge_codes(session: Session, before: datetime | None = None) -> int:
    result = session.execute(delete(OidcCode).where(OidcCode.expires_at < (before or utcnow())))
    return result.rowcount or 0
