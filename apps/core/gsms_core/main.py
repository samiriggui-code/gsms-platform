"""Point d'entrée FastAPI du GSMS Core."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from gsms_core import __version__
from gsms_core.communications.router import router as communications_router
from gsms_core.context.router import router as context_router
from gsms_core.db import Database, import_all_models
from gsms_core.digest.router import router as digest_router
from gsms_core.documents.parsers import DoclingAdapter, DocumentParser
from gsms_core.documents.router import router as documents_router
from gsms_core.documents.storage import Storage, build_storage
from gsms_core.events.bus import bus
from gsms_core.events.router import router as events_router
from gsms_core.identity.router import router as identity_router
from gsms_core.identity.team_router import router as team_router
from gsms_core.intake.router import router as intake_router
from gsms_core.missions.router import router as missions_router
from gsms_core.oidc.router import router as oidc_router
from gsms_core.platform.router import router as platform_router
from gsms_core.settings import Settings, get_settings
from gsms_core.tenders.router import router as tenders_router
from gsms_core.vault.router import router as vault_router
from gsms_core.vault.storage import Vault
from gsms_core.work.router import router as work_router
from gsms_core.workflows import build_engine
from gsms_core.workspaces.router import router as workspaces_router

log = logging.getLogger("gsms_core")


def create_app(
    settings: Settings | None = None,
    *,
    db: Database | None = None,
    storage: Storage | None = None,
    document_parser: DocumentParser | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    import_all_models()
    app = FastAPI(
        title="GSMS Core", version=__version__, docs_url="/api/docs", openapi_url="/api/openapi.json"
    )
    app.state.settings = settings
    app.state.db = db or Database(settings.database_url)
    app.state.storage = storage or build_storage(settings)
    # Coffre-fort : chiffrement par workspace au-dessus du stockage objet (gsms_core.vault).
    app.state.vault = Vault.from_settings(app.state.storage, settings)
    # Messagerie : réglages lus à chaque envoi (portail, sinon .env) ; un faux expéditeur en test.
    app.state.mail_sender = None
    # Client HTTP du test de clé LLM (remplacé en test).
    app.state.llm_http = None
    # Moteur de parsing derrière l'interface DocumentParser (Docling par défaut, import paresseux).
    app.state.document_parser = document_parser or DoclingAdapter()
    app.state.workflows = build_engine(settings, bus)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
            allow_headers=["Authorization", "Content-Type", "X-GSMS-Workspace-Id"],
            expose_headers=["Content-Disposition"],
        )

    @app.get("/api/v1/health", tags=["ops"])
    def health(request: Request) -> dict:
        db_ok = True
        try:
            with request.app.state.db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except Exception:  # pragma: no cover - dépend de l'infra
            log.exception("health: base indisponible")
            db_ok = False
        return {"status": "ok" if db_ok else "degraded", "version": __version__, "database": db_ok}

    for router in (
        identity_router,
        team_router,
        oidc_router,
        intake_router,
        context_router,
        workspaces_router,
        missions_router,
        tenders_router,
        documents_router,
        digest_router,
        vault_router,
        communications_router,
        platform_router,
        work_router,
        events_router,
    ):
        app.include_router(router)
    return app
