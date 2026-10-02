"""Score Go/No-Go déterministe (Annexe C : calculé en Python ; Eve explique, l'humain décide)."""

from __future__ import annotations

from dataclasses import dataclass

from gsms_core.tenders.models import GoNoGo

MAX_SCORE = 5.0
DEFAULT_GO_THRESHOLD = 60.0


@dataclass(frozen=True)
class Criterion:
    code: str
    weight: float
    score: float  # 0..5
    eliminatory: bool = False  # un critère éliminatoire noté 0 force NO_GO

    def __post_init__(self) -> None:
        if self.weight < 0:
            raise ValueError(f"{self.code}: poids négatif")
        if not 0 <= self.score <= MAX_SCORE:
            raise ValueError(f"{self.code}: note hors [0, {MAX_SCORE}]")


@dataclass(frozen=True)
class ScoreResult:
    score: float  # 0..100
    recommendation: GoNoGo
    blocking: list[str]


def compute_score(criteria: list[Criterion]) -> float:
    total_weight = sum(c.weight for c in criteria)
    if total_weight == 0:
        return 0.0
    weighted = sum(c.weight * c.score for c in criteria)
    return round(100.0 * weighted / (total_weight * MAX_SCORE), 2)


def evaluate(criteria: list[Criterion], go_threshold: float = DEFAULT_GO_THRESHOLD) -> ScoreResult:
    score = compute_score(criteria)
    blocking = [c.code for c in criteria if c.eliminatory and c.score == 0]
    rec = GoNoGo.GO if score >= go_threshold and not blocking else GoNoGo.NO_GO
    return ScoreResult(score=score, recommendation=rec, blocking=blocking)
