"""Détection de contradictions entre pièces d'un même dossier (ex. CCTP 2 SSIAP1 / BPU 1 SSIAP1)."""

from __future__ import annotations

from gsms_core.digest.reconciliation import reconcile_deadlines, reconcile_requirements
from gsms_core.digest.schemas import Conflict, ConflictValue, Deadline, Requirement

STAFFING_QUANTITY_MISMATCH = "STAFFING_QUANTITY_MISMATCH"
DEADLINE_MISMATCH = "DEADLINE_MISMATCH"


def detect_conflicts(requirements: list[Requirement], deadlines: list[Deadline]) -> list[Conflict]:
    conflicts: list[Conflict] = []
    for fact in reconcile_requirements(requirements).values():
        if fact.is_consistent:
            continue
        values = [
            ConflictValue(value=f"{qty} x {item.label}", source=item.source)
            for qty, items in sorted(fact.values.items())
            for item in items
        ]
        label = next(iter(fact.values.values()))[0].label
        detail = ", ".join(f"{v.value} ({v.source.filename})" for v in values)
        conflicts.append(
            Conflict(
                code=STAFFING_QUANTITY_MISMATCH,
                key=fact.key,
                message=f"Effectif « {label} » divergent entre les pièces : {detail}.",
                values=values,
            )
        )
    for fact in reconcile_deadlines(deadlines).values():
        if fact.is_consistent:
            continue
        values = [
            ConflictValue(value=day, source=item.source)
            for day, items in sorted(fact.values.items())
            for item in items
        ]
        label = next(iter(fact.values.values()))[0].label
        detail = ", ".join(f"{v.value} ({v.source.filename})" for v in values)
        conflicts.append(
            Conflict(
                code=DEADLINE_MISMATCH,
                key=fact.key,
                message=f"Date « {label} » divergente entre les pièces : {detail}.",
                values=values,
            )
        )
    return conflicts
