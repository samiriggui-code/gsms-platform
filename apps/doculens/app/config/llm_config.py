"""Configuration for LLM providers (OpenAI, Anthropic, OpenRouter, Llama).

Plusieurs clés peuvent coexister. Le provider actif se choisit via
``DOCULENS_LLM_PROVIDER`` (``auto`` | ``openai`` | ``anthropic`` | ``openrouter`` | ``llama``).
En mode ``auto``, priorité : OpenRouter → Anthropic → OpenAI → Llama.

Alias acceptés : ``codex``/``gpt`` → openai, ``claude`` → anthropic,
``OPENROUTER_API_KEY`` ou ``OPEN_ROUTER_API_KEY``.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ChatProviderName = Literal["openai", "anthropic", "openrouter", "llama"]
EmbeddingProviderName = Literal["openai", "openrouter"]
ProviderChoice = Literal["auto", "openai", "anthropic", "openrouter", "llama"]


class LLMProviderSettings(BaseSettings):
    """Base settings for LLM providers."""

    model_config = SettingsConfigDict(
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
    )

    temperature: float = 0.0
    max_tokens: Optional[int] = None
    max_retries: int = 3


class OpenAISettings(LLMProviderSettings):
    """Settings for OpenAI (chat + embeddings)."""

    api_key: Optional[str] = Field(default=None, validation_alias="OPENAI_API_KEY")
    default_model: str = Field(default="gpt-4o-mini", validation_alias="DOCULENS_OPENAI_MODEL")
    embedding_model: str = Field(
        default="text-embedding-3-small",
        validation_alias="DOCULENS_OPENAI_EMBEDDING_MODEL",
    )
    base_url: Optional[str] = Field(default=None, validation_alias="OPENAI_BASE_URL")


class AnthropicSettings(LLMProviderSettings):
    """Settings for Anthropic."""

    api_key: Optional[str] = Field(default=None, validation_alias="ANTHROPIC_API_KEY")
    default_model: str = Field(
        default="claude-3-5-sonnet-20240620",
        validation_alias="DOCULENS_ANTHROPIC_MODEL",
    )
    max_tokens: int = 1024


class LlamaSettings(LLMProviderSettings):
    """Settings for local OpenAI-compatible Llama (Ollama, etc.)."""

    api_key: str = Field(default="ollama", validation_alias="LLAMA_API_KEY")
    default_model: str = Field(default="llama3", validation_alias="DOCULENS_LLAMA_MODEL")
    base_url: str = Field(default="http://localhost:11434/v1", validation_alias="LLAMA_BASE_URL")


class OpenRouterSettings(LLMProviderSettings):
    """Settings for OpenRouter (OpenAI-compatible gateway)."""

    api_key: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("OPENROUTER_API_KEY", "OPEN_ROUTER_API_KEY"),
    )
    default_model: str = Field(
        default="anthropic/claude-3.5-sonnet",
        validation_alias="DOCULENS_OPENROUTER_MODEL",
    )
    embedding_model: str = Field(
        default="openai/text-embedding-3-small",
        validation_alias="DOCULENS_OPENROUTER_EMBEDDING_MODEL",
    )
    base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        validation_alias="OPENROUTER_BASE_URL",
    )


class LLMConfig(BaseSettings):
    """Configuration for all LLM providers + résolution du provider actif."""

    model_config = SettingsConfigDict(
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
    )

    openai: OpenAISettings = Field(default_factory=OpenAISettings)
    anthropic: AnthropicSettings = Field(default_factory=AnthropicSettings)
    llama: LlamaSettings = Field(default_factory=LlamaSettings)
    openrouter: OpenRouterSettings = Field(default_factory=OpenRouterSettings)

    provider: ProviderChoice = Field(default="auto", validation_alias="DOCULENS_LLM_PROVIDER")
    model: Optional[str] = Field(default=None, validation_alias="DOCULENS_LLM_MODEL")
    embedding_provider: Literal["auto", "openai", "openrouter"] = Field(
        default="auto",
        validation_alias="DOCULENS_EMBEDDING_PROVIDER",
    )
    embedding_model: Optional[str] = Field(
        default=None,
        validation_alias="DOCULENS_EMBEDDING_MODEL",
    )

    @field_validator("provider", mode="before")
    @classmethod
    def normalize_provider(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip().lower()
            aliases = {
                "openai": "openai",
                "gpt": "openai",
                "codex": "openai",
                "anthropic": "anthropic",
                "claude": "anthropic",
                "openrouter": "openrouter",
                "open-router": "openrouter",
                "or": "openrouter",
                "llama": "llama",
                "ollama": "llama",
                "auto": "auto",
            }
            return aliases.get(normalized, normalized)
        return value

    @model_validator(mode="after")
    def _hydrate_openrouter_key_alias(self) -> "LLMConfig":
        import os

        if not self.openrouter.api_key:
            legacy = os.getenv("OPEN_ROUTER_API_KEY") or os.getenv("OPENROUTER_API_KEY")
            if legacy:
                object.__setattr__(self.openrouter, "api_key", legacy)
        return self

    def has_key(self, name: ChatProviderName) -> bool:
        settings = getattr(self, name)
        key = getattr(settings, "api_key", None)
        if name == "llama":
            return True
        return bool(key and str(key).strip())

    def resolve_chat_provider(self) -> ChatProviderName:
        """Provider chat effectif (jamais ``auto``)."""
        if self.provider != "auto":
            name: ChatProviderName = self.provider  # type: ignore[assignment]
            if name != "llama" and not self.has_key(name):
                raise ValueError(
                    f"DOCULENS_LLM_PROVIDER={name} but no API key is configured for that provider"
                )
            return name

        for candidate in ("openrouter", "anthropic", "openai", "llama"):
            if self.has_key(candidate):  # type: ignore[arg-type]
                return candidate  # type: ignore[return-value]
        raise ValueError(
            "No LLM API key found. Set OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY "
            "(or DOCULENS_LLM_PROVIDER=llama for local Ollama)."
        )

    def resolve_chat_model(self, provider: Optional[ChatProviderName] = None) -> str:
        if self.model:
            return self.model
        name = provider or self.resolve_chat_provider()
        return getattr(self, name).default_model

    def resolve_embedding_provider(self) -> EmbeddingProviderName:
        if self.embedding_provider != "auto":
            name: EmbeddingProviderName = self.embedding_provider  # type: ignore[assignment]
            if not self.has_key(name):  # type: ignore[arg-type]
                raise ValueError(
                    f"DOCULENS_EMBEDDING_PROVIDER={name} but no API key is configured"
                )
            return name

        if self.has_key("openrouter"):
            return "openrouter"
        if self.has_key("openai"):
            return "openai"
        raise ValueError(
            "No embedding-capable API key found. Set OPENROUTER_API_KEY or OPENAI_API_KEY "
            "(Anthropic alone cannot serve embeddings)."
        )

    def resolve_embedding_model(self, provider: Optional[EmbeddingProviderName] = None) -> str:
        if self.embedding_model:
            return self.embedding_model
        name = provider or self.resolve_embedding_provider()
        if name == "openrouter":
            return self.openrouter.embedding_model
        return self.openai.embedding_model

    def openai_compatible_client_kwargs(self, provider: str) -> dict:
        """Kwargs for ``openai.OpenAI(**kwargs)`` (chat or embeddings)."""
        if provider == "openrouter":
            if not self.openrouter.api_key:
                raise ValueError("OPENROUTER_API_KEY is not set")
            return {
                "api_key": self.openrouter.api_key,
                "base_url": self.openrouter.base_url,
                "max_retries": self.openrouter.max_retries,
            }
        if provider == "openai":
            if not self.openai.api_key:
                raise ValueError("OPENAI_API_KEY is not set")
            kwargs: dict = {
                "api_key": self.openai.api_key,
                "max_retries": self.openai.max_retries,
            }
            if self.openai.base_url:
                kwargs["base_url"] = self.openai.base_url
            return kwargs
        if provider == "llama":
            return {
                "api_key": self.llama.api_key,
                "base_url": self.llama.base_url,
                "max_retries": self.llama.max_retries,
            }
        raise ValueError(f"Provider {provider} is not OpenAI-compatible")
