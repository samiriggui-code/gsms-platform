"""Taxonomie documentaire française alignée sur ``apps/core/.../documents/dossier.py``."""

from __future__ import annotations

import uuid as uuid_mod

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.models import DocumentLabel
from app.services.label_service import LabelConflictError, LabelService

# Domaines → (code label, description FR). Les ``label_name`` sont les codes stables
# attendus par le Core (snake_case) ; la description porte le libellé humain.
FR_TAXONOMY: dict[str, list[tuple[str, str]]] = {
    "commission_securite": [
        ("registre_securite", "Registre de sécurité"),
        ("notice_securite", "Notice de sécurité"),
        ("pv_commission_precedente", "PV de commission de sécurité précédent"),
        ("plan_evacuation", "Plan d'évacuation"),
        ("plan_intervention", "Plan d'intervention"),
        ("rapport_verification_electrique", "Rapport de vérification électrique"),
        ("rapport_verification_ssi", "Rapport de vérification SSI"),
        ("rapport_verification_desenfumage", "Rapport de vérification désenfumage"),
        ("rapport_verification_extincteurs", "Rapport de vérification extincteurs"),
        ("contrat_maintenance_ssi", "Contrat de maintenance SSI"),
        ("consignes_securite", "Consignes de sécurité"),
    ],
    "audit_surete": [
        ("procedure_surete", "Procédure de sûreté"),
        ("contrat_gardiennage", "Contrat de gardiennage"),
        ("carte_professionnelle_cnaps", "Carte professionnelle CNAPS"),
        ("plan_site", "Plan de site"),
    ],
    "appel_offres": [
        ("rc", "Règlement de la consultation (RC)"),
        ("cctp", "CCTP"),
        ("ccap", "CCAP"),
        ("ae", "Acte d'engagement (AE)"),
        ("bpu", "BPU / DPGF"),
        ("dc1", "DC1"),
        ("dc2", "DC2"),
        ("attestations", "Attestations (fiscales, sociales, assurances)"),
        ("dce", "Dossier de consultation des entreprises (DCE)"),
        ("memoire_technique", "Mémoire technique"),
    ],
    "autres": [
        ("rapport_audit", "Rapport d'audit"),
        ("pv_reunion", "Procès-verbal de réunion"),
        ("courrier", "Courrier / mise en demeure"),
        ("autre", "Autre pièce"),
    ],
}


def all_fr_label_codes() -> list[str]:
    codes: list[str] = []
    for items in FR_TAXONOMY.values():
        codes.extend(code for code, _ in items)
    return codes


def _find_label(session: Session, name: str) -> DocumentLabel | None:
    return session.execute(
        select(DocumentLabel).where(DocumentLabel.label_name == name).limit(1)
    ).scalar_one_or_none()


def ensure_fr_labels(session: Session, *, workspace_id: str | None = None) -> int:
    """Crée les domaines et labels FR s'ils manquent. Retourne le nombre de labels créés."""
    ws_uuid = uuid_mod.UUID(workspace_id) if workspace_id else None
    service = LabelService(session=session, workspace_id=ws_uuid)
    created = 0
    for domain_code, labels in FR_TAXONOMY.items():
        domain = _find_label(session, domain_code)
        if domain is None:
            try:
                domain = service.create_label(
                    label_name=domain_code,
                    description=f"Domaine {domain_code.replace('_', ' ')}",
                    label_type="domain",
                )
                created += 1
            except LabelConflictError:
                domain = _find_label(session, domain_code)
        if domain is None:
            continue
        if domain.label_type != "domain":
            domain.label_type = "domain"
            session.add(domain)
            session.commit()

        for code, description in labels:
            if _find_label(session, code) is not None:
                continue
            try:
                service.create_label(
                    label_name=code,
                    description=description,
                    parent_label_id=domain.id,
                    label_type="label",
                )
                created += 1
            except LabelConflictError:
                continue
    return created
