"""Exigences de dimensionnement (effectifs par qualification) extraites du texte et des tableaux.

Exemples reconnus : « 2 agents SSIAP 1 », « SSIAP1 : 2 », ligne de BPU « Agent SSIAP 1 | … | 2 ».
"""

from __future__ import annotations

import re

from gsms_core.digest.classifier import fold
from gsms_core.digest.provenance import TextUnit, iter_units, stable_id, with_excerpt
from gsms_core.digest.schemas import Requirement
from gsms_core.documents.parsers.schemas import NormalizedDocument, SourceRef

# clé canonique → (libellé, motif sur texte replié)
QUALIFICATIONS: dict[str, tuple[str, str]] = {
    "SSIAP3": ("Chef de service SSIAP 3", r"ssiap\s*[-_ ]?\s*(?:niveau\s*)?3\b"),
    "SSIAP2": ("Chef d'équipe SSIAP 2", r"ssiap\s*[-_ ]?\s*(?:niveau\s*)?2\b"),
    "SSIAP1": ("Agent SSIAP 1", r"ssiap\s*[-_ ]?\s*(?:niveau\s*)?1\b"),
    "MAITRE_CHIEN": ("Agent cynophile", r"maitres?[- ]chiens?|agents?\s+cynophiles?"),
    "RONDIER": ("Rondier", r"rondiers?(?:[- ]intervenants?)?"),
    "CHEF_EQUIPE_SURETE": ("Chef d'équipe sûreté", r"chefs?\s+d.equipe\s+(?:de\s+)?(?:surete|securite)"),
    "AGENT_SECURITE": ("Agent de sécurité (ADS)", r"agents?\s+de\s+(?:securite|surveillance)|\bads\b"),
}

_NUMBER_WORDS = {
    "un": 1,
    "une": 1,
    "deux": 2,
    "trois": 3,
    "quatre": 4,
    "cinq": 5,
    "six": 6,
    "sept": 7,
    "huit": 8,
    "neuf": 9,
    "dix": 10,
}
_NUM = r"(\d+(?:[.,]\d+)?|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)"
_QTY_HEADER = re.compile(r"quantit|qte|nombre|\bnb\b|effectif|nbre")


def _to_number(raw: str) -> float | None:
    raw = raw.strip().lower()
    if raw in _NUMBER_WORDS:
        return float(_NUMBER_WORDS[raw])
    try:
        return float(raw.replace(",", "."))
    except ValueError:
        return None


def _fmt(q: float) -> str:
    return str(int(q)) if q == int(q) else f"{q:g}"


def _matches(text: str) -> list[tuple[str, re.Match[str]]]:
    """Qualifications présentes ; ADS ignoré si le passage parle déjà de SSIAP."""
    folded = fold(text)
    found: list[tuple[str, re.Match[str]]] = []
    for key, (_label, pattern) in QUALIFICATIONS.items():
        for m in re.finditer(pattern, folded):
            if key == "AGENT_SECURITE" and re.search(r"ssiap", folded[max(0, m.start() - 30) : m.end() + 30]):
                continue
            found.append((key, m))
    return found


def _quantity_near(folded: str, match: re.Match[str]) -> float | None:
    before = folded[max(0, match.start() - 40) : match.start()]
    after = folded[match.end() : match.end() + 25]
    m_before = re.search(
        _NUM + r"\s+(?:agents?|postes?|personnes?)?\s*(?:de\s+)?(?:qualifies?\s+)?(?:[\w']+\s+){0,3}$", before
    )
    if m_before:
        return _to_number(m_before.group(1))
    m_after = re.match(r"\s*(?:\)|\]|:|=|x|\u00d7|-)?\s*" + _NUM + r"\b", after)
    if m_after:
        return _to_number(m_after.group(1))
    return None


def _requirement(
    doc: NormalizedDocument, key: str, quantity: float, source: SourceRef, text: str
) -> Requirement:
    label = QUALIFICATIONS[key][0]
    return Requirement(
        id=stable_id(
            "req", doc.document_id, key, source.page, source.sheet, source.cell, source.block_id, quantity
        ),
        type="staffing",
        key=key,
        label=label,
        value=f"{_fmt(quantity)} x {label}",
        quantity=quantity,
        unit="agent",
        source=with_excerpt(source, text),
    )


def _from_text(unit: TextUnit) -> list[Requirement]:
    folded = fold(unit.text)
    out = []
    for key, match in _matches(unit.text):
        quantity = _quantity_near(folded, match)
        if quantity is not None and quantity > 0:
            out.append(_requirement(unit.doc, key, quantity, unit.source, unit.text))
    return out


def _from_tables(doc: NormalizedDocument) -> list[Requirement]:
    out: list[Requirement] = []
    for table in doc.tables:
        rows = table.rows()
        if not rows:
            continue
        header = rows[0]
        qty_cols = {c.col for c in header if _QTY_HEADER.search(fold(c.text))}
        body = rows[1:] if (qty_cols or any(c.is_header for c in header)) else rows
        for row in body:
            row_text = " | ".join(c.text for c in row)
            for key, _m in _matches(row_text):
                candidates = [c for c in row if c.col in qty_cols] or [c for c in row if not _matches(c.text)]
                for cell in candidates:
                    quantity = _to_number(cell.text)
                    if quantity is not None and quantity > 0:
                        out.append(_requirement(doc, key, quantity, cell.source, row_text))
                        break
                break  # une qualification par ligne de tableau
    return out


def extract_requirements(doc: NormalizedDocument) -> list[Requirement]:
    reqs = [r for unit in iter_units(doc) if not unit.cells for r in _from_text(unit)]
    reqs.extend(_from_tables(doc))
    seen: set[str] = set()
    unique = []
    for r in reqs:
        if r.id not in seen:
            seen.add(r.id)
            unique.append(r)
    return unique
