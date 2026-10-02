"""URIs de référence inter-applications : ``système://type/identifiant`` (ex. ``grace://finding/4f2a``)."""

from __future__ import annotations

import re
from dataclasses import dataclass

EXTERNAL_SYSTEMS = frozenset({"crm", "grace", "qatrial", "tender", "lexsocket", "doc"})
INTERNAL_SYSTEMS = frozenset({"mission", "action", "document", "version", "workspace", "evidence", "finding"})

_URI_RE = re.compile(r"^(?P<system>[a-z][a-z0-9+.-]*)://(?P<kind>[A-Za-z0-9_-]+)/(?P<external_id>[^\s?#]+)$")


class InvalidUri(ValueError):
    pass


@dataclass(frozen=True)
class ParsedUri:
    system: str
    kind: str
    external_id: str

    def __str__(self) -> str:
        return f"{self.system}://{self.kind}/{self.external_id}"


def parse_uri(uri: str, *, allowed: frozenset[str] = EXTERNAL_SYSTEMS) -> ParsedUri:
    m = _URI_RE.match(uri.strip())
    if not m:
        raise InvalidUri(f"URI invalide : {uri!r}")
    system = m["system"]
    if system not in allowed:
        raise InvalidUri(f"système inconnu : {system!r}")
    external_id = m["external_id"].strip("/")
    if not external_id or ".." in external_id.split("/"):
        raise InvalidUri(f"identifiant invalide : {uri!r}")
    return ParsedUri(system=system, kind=m["kind"], external_id=external_id)


def make_uri(system: str, kind: str, external_id: object) -> str:
    return str(ParsedUri(system, kind, str(external_id)))


def core_uri(kind: str, id_: object) -> str:
    """URI interne au Core, ex. ``mission://<uuid>`` (sans type intermédiaire)."""
    return f"{kind}://{id_}"
