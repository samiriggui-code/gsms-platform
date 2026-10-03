"""Document classification via the configured LLM provider (OpenAI / Anthropic / OpenRouter)."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import List, Optional, Sequence

from pydantic import BaseModel, Field

from app.config.settings import get_settings
from app.services.llm_factory import LLMFactory

logger = logging.getLogger(__name__)


class ClassificationScore(BaseModel):
    label: str
    score: float


class ClassificationResult(BaseModel):
    label: str
    confidence: float
    scores: List[ClassificationScore]
    used_text: str
    candidate_labels: List[str]
    reasoning: Optional[str] = None


class _ClassificationPayload(BaseModel):
    """Structured output expected from the LLM."""

    label: str = Field(description="Exact label code from the candidate list")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence between 0 and 1")
    reason: Optional[str] = Field(default=None, description="Short French explanation")


class ClassificationService:
    """Classify a document into one of the provided labels using the active LLM provider."""

    def __init__(self, *, provider: Optional[str] = None, model: Optional[str] = None):
        settings = get_settings()
        self.provider = provider or settings.llm.resolve_chat_provider()
        self.model = model or settings.llm.resolve_chat_model(self.provider)  # type: ignore[arg-type]
        self._llm = LLMFactory(self.provider)

    def classify(
        self,
        *,
        text: str,
        candidate_labels: Sequence[str],
        hypothesis_template: Optional[str] = None,  # kept for signature compatibility
        multi_label: bool = False,  # kept for signature compatibility
    ) -> ClassificationResult:
        del hypothesis_template, multi_label
        if not text.strip():
            raise ValueError("Document text cannot be empty for classification.")
        if not candidate_labels:
            raise ValueError("Candidate labels must be provided for classification.")

        formatted_labels = "\n".join(f"- {label}" for label in candidate_labels)
        prompt = f"""
Tu es un classifieur de documents de sécurité privée et d'établissements (ERP, IGH, écoles, commerces).
Choisis le seul label le plus pertinent parmi la liste ci-dessous.

Contexte métier (indicatif) :
- registres / notices / PV de commission / plans d'évacuation → commission_securite
- procédures de sûreté, contrats de gardiennage, cartes CNAPS → audit_surete
- RC, CCTP, CCAP, AE, BPU, DC1/DC2, DCE, mémoire technique → appel_offres
- rapports d'audit, PV de réunion, courriers → autres

Labels candidats (codes stables à renvoyer tels quels) :
{formatted_labels}

Document :
{text}
"""

        logger.debug(
            "Classifying document using provider=%s model=%s labels=%d",
            self.provider,
            self.model,
            len(candidate_labels),
        )
        payload, _raw = self._llm.create_completion(
            response_model=_ClassificationPayload,
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
        )

        label = payload.label
        confidence = float(payload.confidence)
        reason = payload.reason

        return ClassificationResult(
            label=label,
            confidence=confidence,
            scores=[ClassificationScore(label=label, score=confidence)],
            used_text=text,
            candidate_labels=list(candidate_labels),
            reasoning=reason,
        )

    @property
    def version(self) -> str:
        return f"{self.provider}:{self.model}"


# Back-compat alias for imports / tests that still mention OpenAIClassificationService.
OpenAIClassificationService = ClassificationService


@lru_cache
def get_classification_service(
    provider: Optional[str] = None,
    model: Optional[str] = None,
) -> ClassificationService:
    """Return a cached classification service bound to the resolved provider."""
    settings = get_settings()
    resolved_provider = provider or settings.llm.resolve_chat_provider()
    resolved_model = model or settings.llm.resolve_chat_model(resolved_provider)  # type: ignore[arg-type]
    return ClassificationService(provider=resolved_provider, model=resolved_model)
