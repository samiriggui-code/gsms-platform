"""Configuration du Core, lue depuis l'environnement (préfixe ``GSMS_``) ou un fichier ``.env``."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_JWT_SECRET = "change-me-dev-only-not-a-secret-0123456789"  # noqa: S105 - valeur de dev, refusée en prod


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="GSMS_", env_file=".env", extra="ignore")

    env: Literal["dev", "test", "prod"] = "dev"
    database_url: str = "sqlite:///./var/gsms_core.db"

    jwt_secret: str = Field(default=DEV_JWT_SECRET, min_length=32)
    jwt_algorithm: Literal["HS256"] = "HS256"
    jwt_ttl_minutes: int = 60

    storage_backend: Literal["local", "s3"] = "local"
    storage_local_root: Path = Path("./var/blobs")
    s3_endpoint_url: str | None = None
    s3_bucket: str = "gsms-documents"
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_region: str = "us-east-1"
    max_upload_mb: int = 100

    # Origines navigateur autorisées à appeler l'API (ex. DocuLens : https://doculens.gsms-security.com).
    # Vide = aucune (les apps passent par le même domaine ou côté serveur).
    cors_origins: list[str] = Field(default_factory=list)

    # Secrets HMAC des webhooks entrants, indexés par source (crm, grace, qatrial...).
    webhook_secrets: dict[str, str] = Field(default_factory=dict)

    crm_url: str = "http://localhost:3001"
    crm_token: str | None = None
    # Clé publique CRM (`x-gsms-public-key`) pour relayer l'intake vitrine.
    crm_public_key: str | None = None
    grace_url: str = "http://localhost:3002"
    grace_token: str | None = None
    qatrial_url: str = "http://localhost:3003"
    qatrial_token: str | None = None

    tenderai_mcp_url: str = "http://localhost:8765/mcp"
    tenderai_mcp_token: str | None = None
    lexsocket_mcp_url: str = "https://mcp.lexsocket.ai/"
    lexsocket_mcp_token: str | None = None

    # Dossier des contrats partagés (finding.schema.json). None = recherche depuis la racine du dépôt.
    contracts_dir: Path | None = None

    remediation_severity_threshold: Literal["critical", "major", "minor"] = "minor"

    @model_validator(mode="after")
    def _refuse_dev_secrets_in_prod(self) -> Settings:
        if self.env == "prod":
            if self.jwt_secret == DEV_JWT_SECRET:
                raise ValueError("GSMS_JWT_SECRET doit être défini en production")
            if self.database_url.startswith("sqlite"):
                raise ValueError("GSMS_DATABASE_URL doit pointer vers PostgreSQL en production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
