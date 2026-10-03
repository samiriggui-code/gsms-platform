"""ServiceCatalog — types de prestations GSMS et apps / étapes de workflow associées.

MissionType Core reste la persistance ; ce catalogue mappe le vocabulaire métier
(engagement types) vers MissionType + apps à attacher.
"""

from __future__ import annotations

from dataclasses import dataclass

from gsms_core.context.applications import ApplicationId
from gsms_core.missions.models import MissionType


@dataclass(frozen=True)
class EngagementTypeSpec:
    id: str
    label: str
    mission_type: MissionType
    applications: tuple[ApplicationId, ...]
    workflow_steps: tuple[str, ...]


SERVICE_CATALOG: dict[str, EngagementTypeSpec] = {
    "tender": EngagementTypeSpec(
        id="tender",
        label="Appel d'offres",
        mission_type=MissionType.APPEL_OFFRES,
        applications=(
            ApplicationId.DOCULENS,
            ApplicationId.TENDER,
            ApplicationId.QATRIAL,
            ApplicationId.CAMP_AI,
            ApplicationId.GRACE,
        ),
        workflow_steps=(
            "ingestion_dce",
            "classification",
            "extraction_exigences",
            "matrice_conformite",
            "production_bpu_dpgf_dqe",
            "memoire_technique",
            "elements_securite",
            "controle_qualite",
            "taches_relances_eve",
            "checklist_finale",
            "export_dossier",
        ),
    ),
    "security_audit": EngagementTypeSpec(
        id="security_audit",
        label="Audit de sûreté",
        mission_type=MissionType.AUDIT,
        applications=(
            ApplicationId.DOCULENS,
            ApplicationId.GRACE,
            ApplicationId.QATRIAL,
            ApplicationId.CAMP_AI,
        ),
        workflow_steps=(
            "brief_site",
            "ingestion_pieces",
            "visite_terrain",
            "constats",
            "recommandations",
            "controle_qualite",
            "livrable",
            "suivi_eve",
        ),
    ),
    "commission_preparation": EngagementTypeSpec(
        id="commission_preparation",
        label="Commission de sécurité",
        mission_type=MissionType.COMMISSION_SECURITE,
        applications=(
            ApplicationId.DOCULENS,
            ApplicationId.GRACE,
            ApplicationId.QATRIAL,
            ApplicationId.CAMP_AI,
        ),
        workflow_steps=(
            "collecte_registre",
            "verification_rapports",
            "plans_evacuation",
            "preparation_commission",
            "accompagnement",
            "suivi_prescriptions",
        ),
    ),
    "document_review": EngagementTypeSpec(
        id="document_review",
        label="Revue documentaire",
        mission_type=MissionType.DOCUMENTATION,
        applications=(ApplicationId.DOCULENS, ApplicationId.QATRIAL, ApplicationId.CAMP_AI),
        workflow_steps=("ingestion", "classification", "revue", "livrable"),
    ),
    "compliance": EngagementTypeSpec(
        id="compliance",
        label="Conformité",
        mission_type=MissionType.CONFORMITE,
        applications=(ApplicationId.DOCULENS, ApplicationId.QATRIAL, ApplicationId.CAMP_AI),
        workflow_steps=("cadrage", "controles", "capa", "cloture"),
    ),
    "consulting": EngagementTypeSpec(
        id="consulting",
        label="Accompagnement",
        mission_type=MissionType.ACCOMPAGNEMENT,
        applications=(ApplicationId.DOCULENS, ApplicationId.CAMP_AI, ApplicationId.GRACE),
        workflow_steps=("cadrage", "accompagnement", "livrable", "suivi"),
    ),
    "training": EngagementTypeSpec(
        id="training",
        label="Formation (renvoi gsms-school)",
        mission_type=MissionType.AUTRE,
        applications=(ApplicationId.CAMP_AI, ApplicationId.INTAKE),
        workflow_steps=("orientation_school",),
    ),
    "risk_assessment": EngagementTypeSpec(
        id="risk_assessment",
        label="Évaluation des risques",
        mission_type=MissionType.AUDIT,
        applications=(ApplicationId.GRACE, ApplicationId.DOCULENS, ApplicationId.CAMP_AI),
        workflow_steps=("cadrage", "analyse", "rapport", "suivi"),
    ),
    "preventive_plan": EngagementTypeSpec(
        id="preventive_plan",
        label="Plan de prévention",
        mission_type=MissionType.DOCUMENTATION,
        applications=(ApplicationId.DOCULENS, ApplicationId.GRACE, ApplicationId.CAMP_AI),
        workflow_steps=("collecte", "redaction", "validation", "diffusion"),
    ),
    "incident_analysis": EngagementTypeSpec(
        id="incident_analysis",
        label="Analyse d'incident",
        mission_type=MissionType.AUTRE,
        applications=(ApplicationId.GRACE, ApplicationId.QATRIAL, ApplicationId.CAMP_AI),
        workflow_steps=("collecte", "analyse", "actions", "cloture"),
    ),
}


def resolve_engagement_type(type_id: str) -> EngagementTypeSpec:
    try:
        return SERVICE_CATALOG[type_id]
    except KeyError as exc:
        raise KeyError(f"type de prestation inconnu: {type_id}") from exc
