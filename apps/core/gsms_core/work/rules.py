"""Règles déterministes de remédiation (le code calcule, l'agent explique — Annexe C)."""

from __future__ import annotations

from datetime import datetime, timedelta

from gsms_core.work.models import SEVERITY_RANK, Severity

DUE_DAYS: dict[Severity, int] = {Severity.CRITICAL: 7, Severity.MAJOR: 30, Severity.MINOR: 90}

# Vocabulaire du contrat finding.schema.json (FR) → sévérité Core.
_ALIASES = {
    "critique": Severity.CRITICAL,
    "critical": Severity.CRITICAL,
    "majeure": Severity.MAJOR,
    "majeur": Severity.MAJOR,
    "major": Severity.MAJOR,
    "high": Severity.MAJOR,
    "mineure": Severity.MINOR,
    "mineur": Severity.MINOR,
    "minor": Severity.MINOR,
    "medium": Severity.MINOR,
    "low": Severity.MINOR,
    "information": Severity.INFO,
    "info": Severity.INFO,
}


def normalize_severity(value: str | None) -> Severity:
    if not value:
        return Severity.INFO
    return _ALIASES.get(value.strip().lower(), Severity.INFO)


def meets_threshold(severity: Severity, threshold: Severity) -> bool:
    return severity != Severity.INFO and SEVERITY_RANK[severity] >= SEVERITY_RANK[threshold]


def due_date_for(severity: Severity, from_: datetime) -> datetime:
    if severity not in DUE_DAYS:
        raise ValueError(f"pas d'échéance pour la sévérité {severity}")
    return from_ + timedelta(days=DUE_DAYS[severity])


def capa_required(severity: Severity, *, explicit: bool = False, recurrence: bool = False) -> bool:
    """CAPA requise : sévérité critique, récurrence, ou demande explicite (client)."""
    return severity == Severity.CRITICAL or explicit or recurrence
