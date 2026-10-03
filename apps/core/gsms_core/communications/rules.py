"""Catalogue des règles de relance (``rules/standard.yaml``), validé au chargement (repris de Qualiopi)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field, model_validator

RULES_DIR = Path(__file__).parent / "rules"
WEEKDAYS = {"lundi": 0, "mardi": 1, "mercredi": 2, "jeudi": 3, "vendredi": 4, "samedi": 5, "dimanche": 6}
CONDITIONS = frozenset(
    {"pieces_manquantes", "echeance_remise_offres", "conflit_ouvert", "depot_client", "toujours"}
)


class Rule(BaseModel):
    cle: str
    libelle: str
    portee: Literal["PRESTATION", "ECHEANCE", "CONFLIT", "DEPOT", "HEBDO"]
    destinataire: Literal["CLIENT", "EQUIPE", "ADMIN"]
    condition: str
    modele: str
    externe: bool = False
    decalages: list[int] = Field(default_factory=list)
    frequence_jours: int | None = None
    jour: str | None = None

    @model_validator(mode="after")
    def coherent(self) -> Rule:
        if self.portee == "ECHEANCE" and not self.decalages:
            raise ValueError(f"{self.cle} : décalages obligatoires")
        if self.portee == "HEBDO" and self.jour not in WEEKDAYS:
            raise ValueError(f"{self.cle} : jour de la semaine attendu ({', '.join(WEEKDAYS)})")
        if self.portee == "PRESTATION" and not self.frequence_jours:
            raise ValueError(f"{self.cle} : fréquence obligatoire")
        if self.externe and self.destinataire != "CLIENT":
            raise ValueError(f"{self.cle} : seuls les messages aux clients sont externes")
        return self


@lru_cache
def load_rules(name: str = "standard") -> tuple[Rule, ...]:
    from gsms_core.communications.templates import TEMPLATES

    raw = yaml.safe_load((RULES_DIR / f"{name}.yaml").read_text(encoding="utf-8"))
    rules = tuple(Rule(**r) for r in raw["regles"])
    keys = [r.cle for r in rules]
    if len(keys) != len(set(keys)):
        raise ValueError("règles de relance : clé en double")
    for r in rules:
        if r.condition not in CONDITIONS:
            raise ValueError(f"{r.cle} : condition inconnue {r.condition}")
        if r.modele not in TEMPLATES:
            raise ValueError(f"{r.cle} : modèle inconnu {r.modele}")
    return rules


def find_rule(key: str) -> Rule | None:
    return next((r for r in load_rules() if r.cle == key), None)
