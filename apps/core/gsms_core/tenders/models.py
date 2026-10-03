from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk, str_enum


class GoNoGo(enum.StrEnum):
    PENDING = "PENDING"
    GO = "GO"
    NO_GO = "NO_GO"


class DossierStatus(enum.StrEnum):
    """Cycle de vie du dossier de réponse ; chaque passage est une décision humaine tracée."""

    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    READY = "READY"
    APPROVED = "APPROVED"
    SUBMITTED = "SUBMITTED"


class TenderCase(UUIDPk, Timestamped, Base):
    """Dossier d'appel d'offres porté par une mission APPEL_OFFRES. TenderAI garde le contenu RFP."""

    __tablename__ = "tender_case"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    mission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mission_mission.id"), unique=True)
    title: Mapped[str] = mapped_column(String(300))
    buyer: Mapped[str | None] = mapped_column(String(300))
    # Référence de la consultation chez l'acheteur (numéro de marché, identifiant de la plateforme).
    consultation_ref: Mapped[str | None] = mapped_column(String(120))
    submission_deadline: Mapped[datetime | None] = mapped_column()
    tenderai_rfp_uri: Mapped[str | None] = mapped_column(String(300))
    lexsocket_uri: Mapped[str | None] = mapped_column(String(300))
    criteria: Mapped[list[dict[str, Any]]] = mapped_column(default=list)
    score: Mapped[float | None] = mapped_column(Float)
    recommendation: Mapped[GoNoGo] = mapped_column(str_enum(GoNoGo), default=GoNoGo.PENDING)
    decision: Mapped[GoNoGo] = mapped_column(str_enum(GoNoGo), default=GoNoGo.PENDING)
    decided_by: Mapped[str | None] = mapped_column(String(200))
    decided_at: Mapped[datetime | None] = mapped_column()
    rationale: Mapped[str | None] = mapped_column(Text)
    status: Mapped[DossierStatus] = mapped_column(str_enum(DossierStatus), default=DossierStatus.DRAFT)


class TenderStatusChange(UUIDPk, Timestamped, Base):
    """Historique des changements de statut du dossier (qui, quand, pourquoi). Jamais modifié."""

    __tablename__ = "tender_status_change"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tender_case.id"), index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    from_status: Mapped[DossierStatus] = mapped_column(str_enum(DossierStatus))
    to_status: Mapped[DossierStatus] = mapped_column(str_enum(DossierStatus))
    actor: Mapped[str] = mapped_column(String(200))
    comment: Mapped[str | None] = mapped_column(Text)


class RequirementStatus(enum.StrEnum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    COVERED = "COVERED"
    PARTIAL = "PARTIAL"
    BLOCKED = "BLOCKED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class TenderRequirement(UUIDPk, Timestamped, Base):
    """Ligne de la matrice de conformité : colonne vertébrale du dossier de réponse.

    Les lignes ``digest`` viennent du DCE (clé stable du Digest) ; leurs champs humains (réponse prévue,
    preuve, document cible, responsable, statut) ne sont jamais écrasés par une nouvelle analyse. Une
    exigence disparue du DCE (rectificatif) est marquée ``stale`` au lieu d'être supprimée.
    """

    __tablename__ = "tender_requirement"
    __table_args__ = (
        UniqueConstraint("case_id", "code", name="uq_tender_requirement_code"),
        UniqueConstraint("case_id", "digest_key", name="uq_tender_requirement_digest_key"),
    )

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tender_case.id"), index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    code: Mapped[str] = mapped_column(String(16))  # REQ-001…
    origin: Mapped[str] = mapped_column(String(16), default="digest")  # digest | manual
    digest_key: Mapped[str | None] = mapped_column(String(64))
    type: Mapped[str] = mapped_column(String(40))
    text: Mapped[str] = mapped_column(Text)
    mandatory: Mapped[bool] = mapped_column(default=True)
    source: Mapped[dict[str, Any] | None] = mapped_column()
    source_label: Mapped[str | None] = mapped_column(String(300))
    planned_response: Mapped[str | None] = mapped_column(Text)
    evidence: Mapped[str | None] = mapped_column(Text)
    target_document: Mapped[str | None] = mapped_column(String(20))
    owner: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[RequirementStatus] = mapped_column(
        str_enum(RequirementStatus), default=RequirementStatus.TODO
    )
    stale: Mapped[bool] = mapped_column(default=False)
    updated_by: Mapped[str | None] = mapped_column(String(200))
    updated_at: Mapped[datetime | None] = mapped_column()
