"""Complétude d'un dossier : calcul déterministe (le code calcule, cf. Annexe C)."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from gsms_core.missions.models import MissionType

# Modèles par défaut (taxonomie FR §15), utilisés si aucun DossierTemplate n'est en base.
DEFAULT_TEMPLATES: dict[MissionType, tuple[str, list[str]]] = {
    MissionType.COMMISSION_SECURITE: (
        "commission_securite_erp",
        [
            "registre_securite",
            "notice_securite",
            "pv_commission_precedente",
            "plan_evacuation",
            "plan_intervention",
            "rapport_verification_electrique",
            "rapport_verification_ssi",
            "rapport_verification_desenfumage",
            "rapport_verification_extincteurs",
            "contrat_maintenance_ssi",
            "consignes_securite",
        ],
    ),
    MissionType.AUDIT: (
        "audit_surete_site",
        ["procedure_surete", "contrat_gardiennage", "carte_professionnelle_cnaps", "plan_site"],
    ),
    MissionType.APPEL_OFFRES: (
        "dossier_appel_offres",
        ["rc", "cctp", "ccap", "ae", "bpu", "dc1", "dc2", "attestations"],
    ),
}


@dataclass(frozen=True)
class Completeness:
    template_code: str | None
    required: list[str]
    present: list[str]
    missing: list[str]

    @property
    def ratio(self) -> float:
        return 1.0 if not self.required else round(len(self.present) / len(self.required), 4)


def compute_completeness(
    template_code: str | None, required_doc_types: Iterable[str], document_types: Iterable[str | None]
) -> Completeness:
    """``document_types`` : types des documents (non archivés) de la mission. Ordre du modèle conservé."""
    required = list(dict.fromkeys(required_doc_types))
    available = {t for t in document_types if t}
    present = [t for t in required if t in available]
    missing = [t for t in required if t not in available]
    return Completeness(template_code, required, present, missing)
