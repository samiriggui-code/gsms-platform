from __future__ import annotations

import secrets
import time
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from gsms_core.db import utcnow

_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def new_event_id() -> str:
    """Identifiant triable façon ULID : ``evt_`` + 10 car. temps + 16 car. aléatoires."""
    ms = int(time.time() * 1000)
    ts = "".join(_CROCKFORD[(ms >> (5 * i)) & 31] for i in reversed(range(10)))
    rnd = "".join(secrets.choice(_CROCKFORD) for _ in range(16))
    return f"evt_{ts}{rnd}"


class EventEnvelope(BaseModel):
    """Enveloppe unique des événements (§12)."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=new_event_id, max_length=64)
    type: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9_]+(\.[a-z0-9_]+)+$")
    source: str = Field(min_length=1, max_length=50)
    subject: str = Field(min_length=1, max_length=500)
    workspace_id: uuid.UUID
    mission_id: uuid.UUID | None = None
    actor: str = Field(min_length=1, max_length=200)
    occurred_at: datetime = Field(default_factory=utcnow)
    data: dict[str, Any] = Field(default_factory=dict)
    correlation_id: str | None = Field(default=None, max_length=64)
    causation_id: str | None = Field(default=None, max_length=64)

    def caused(self, **fields: Any) -> EventEnvelope:
        """Crée un événement dérivé : même corrélation, causation = cet événement."""
        base = {
            "source": "core",
            "workspace_id": self.workspace_id,
            "mission_id": self.mission_id,
            "actor": "service:core",
            "correlation_id": self.correlation_id or self.id,
            "causation_id": self.id,
        }
        base.update(fields)
        return EventEnvelope(**base)


def type_matches(pattern: str, event_type: str) -> bool:
    """``finding.created`` correspond à ``finding.created`` et à ``grace.finding.created``."""
    return event_type == pattern or event_type.endswith("." + pattern)
