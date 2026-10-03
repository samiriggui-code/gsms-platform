"""ApplicationRegistry — capacités des apps spécialisées sous autorité Core.

Trois natures distinctes :
- ``business`` : application métier liée à un workspace par binding (DocuLens, Tender, GRACE…) ;
- ``engine`` : moteur technique sans métier, appelé par le Core via un adapter (Docling) — jamais
  lié à un workspace, jamais appelé par un frontend ;
- les capacités propres au Core (``CORE_CAPABILITIES``), dont le Digest.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class ApplicationKind(StrEnum):
    BUSINESS = "business"
    ENGINE = "engine"


class ApplicationId(StrEnum):
    DOCULENS = "doculens"
    DOCLING = "docling"
    TENDER = "tender"
    GRACE = "grace"
    QATRIAL = "qatrial"
    CAMP_AI = "camp_ai"
    INTAKE = "intake"


@dataclass(frozen=True)
class ApplicationSpec:
    id: ApplicationId
    label: str
    role: str
    capabilities: tuple[str, ...]
    kind: ApplicationKind = ApplicationKind.BUSINESS

    @property
    def bindable(self) -> bool:
        """Seules les applications métier se lient à un workspace."""
        return self.kind == ApplicationKind.BUSINESS


APPLICATION_REGISTRY: dict[ApplicationId, ApplicationSpec] = {
    ApplicationId.DOCULENS: ApplicationSpec(
        id=ApplicationId.DOCULENS,
        label="DocuLens",
        role="interface documentaire (dépôt, consultation, recherche)",
        capabilities=(
            "document_upload",
            "document_view",
            "document_search",
            "document_navigation",
            "document_provenance",
        ),
    ),
    ApplicationId.DOCLING: ApplicationSpec(
        id=ApplicationId.DOCLING,
        label="Docling",
        role="moteur technique de parsing (via DoclingAdapter du Core)",
        kind=ApplicationKind.ENGINE,
        capabilities=(
            "parse_pdf",
            "parse_docx",
            "parse_xlsx",
            "parse_pptx",
            "ocr",
            "extract_tables",
            "extract_layout",
        ),
    ),
    ApplicationId.TENDER: ApplicationSpec(
        id=ApplicationId.TENDER,
        label="Tender MCP",
        role="moteur appel d'offres",
        capabilities=(
            "tender_ingestion",
            "tender_analysis",
            "requirement_matrix",
            "compliance_matrix",
            "bpu",
            "dpgf",
            "dqe",
            "technical_response",
            "staffing_plan",
            "prevention_plan",
            "appendices",
            "submission_checklist",
        ),
    ),
    ApplicationId.GRACE: ApplicationSpec(
        id=ApplicationId.GRACE,
        label="GRACE",
        role="moteur audit / sécurité",
        capabilities=(
            "security_audit",
            "risk_assessment",
            "observations",
            "recommendations",
            "safety_analysis",
            "physical_security",
            "regulatory_findings",
        ),
    ),
    ApplicationId.QATRIAL: ApplicationSpec(
        id=ApplicationId.QATRIAL,
        label="QATrial",
        role="moteur conformité / contrôle",
        capabilities=(
            "compliance_check",
            "quality_control",
            "capa",
            "evidence_validation",
            "requirements_tracking",
            "corrective_actions",
        ),
    ),
    ApplicationId.CAMP_AI: ApplicationSpec(
        id=ApplicationId.CAMP_AI,
        label="CRM Camp AI / Eve",
        role="CRM + agents + suivi relationnel",
        capabilities=(
            "crm",
            "client_management",
            "contact_management",
            "lead_management",
            "opportunity_management",
            "interaction_history",
            "activity_tracking",
            "task_management",
            "reminders",
            "commercial_follow_up",
            "engagement_follow_up",
            "relationship_context",
            "email_assistance",
            "meeting_preparation",
            "next_best_action",
            "ai_agents",
            "autonomous_agents",
            "workflow_actions",
            "deadline_follow_up",
        ),
    ),
    ApplicationId.INTAKE: ApplicationSpec(
        id=ApplicationId.INTAKE,
        label="Intake",
        role="entrée commerciale / brief mission",
        capabilities=("intake", "brief_capture", "lead_routing"),
    ),
}


# Capacités du Core lui-même (pas une application) : le Digest appartient au Core.
CORE_CAPABILITIES: dict[str, tuple[str, ...]] = {
    "core_digest": (
        "classify_business_document",
        "extract_requirements",
        "extract_obligations",
        "reconcile_documents",
        "detect_conflicts",
        "detect_missing_information",
        "produce_workspace_digest",
    ),
}


def get_application(app_id: ApplicationId | str) -> ApplicationSpec:
    key = ApplicationId(app_id) if not isinstance(app_id, ApplicationId) else app_id
    return APPLICATION_REGISTRY[key]
