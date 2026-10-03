"""Livrables / pièces à produire par le prestataire ou le candidat."""

from __future__ import annotations

import re

from gsms_core.digest.classifier import fold
from gsms_core.digest.provenance import iter_units, stable_id, with_excerpt
from gsms_core.digest.schemas import Deliverable
from gsms_core.documents.parsers.schemas import BlockKind, NormalizedDocument

_SECTION = re.compile(
    r"pieces? (a fournir|a remettre|a joindre|constitutives)"
    r"|contenu (de l.offre|du dossier)|documents? a (produire|fournir)|livrables?"
)
_SENTENCE = re.compile(
    r"\b(a fournir|a remettre|a joindre|a produire"
    r"|le (candidat|titulaire|prestataire) (fournira|remettra|produira|transmettra))\b"
)


def extract_deliverables(doc: NormalizedDocument) -> list[Deliverable]:
    out: list[Deliverable] = []
    blocks_by_id = {b.id: b for b in doc.blocks}
    for unit in iter_units(doc):
        if unit.cells:
            continue
        folded = fold(unit.text)
        block = blocks_by_id.get(unit.source.block_id or "")
        if block is not None and block.kind in (BlockKind.TITLE, BlockKind.HEADING):
            continue  # « Pièces à fournir » est le titre de la liste, pas une pièce
        in_section = bool(unit.source.section and _SECTION.search(fold(unit.source.section)))
        is_list_item = block is not None and block.kind == BlockKind.LIST_ITEM
        if (in_section and is_list_item) or _SENTENCE.search(folded):
            label = unit.text.strip().lstrip("-•· ").rstrip(" ;.")
            if 3 <= len(label) <= 300:
                out.append(
                    Deliverable(
                        id=stable_id("dlv", doc.document_id, unit.source.block_id, label),
                        label=label,
                        source=with_excerpt(unit.source, unit.text),
                    )
                )
    return out
