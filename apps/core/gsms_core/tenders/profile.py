"""Profil GSMS pour les appels d'offres : ce que la société peut engager (agrément, effectifs…).

Saisi dans le portail (paramètres), stocké en réglage plateforme, lu par l'analyse de faisabilité. Aucune
valeur métier n'est inventée : un champ vide est signalé comme « à renseigner » dans le GO / NO-GO.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from gsms_core.digest.requirements import QUALIFICATIONS
from gsms_core.platform.models import PlatformSetting
from gsms_core.platform.service import _save

PROFILE_KEY = "tender_profile"


class CompanyProfile(BaseModel):
    raison_sociale: str = Field(default="", max_length=200)
    cnaps_autorisation: str | None = Field(default=None, max_length=60)  # n° d'autorisation d'exercer
    cnaps_validite: date | None = None
    certifications: list[str] = Field(default_factory=list, max_length=30)
    effectifs: dict[str, int] = Field(default_factory=dict)  # qualification → agents mobilisables
    delai_mobilisation_jours: int | None = Field(default=None, ge=0, le=365)
    chiffre_affaires_annuel: float | None = Field(default=None, ge=0)
    reprise_personnel: bool | None = None  # sait reprendre le personnel (avenant 5 CCN 1351)
    sous_traitance: bool | None = None  # peut sous-traiter ou se grouper

    @field_validator("effectifs")
    @classmethod
    def _known_qualifications(cls, value: dict[str, int]) -> dict[str, int]:
        unknown = set(value) - set(QUALIFICATIONS)
        if unknown:
            raise ValueError(f"qualifications inconnues : {', '.join(sorted(unknown))}")
        if any(v < 0 or v > 100000 for v in value.values()):
            raise ValueError("effectif hors limites")
        return value

    @field_validator("certifications")
    @classmethod
    def _clean(cls, value: list[str]) -> list[str]:
        return [c.strip()[:80] for c in value if c and c.strip()]

    def missing_fields(self) -> list[str]:
        missing = []
        if not self.cnaps_autorisation:
            missing.append("autorisation CNAPS")
        if not self.effectifs:
            missing.append("effectifs mobilisables")
        if self.chiffre_affaires_annuel is None:
            missing.append("chiffre d'affaires annuel")
        if self.delai_mobilisation_jours is None:
            missing.append("délai de mobilisation")
        return missing


QUALIFICATION_LABELS = {key: label for key, (label, _) in QUALIFICATIONS.items()}


def load_profile(session: Session) -> tuple[CompanyProfile, dict[str, Any]]:
    row = session.get(PlatformSetting, PROFILE_KEY)
    if row is None:
        return CompanyProfile(), {}
    meta = {"updated_by": row.updated_by, "updated_at": row.updated_at}
    return CompanyProfile.model_validate(row.value or {}), meta


def save_profile(session: Session, profile: CompanyProfile, actor: str) -> datetime:
    row = _save(
        session,
        PROFILE_KEY,
        profile.model_dump(mode="json"),
        secret=None,
        keep_secret=True,
        vault=None,  # type: ignore[arg-type] - aucun secret dans ce réglage
        actor=actor,
    )
    return row.updated_at
