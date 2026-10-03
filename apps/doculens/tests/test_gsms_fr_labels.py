"""Taxonomie documentaire française (registres, PV, DCE…)."""

from app.gsms.fr_labels import FR_TAXONOMY, all_fr_label_codes


def test_fr_taxonomy_covers_security_and_tender_codes():
    codes = set(all_fr_label_codes())
    for required in (
        "registre_securite",
        "pv_commission_precedente",
        "dce",
        "cctp",
        "rc",
        "memoire_technique",
        "carte_professionnelle_cnaps",
    ):
        assert required in codes


def test_fr_taxonomy_domains_present():
    assert set(FR_TAXONOMY) == {
        "commission_securite",
        "audit_surete",
        "appel_offres",
        "autres",
    }


def test_classification_prompt_mentions_french_docs(monkeypatch):
    from app.services import classification_service as mod

    captured = {}

    class FakeFactory:
        def __init__(self, provider):
            self.provider = provider

        def create_completion(self, response_model, messages, **kwargs):
            captured["messages"] = messages
            captured["model"] = kwargs.get("model")
            payload = response_model(
                label="dce",
                confidence=0.8,
                reason="DCE",
            )
            return payload, object()

    monkeypatch.setattr(mod, "LLMFactory", FakeFactory)

    service = mod.ClassificationService(provider="openrouter", model="test-model")
    result = service.classify(
        text="Dossier de consultation des entreprises CCTP CCAP",
        candidate_labels=["dce", "rc", "autre"],
    )
    prompt = captured["messages"][0]["content"]
    assert "registres" in prompt.lower() or "DCE" in prompt
    assert "Choisis" in prompt
    assert result.label == "dce"
    assert service.version == "openrouter:test-model"
