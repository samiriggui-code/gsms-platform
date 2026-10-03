"""Base SQLAlchemy 2, moteur et sessions.

Les types restent portables (``Uuid``, ``JSON``, enums non natifs) pour que les tests tournent sur SQLite.
Les spécificités PostgreSQL (schémas ``identity``/``mission``…, pgvector, tsvector) arrivent dans des
migrations ultérieures, derrière un test de dialecte.
"""

from __future__ import annotations

import enum
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Enum, MetaData, Uuid, create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import TypeDecorator

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


def utcnow() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator[datetime]):
    """Horodatage toujours stocké et relu en UTC « aware » (SQLite perd le fuseau sinon)."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Any) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    def process_result_value(self, value: datetime | None, dialect: Any) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)


def str_enum(enum_cls: type[enum.Enum], length: int = 32) -> Enum:
    """Enum stocké en VARCHAR (valeurs, pas noms) : portable et sans type natif à migrer."""
    return Enum(
        enum_cls,
        native_enum=False,
        length=length,
        values_callable=lambda e: [m.value for m in e],
        validate_strings=True,
    )


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    type_annotation_map = {
        uuid.UUID: Uuid(),
        datetime: UTCDateTime(),
        dict[str, Any]: JSON(),
        list[str]: JSON(),
        list[dict[str, Any]]: JSON(),
    }


class UUIDPk:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)


class Timestamped:
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


def make_engine(url: str) -> Engine:
    kwargs: dict[str, Any] = {"future": True}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
        if ":memory:" in url or url in {"sqlite://", "sqlite+pysqlite://"}:
            kwargs["poolclass"] = StaticPool
    engine = create_engine(url, **kwargs)
    if engine.dialect.name == "sqlite":

        @event.listens_for(engine, "connect")
        def _fk_on(dbapi_conn: Any, _record: Any) -> None:
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA foreign_keys=ON")
            cur.close()

    return engine


class Database:
    """Couple moteur + fabrique de sessions, injecté dans l'application (tests : SQLite mémoire)."""

    def __init__(self, url: str) -> None:
        self.engine = make_engine(url)
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False, autoflush=True)

    def create_all(self) -> None:
        import_all_models()
        Base.metadata.create_all(self.engine)

    def session(self) -> Iterator[Session]:
        with self.session_factory() as s:
            yield s


def import_all_models() -> None:
    """Importe tous les modèles pour peupler ``Base.metadata`` (Alembic, create_all)."""
    from gsms_core.audit import models as _audit  # noqa: F401
    from gsms_core.context import models as _context  # noqa: F401
    from gsms_core.digest import models as _digest  # noqa: F401
    from gsms_core.documents import models as _documents  # noqa: F401
    from gsms_core.events import models as _events  # noqa: F401
    from gsms_core.identity import models as _identity  # noqa: F401
    from gsms_core.missions import models as _missions  # noqa: F401
    from gsms_core.tenders import models as _tenders  # noqa: F401
    from gsms_core.work import models as _work  # noqa: F401
    from gsms_core.workflows import models as _workflows  # noqa: F401
