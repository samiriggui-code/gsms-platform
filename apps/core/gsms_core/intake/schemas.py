"""Schémas Pydantic de l'intake public (alignés sur ``apps/web`` POST /api/intake)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

IntakeType = Literal["audit", "ao", "contact"]


class IntakeIn(BaseModel):
    type: IntakeType = "audit"
    firstName: str = Field(min_length=1, max_length=120)
    lastName: str | None = Field(default=None, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    phone: str | None = Field(default=None, max_length=40)
    companyName: str | None = Field(default=None, max_length=200)
    title: str | None = Field(default=None, max_length=300)
    subject: str | None = Field(default=None, max_length=300)
    message: str | None = Field(default=None, max_length=5000)
    etablissement: str | None = Field(default=None, max_length=80)
    echeanceCommission: str | None = Field(default=None, max_length=80)
    referenceAo: str | None = Field(default=None, max_length=120)
    cta: str | None = Field(default=None, max_length=80)
    offer: str | None = Field(default=None, max_length=80)
    source: str | None = Field(default=None, max_length=40)

    @field_validator("email")
    @classmethod
    def _email_shape(cls, value: str) -> str:
        cleaned = value.strip()
        if "@" not in cleaned or "." not in cleaned.split("@")[-1]:
            raise ValueError("Adresse e-mail invalide")
        return cleaned


class IntakeOut(BaseModel):
    id: str
    status: str
    mission_id: str | None = None
    workspace_id: str | None = None
