from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from gsms_core.db import Base, import_all_models

ROOT = Path(__file__).resolve().parents[1]


def test_alembic_upgrade_head_matches_models(tmp_path):
    url = f"sqlite:///{tmp_path / 'migr.db'}"
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")

    import_all_models()
    tables = set(inspect(create_engine(url)).get_table_names())
    assert set(Base.metadata.tables) <= tables
    command.downgrade(cfg, "base")
    assert set(inspect(create_engine(url)).get_table_names()) <= {"alembic_version"}
