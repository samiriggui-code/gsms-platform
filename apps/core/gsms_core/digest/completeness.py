"""Informations manquantes : pièces attendues pour le type d'engagement, échéances indispensables."""

from __future__ import annotations

from gsms_core.digest.schemas import Deadline, DigestDocument, MissingInformation
from gsms_core.documents.dossier import DEFAULT_TEMPLATES
from gsms_core.missions.models import MissionType

# Pièces du DCE attendues pour un appel d'offres (alternatives regroupées dans un même tuple).
# DC1/DC2/attestations sont des pièces du candidat : elles relèvent de la réponse, pas du DCE reçu.
EXPECTED_BY_TYPE: dict[MissionType, tuple[tuple[str, ...], ...]] = {
    MissionType.APPEL_OFFRES: (("rc",), ("cctp",), ("ccap",), ("ae",), ("bpu", "dpgf", "dqe")),
}

_LABELS = {
    "rc": "Règlement de consultation (RC)",
    "cctp": "CCTP",
    "ccap": "CCAP",
    "ae": "Acte d'engagement (AE)",
    "bpu": "Bordereau de prix (BPU)",
    "dpgf": "DPGF",
    "dqe": "DQE",
}


def expected_documents(mission_type: MissionType | None) -> tuple[tuple[str, ...], ...]:
    if mission_type is None:
        return ()
    if mission_type in EXPECTED_BY_TYPE:
        return EXPECTED_BY_TYPE[mission_type]
    template = DEFAULT_TEMPLATES.get(mission_type)
    return tuple((t,) for t in template[1]) if template else ()


def detect_missing(
    documents: list[DigestDocument], deadlines: list[Deadline], mission_type: MissionType | None
) -> list[MissingInformation]:
    present = {d.business_type for d in documents}
    missing: list[MissingInformation] = []
    for alternatives in expected_documents(mission_type):
        if not present.intersection(alternatives):
            label = " ou ".join(_LABELS.get(a, a) for a in alternatives)
            missing.append(
                MissingInformation(
                    code="MISSING_DOCUMENT",
                    key="|".join(alternatives),
                    message=f"Pièce attendue absente du dossier : {label}.",
                )
            )
    if (
        mission_type == MissionType.APPEL_OFFRES
        and documents
        and not any(d.kind == "remise_offres" for d in deadlines)
    ):
        missing.append(
            MissingInformation(
                code="MISSING_DEADLINE",
                key="remise_offres",
                message="Date limite de remise des offres introuvable dans les pièces.",
            )
        )
    return missing
