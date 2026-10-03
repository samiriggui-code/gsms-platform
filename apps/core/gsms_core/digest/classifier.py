"""Classification métier déterministe d'une pièce (nom de fichier + titres) — le code calcule."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from gsms_core.documents.parsers.schemas import BlockKind, NormalizedDocument


def fold(text: str) -> str:
    """Minuscules sans accents, pour des règles robustes aux variantes typographiques."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


# (type métier, motifs nom de fichier, motifs de titre) — ordre = priorité.
_RULES: tuple[tuple[str, tuple[str, ...], tuple[str, ...]], ...] = (
    (
        "rc",
        (r"\brc\b", r"reglement[ _-]?(de[ _-]?la[ _-]?)?consultation"),
        (r"reglement de (la )?consultation",),
    ),
    ("cctp", (r"\bcctp\b",), (r"cahier des clauses techniques particulieres",)),
    ("ccap", (r"\bccap\b",), (r"cahier des clauses administratives particulieres",)),
    ("ae", (r"\bae\b", r"acte[ _-]?d[ _-]?engagement", r"\battri1\b"), (r"acte d.engagement",)),
    ("bpu", (r"\bbpu\b", r"bordereau[ _-]?(des[ _-]?)?prix"), (r"bordereau des prix unitaires",)),
    ("dpgf", (r"\bdpgf\b",), (r"decomposition du prix global",)),
    ("dqe", (r"\bdqe\b",), (r"detail quantitatif estimatif",)),
    ("dc1", (r"\bdc1\b",), (r"lettre de candidature",)),
    ("dc2", (r"\bdc2\b",), (r"declaration du candidat",)),
    ("memoire_technique", (r"memoire[ _-]?technique", r"\bmemoire\b"), (r"memoire technique",)),
    ("registre_securite", (r"registre[ _-]?(de[ _-]?)?securite",), (r"registre de securite",)),
    (
        "pv_commission_precedente",
        (r"\bpv\b.*commission", r"proces[ _-]?verbal"),
        (r"proces.verbal.*commission",),
    ),
    ("notice_securite", (r"notice[ _-]?(de[ _-]?)?securite",), (r"notice de securite",)),
    ("plan_evacuation", (r"plan[ _-]?(d[ _-]?)?evacuation",), (r"plan d.evacuation",)),
    ("contrat_maintenance_ssi", (r"contrat.*maintenance",), (r"contrat de maintenance",)),
)


@dataclass(frozen=True)
class Classification:
    business_type: str
    confidence: float
    reason: str


def classify(doc: NormalizedDocument) -> Classification:
    name = fold(Path(doc.filename).stem.replace(".", " "))
    for business_type, name_patterns, _ in _RULES:
        for pattern in name_patterns:
            if re.search(pattern, name):
                return Classification(business_type, 0.9, f"nom de fichier : « {doc.filename} »")
    headings = [fold(b.text) for b in doc.blocks if b.kind in (BlockKind.TITLE, BlockKind.HEADING)][:10]
    for business_type, _, title_patterns in _RULES:
        for pattern in title_patterns:
            for heading in headings:
                if re.search(pattern, heading):
                    return Classification(business_type, 0.75, f"titre : « {heading[:80]} »")
    return Classification("autre", 0.0, "aucune règle ne correspond")
