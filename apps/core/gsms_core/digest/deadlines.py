"""Échéances datées (remise des offres, visite, questions…) avec leur source."""

from __future__ import annotations

import re
from datetime import date

from gsms_core.digest.classifier import fold
from gsms_core.digest.provenance import iter_units, stable_id, with_excerpt
from gsms_core.digest.schemas import Deadline
from gsms_core.documents.parsers.schemas import NormalizedDocument

_MONTHS = {
    "janvier": 1,
    "fevrier": 2,
    "mars": 3,
    "avril": 4,
    "mai": 5,
    "juin": 6,
    "juillet": 7,
    "aout": 8,
    "septembre": 9,
    "octobre": 10,
    "novembre": 11,
    "decembre": 12,
}
_NUMERIC = re.compile(r"\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b")
_LITERAL = re.compile(r"\b(\d{1,2})(?:er)?\s+(" + "|".join(_MONTHS) + r")\s+(\d{4})\b")
_TIME = re.compile(r"\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b")

KIND_RULES: tuple[tuple[str, str, str], ...] = (
    (
        "remise_offres",
        "Remise des offres",
        r"remise des offres|reception des offres|depot des offres|date limite de (remise|reception|depot)",
    ),
    ("visite", "Visite des lieux", r"visite"),
    ("questions", "Date limite des questions", r"questions?|demandes? de renseignements"),
    ("demarrage", "Démarrage de la prestation", r"demarrage|debut (de la )?prestation|prise de poste"),
)


def _dates(folded: str) -> list[tuple[date, int]]:
    out = []
    for m in _NUMERIC.finditer(folded):
        try:
            out.append((date(int(m.group(3)), int(m.group(2)), int(m.group(1))), m.end()))
        except ValueError:
            continue
    for m in _LITERAL.finditer(folded):
        try:
            out.append((date(int(m.group(3)), _MONTHS[m.group(2)], int(m.group(1))), m.end()))
        except ValueError:
            continue
    return out


def extract_deadlines(doc: NormalizedDocument) -> list[Deadline]:
    out: list[Deadline] = []
    for unit in iter_units(doc):
        folded = fold(unit.text)
        found = _dates(folded)
        if not found:
            continue
        kind = label = None
        for k, lbl, pattern in KIND_RULES:
            if re.search(pattern, folded):
                kind, label = k, lbl
                break
        if kind is None:
            if not re.search(r"limite|avant le|au plus tard|echeance", folded):
                continue
            kind, label = "autre", "Échéance"
        for due, end in found:
            t = _TIME.search(folded[end : end + 20])
            due_time = f"{int(t.group(1)):02d}:{t.group(2) or '00'}" if t else None
            out.append(
                Deadline(
                    id=stable_id("dl", doc.document_id, kind, due, unit.source.block_id, unit.source.cell),
                    kind=kind,
                    label=label,
                    due_date=due,
                    due_time=due_time,
                    source=with_excerpt(unit.source, unit.text),
                )
            )
    return out
