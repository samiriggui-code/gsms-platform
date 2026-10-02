from __future__ import annotations

from logging.config import fileConfig
from typing import Any

from alembic import context

from gsms_core.db import Base, UTCDateTime, import_all_models, make_engine
from gsms_core.settings import get_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

import_all_models()
target_metadata = Base.metadata


def _url() -> str:
    x = context.get_x_argument(as_dictionary=True)
    return x.get("db_url") or config.get_main_option("sqlalchemy.url") or get_settings().database_url


def render_item(type_: str, obj: Any, autogen_context: Any) -> str | bool:
    # Les migrations ne dépendent pas des types maison : UTCDateTime → DateTime(timezone=True).
    if type_ == "type" and isinstance(obj, UTCDateTime):
        return "sa.DateTime(timezone=True)"
    return False


def _configure(**kwargs: Any) -> None:
    context.configure(
        target_metadata=target_metadata,
        render_as_batch=True,  # ALTER TABLE compatibles SQLite
        compare_type=True,
        render_item=render_item,
        **kwargs,
    )


def run_migrations_offline() -> None:
    _configure(url=_url(), literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = make_engine(_url())
    with engine.connect() as connection:
        _configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
