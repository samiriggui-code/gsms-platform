"""Réconciliation multi-document : regroupe les faits de même nature venant de pièces différentes
(une qualification, un type d'échéance) pour pouvoir les comparer."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field

from gsms_core.digest.schemas import Deadline, Requirement


@dataclass
class ReconciledFact:
    key: str
    # valeur normalisée → éléments qui l'affirment (avec leur source)
    values: dict[str, list[Requirement | Deadline]] = field(default_factory=lambda: defaultdict(list))

    @property
    def is_consistent(self) -> bool:
        return len(self.values) <= 1


def reconcile_requirements(requirements: list[Requirement]) -> dict[str, ReconciledFact]:
    facts: dict[str, ReconciledFact] = {}
    for req in requirements:
        if req.quantity is None:
            continue
        fact = facts.setdefault(f"{req.type}:{req.key}", ReconciledFact(key=req.key))
        fact.values[f"{req.quantity:g}"].append(req)
    return facts


def reconcile_deadlines(deadlines: list[Deadline]) -> dict[str, ReconciledFact]:
    facts: dict[str, ReconciledFact] = {}
    for dl in deadlines:
        if dl.kind == "autre":
            continue
        fact = facts.setdefault(dl.kind, ReconciledFact(key=dl.kind))
        fact.values[dl.due_date.isoformat()].append(dl)
    return facts
