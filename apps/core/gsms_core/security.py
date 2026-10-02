"""Hachage des mots de passe (bcrypt) et jetons d'accès JWT HS256."""

from __future__ import annotations

import hashlib
import hmac
import uuid
from dataclasses import dataclass
from datetime import timedelta

import bcrypt
import jwt

from gsms_core.db import utcnow
from gsms_core.settings import Settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("ascii"))
    except ValueError:
        return False


def hash_api_key(key: str) -> str:
    """Empreinte d'une clé de service account (clé à haute entropie : sha256 suffit)."""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class TokenClaims:
    sub: uuid.UUID
    org_id: uuid.UUID
    workspace_id: uuid.UUID | None
    role: str


class InvalidToken(Exception):
    pass


def create_access_token(settings: Settings, claims: TokenClaims) -> str:
    now = utcnow()
    payload = {
        "sub": str(claims.sub),
        "org_id": str(claims.org_id),
        "workspace_id": str(claims.workspace_id) if claims.workspace_id else None,
        "role": claims.role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.jwt_ttl_minutes)).timestamp()),
        "iss": "gsms-core",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(settings: Settings, token: str) -> TokenClaims:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer="gsms-core",
            options={"require": ["sub", "exp", "org_id", "role"]},
        )
        ws = payload.get("workspace_id")
        return TokenClaims(
            sub=uuid.UUID(payload["sub"]),
            org_id=uuid.UUID(payload["org_id"]),
            workspace_id=uuid.UUID(ws) if ws else None,
            role=str(payload["role"]),
        )
    except (jwt.PyJWTError, ValueError, KeyError) as exc:
        raise InvalidToken(str(exc)) from exc


def sign_hmac_sha256(secret: str, body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def verify_hmac_sha256(secret: str, body: bytes, signature: str | None) -> bool:
    if not signature:
        return False
    expected = sign_hmac_sha256(secret, body)
    provided = signature if signature.startswith("sha256=") else "sha256=" + signature
    return hmac.compare_digest(expected, provided)
