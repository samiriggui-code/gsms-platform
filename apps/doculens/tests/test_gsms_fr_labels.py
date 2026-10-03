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


def test_classification_prompt_mentions_french_docs():
    from app.services.classification_service import OpenAIClassificationService

    # Inspect prompt construction without calling OpenAI: invoke classify with stub client.
    service = OpenAIClassificationService.__new__(OpenAIClassificationService)
    service.model = "test"
    captured = {}

    class FakeClient:
        class responses:
            @staticmethod
            def create(**kwargs):
                captured["input"] = kwargs["input"]

                class R:
                    output_text = '{"label":"dce","confidence":0.8,"reason":"DCE"}'

                return R()

    service.client = FakeClient()
    result = OpenAIClassificationService.classify(
        service,
        text="Dossier de consultation des entreprises CCTP CCAP",
        candidate_labels=["dce", "rc", "autre"],
    )
    assert "registres" in captured["input"].lower() or "DCE" in captured["input"]
    assert "français" in captured["input"].lower() or "Choisis" in captured["input"]
    assert result.label == "dce"
