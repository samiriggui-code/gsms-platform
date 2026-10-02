"""Validation des findings contre le contrat partagé ``shared/contracts/finding.schema.json``.

Fail-soft : si ``jsonschema`` ou le fichier de contrat est absent, on retombe sur une vérification
minimale des champs requis (et on le signale dans les logs)."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

SCHEMA_RELATIVE = Path("shared/contracts/finding.schema.json")
FALLBACK_REQUIRED = (
    "version",
    "id",
    "source",
    "category",
    "status",
    "client_id",
    "control_ref",
    "title",
    "created_at",
)


def find_schema_path(contracts_dir: Path | None = None) -> Path | None:
    if contracts_dir is not None:
        p = Path(contracts_dir) / SCHEMA_RELATIVE.name
        return p if p.is_file() else None
    for parent in Path(__file__).resolve().parents:
        candidate = parent / SCHEMA_RELATIVE
        if candidate.is_file():
            return candidate
    return None


@lru_cache(maxsize=4)
def _load_validator(schema_path: str | None) -> Any:
    if schema_path is None:
        log.warning("finding.schema.json introuvable : validation minimale")
        return None
    try:
        import jsonschema
    except ImportError:
        log.warning("jsonschema non installé : validation minimale")
        return None
    schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
    cls = jsonschema.validators.validator_for(schema)
    return cls(schema, format_checker=cls.FORMAT_CHECKER)


@dataclass
class NormalizationResult:
    valid: list[dict[str, Any]] = field(default_factory=list)
    rejected: list[tuple[dict[str, Any], list[str]]] = field(default_factory=list)
    strict: bool = True


class FindingNormalizer:
    def __init__(self, contracts_dir: Path | None = None) -> None:
        path = find_schema_path(contracts_dir)
        self.validator = _load_validator(str(path) if path else None)

    @property
    def strict(self) -> bool:
        return self.validator is not None

    def errors(self, finding: Any) -> list[str]:
        if not isinstance(finding, dict):
            return ["finding doit être un objet"]
        if self.validator is not None:
            return sorted(
                f"{'/'.join(map(str, e.absolute_path)) or '<racine>'}: {e.message}"
                for e in self.validator.iter_errors(finding)
            )
        return [f"{k}: champ requis" for k in FALLBACK_REQUIRED if k not in finding]

    def normalize(self, findings: list[Any]) -> NormalizationResult:
        out = NormalizationResult(strict=self.strict)
        for f in findings:
            errs = self.errors(f)
            if errs:
                log.warning("finding rejeté %s : %s", f.get("id") if isinstance(f, dict) else "?", errs)
                out.rejected.append((f, errs))
            else:
                out.valid.append(f)
        return out
