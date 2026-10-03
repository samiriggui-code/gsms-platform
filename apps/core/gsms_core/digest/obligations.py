"""Obligations contractuelles : phrases prescriptives (« doit », « est tenu de », « obligatoire »…)."""

from __future__ import annotations

import re

from gsms_core.digest.classifier import fold
from gsms_core.digest.provenance import iter_units, stable_id, with_excerpt
from gsms_core.digest.schemas import Obligation
from gsms_core.documents.parsers.schemas import NormalizedDocument

_PRESCRIPTIVE = re.compile(
    r"\b(doit|doivent|devra|devront|est tenue?s?|sont tenue?s"
    r"|obligatoire(?:ment)?|imperativement|il est exige)\b"
)
_SENTENCE_SPLIT = re.compile(r"(?<=[.;!?])\s+|\n+")


def extract_obligations(doc: NormalizedDocument) -> list[Obligation]:
    out: list[Obligation] = []
    for unit in iter_units(doc):
        if unit.cells:
            continue
        for sentence in _SENTENCE_SPLIT.split(unit.text):
            sentence = sentence.strip()
            if 12 <= len(sentence) <= 600 and _PRESCRIPTIVE.search(fold(sentence)):
                out.append(
                    Obligation(
                        id=stable_id("obl", doc.document_id, unit.source.block_id, sentence),
                        text=sentence,
                        source=with_excerpt(unit.source, sentence),
                    )
                )
    return out
