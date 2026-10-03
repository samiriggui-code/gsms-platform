"""Résolution multi-provider LLM (OpenRouter / Anthropic / OpenAI)."""

import pytest

from app.config.llm_config import (
    AnthropicSettings,
    LLMConfig,
    OpenAISettings,
    OpenRouterSettings,
)


@pytest.fixture
def clean_llm_env(monkeypatch):
    for key in (
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "OPENROUTER_API_KEY",
        "OPEN_ROUTER_API_KEY",
        "DOCULENS_LLM_PROVIDER",
        "DOCULENS_LLM_MODEL",
        "DOCULENS_EMBEDDING_PROVIDER",
        "DOCULENS_EMBEDDING_MODEL",
    ):
        monkeypatch.delenv(key, raising=False)


def test_auto_prefers_openrouter_when_all_keys_present(clean_llm_env):
    cfg = LLMConfig(
        openai=OpenAISettings(api_key="sk-oai"),
        anthropic=AnthropicSettings(api_key="sk-ant"),
        openrouter=OpenRouterSettings(api_key="sk-or"),
        provider="auto",
    )
    assert cfg.resolve_chat_provider() == "openrouter"
    assert cfg.resolve_embedding_provider() == "openrouter"


def test_auto_falls_back_to_anthropic_for_chat(clean_llm_env):
    cfg = LLMConfig(
        openai=OpenAISettings(api_key=None),
        anthropic=AnthropicSettings(api_key="sk-ant"),
        openrouter=OpenRouterSettings(api_key=None),
        provider="auto",
    )
    assert cfg.resolve_chat_provider() == "anthropic"
    with pytest.raises(ValueError, match="embedding"):
        cfg.resolve_embedding_provider()


def test_explicit_codex_alias_maps_to_openai(clean_llm_env):
    cfg = LLMConfig(
        openai=OpenAISettings(api_key="sk-oai"),
        anthropic=AnthropicSettings(api_key=None),
        openrouter=OpenRouterSettings(api_key=None),
        provider="codex",  # normalized by validator
    )
    assert cfg.provider == "openai"
    assert cfg.resolve_chat_provider() == "openai"


def test_openrouter_client_kwargs(clean_llm_env):
    cfg = LLMConfig(
        openrouter=OpenRouterSettings(api_key="sk-or", base_url="https://openrouter.ai/api/v1"),
        openai=OpenAISettings(api_key=None),
        anthropic=AnthropicSettings(api_key=None),
    )
    kwargs = cfg.openai_compatible_client_kwargs("openrouter")
    assert kwargs["api_key"] == "sk-or"
    assert "openrouter.ai" in kwargs["base_url"]


def test_missing_explicit_provider_key_raises(clean_llm_env):
    cfg = LLMConfig(
        openai=OpenAISettings(api_key=None),
        openrouter=OpenRouterSettings(api_key=None),
        anthropic=AnthropicSettings(api_key=None),
        provider="openai",
    )
    with pytest.raises(ValueError, match="no API key"):
        cfg.resolve_chat_provider()
