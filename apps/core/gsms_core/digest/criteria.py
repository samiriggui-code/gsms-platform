"""Critères d'attribution et pondérations (RC) : « Prix : 40 % », « 60 % pour la valeur technique »,
ou tableau « Critère | Pondération ». Règles déterministes ; chaque critère garde sa source."""

from __future__ import annotations

import re

from gsms_core.digest.classifier import fold
from gsms_core.digest.provenance import iter_units, stable_id, with_excerpt
from gsms_core.digest.schemas import AwardCriterion
from gsms_core.documents.parsers.schemas import NormalizedDocument, SourceRef

_CONTEXT = re.compile(r"critere|jugement des offres|ponderation|notation des offres|analyse des offres")
_SECTION = re.compile(r"critere|jugement|attribution|notation|ponderation|analyse des offres|classement")
_NUM = r"(?P<w>\d{1,3}(?:[.,]\d{1,2})?)\s*(?P<u>%|pour ?cent|points?|pts)"
_LABEL_FIRST = re.compile(
    r"(?P<label>[^:;\n%()]{3,90}?)\s*"
    r"(?::|-|\u2013|\u2014|\(|=|pond[ée]r[ée]e?s?\s+[àa]|à hauteur de)\s*" + _NUM,
    re.IGNORECASE,
)
_WEIGHT_FIRST = re.compile(
    _NUM + r"\s*(?:pour\s+(?:le|la|les|l')\s*)?(?:crit[èe]re\s+)?(?P<label>[A-Za-zÀ-ÿ][^,;.\n()]{2,80})",
    re.IGNORECASE,
)
_WEIGHT_CELL = re.compile(r"^\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(%|points?|pts)?\s*$", re.IGNORECASE)
_TABLE_HEADER = re.compile(r"critere|ponderation|coefficient")
_NOISE = re.compile(r"^(?:crit[èe]res?\s*(?:n\W*)?\d*|\d+[.)]|[-•·*]|le|la|les|du|des|de)\s+", re.IGNORECASE)


def _clean(label: str) -> str:
    label = label.strip(" \t:-\u2013\u2014.,")
    previous = None
    while previous != label:
        previous = label
        label = _NOISE.sub("", label).strip(" \t:-\u2013\u2014.,")
    return label[:1].upper() + label[1:] if label else label


def _criterion(doc: NormalizedDocument, label: str, weight: str, unit: str, source: SourceRef, text: str):
    value = float(weight.replace(",", "."))
    if unit == "%" and not 0 < value <= 100:
        return None
    label = _clean(label)
    if len(label) < 3 or re.fullmatch(r"[\d\s.,%]+", label):
        return None
    return AwardCriterion(
        id=stable_id("crit", doc.document_id, source.block_id, source.cell, label, value),
        label=label,
        weight=value,
        unit=unit,
        source=with_excerpt(source, text),
    )


def _from_tables(doc: NormalizedDocument) -> list[AwardCriterion]:
    out: list[AwardCriterion] = []
    for table in doc.tables:
        rows = table.rows()
        if len(rows) < 2 or not _TABLE_HEADER.search(fold(" ".join(c.text for c in rows[0]))):
            continue
        for row in rows[1:]:
            weight_cell = next((c for c in row if _WEIGHT_CELL.match(c.text)), None)
            label_cell = next((c for c in row if c.text.strip() and not _WEIGHT_CELL.match(c.text)), None)
            if weight_cell is None or label_cell is None:
                continue
            m = _WEIGHT_CELL.match(weight_cell.text)
            assert m is not None
            unit = "points" if (m.group(2) or "").lower().startswith(("p",)) else "%"
            row_text = " | ".join(c.text for c in row)
            crit = _criterion(doc, label_cell.text, m.group(1), unit, weight_cell.source, row_text)
            if crit:
                out.append(crit)
    return out


def extract_criteria(doc: NormalizedDocument) -> list[AwardCriterion]:
    out: list[AwardCriterion] = []
    for unit in iter_units(doc):
        if unit.cells:
            continue
        in_section = bool(unit.source.section and _SECTION.search(fold(unit.source.section)))
        if not (in_section or _CONTEXT.search(fold(unit.text))):
            continue
        matches = list(_LABEL_FIRST.finditer(unit.text)) or list(_WEIGHT_FIRST.finditer(unit.text))
        for m in matches:
            unit_kind = "points" if m.group("u").lower().startswith(("point", "pts")) else "%"
            crit = _criterion(doc, m.group("label"), m.group("w"), unit_kind, unit.source, unit.text)
            if crit:
                out.append(crit)
    out.extend(_from_tables(doc))
    seen: set[str] = set()
    return [c for c in out if not (c.id in seen or seen.add(c.id))]
