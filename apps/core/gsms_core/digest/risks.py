"""Risques contractuels repérables (pénalités, résiliation, critères éliminatoires…)."""

from __future__ import annotations

import re

from gsms_core.digest.classifier import fold
from gsms_core.digest.provenance import iter_units, stable_id, with_excerpt
from gsms_core.digest.schemas import Risk
from gsms_core.documents.parsers.schemas import NormalizedDocument

RISK_RULES: tuple[tuple[str, str], ...] = (
    ("penalite", r"\bpenalites?\b|\bretenues?\b"),
    ("resiliation", r"\bresiliation\b"),
    (
        "eliminatoire",
        r"eliminatoire|rejet de l.offre|(offre|candidature)[^.]{0,40}(rejetee|ecartee|irreguliere)",
    ),
    ("astreinte", r"\bastreintes?\b"),
)


def extract_risks(doc: NormalizedDocument) -> list[Risk]:
    out: list[Risk] = []
    for unit in iter_units(doc):
        folded = fold(unit.text)
        for kind, pattern in RISK_RULES:
            if re.search(pattern, folded):
                out.append(
                    Risk(
                        id=stable_id("risk", doc.document_id, kind, unit.source.block_id, unit.source.cell),
                        kind=kind,
                        text=unit.text.strip()[:600],
                        source=with_excerpt(unit.source, unit.text),
                    )
                )
                break
    return out
