"""Point d'entrée FastAPI du GSMS Core."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from sqlalchemy import text

from gsms_core import __version__
from gsms_core.context.router import router as context_router
from gsms_core.db import Database, import_all_models
from gsms_core.digest.router import router as digest_router
from gsms_core.documents.parsers import DoclingAdapter, DocumentParser
from gsms_core.documents.router import router as documents_router
from gsms_core.documents.storage import Storage, build_storage
from gsms_core.events.bus import bus
from gsms_core.events.router import router as events_router
from gsms_core.identity.router import router as identity_router
from gsms_core.missions.router import router as missions_router
from gsms_core.settings import Settings, get_settings
from gsms_core.work.router import router as work_router
from gsms_core.workflows import build_engine

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
    # Moteur de parsing derrière l'interface DocumentParser (Docling par défaut, import paresseux).
    app.state.document_parser = document_parser or DoclingAdapter()
    app.state.workflows = build_engine(settings, bus)

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
        context_router,
        missions_router,
        documents_router,
        digest_router,
        work_router,
        events_router,
    ):
        app.include_router(router)
    return app
