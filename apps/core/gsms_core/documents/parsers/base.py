"""Interface des parseurs documentaires du Core.

Le Core n'appelle jamais un moteur de parsing directement : il passe par ``DocumentParser``.
L'implémentation par défaut est ``DoclingAdapter`` ; un autre moteur se branche en implémentant
le même protocole, sans toucher au Digest ni aux routes.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, runtime_checkable

from gsms_core.documents.parsers.schemas import NormalizedDocument


class ParseError(RuntimeError):
    """Échec de parsing, avec un code stable exploitable par l'API et les événements."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class ParseRequest:
    path: Path
    document_id: uuid.UUID
    workspace_id: uuid.UUID
    filename: str
    version_id: uuid.UUID | None = None
    mission_id: uuid.UUID | None = None
    mime: str | None = None


@runtime_checkable
class DocumentParser(Protocol):
    name: str

    def supports(self, filename: str, mime: str | None = None) -> bool: ...

    def parse(self, request: ParseRequest) -> NormalizedDocument: ...
