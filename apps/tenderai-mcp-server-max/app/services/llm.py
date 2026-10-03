"""LLM service — Anthropic SDK wrapper with proposal-specific prompt templates.

Les prompts sont écrits pour GSMS : sûreté privée (gardiennage, ADS, rondes, cynophile) et sécurité incendie
(SSIAP 1/2/3, ERP, IGH), marchés publics français. Le modèle rédige et propose ; il ne calcule aucun prix et
n'affirme jamais une conformité : une personne valide.
"""

from __future__ import annotations

import logging
from typing import Optional

import anthropic

from app.config import DEFAULT_LLM_MODEL

logger = logging.getLogger(__name__)

_HOUSE_RULES = (
    " Écris en français, dans un registre professionnel et sobre adapté à un acheteur public. "
    "N'invente ni chiffre, ni certification, ni référence client, ni effectif : si une information manque, "
    "écris [À COMPLÉTER : …]. Ne conclus jamais seul qu'une exigence est respectée."
)

# ---------------------------------------------------------------------------
# Prompt templates keyed by section type
# ---------------------------------------------------------------------------

PROMPT_TEMPLATES: dict[str, str] = {
    "executive_summary": (
        "Tu es rédacteur senior de mémoires techniques pour une entreprise de sûreté et de sécurité incendie "
        "(gardiennage, agents de sécurité, SSIAP). Rédige la synthèse de l'offre : rappel du besoin de "
        "l'acheteur, engagements clés (continuité de service, encadrement, qualité), points différenciants, "
        "engagement final. Paragraphes structurés, sans titres markdown." + _HOUSE_RULES
    ),
    "technical_approach": (
        "Tu rédiges la note méthodologique d'un mémoire technique de prestation de sûreté et de sécurité "
        "incendie. Décris l'organisation proposée (postes, plages horaires, rondes, consignes), la prise de "
        "poste et la passation, la gestion des événements et des alarmes, le lien avec le PC sécurité, et "
        "explique comment chaque exigence du CCTP est traitée." + _HOUSE_RULES
    ),
    "solution_architecture": (
        "Tu décris le dispositif de sûreté et de sécurité incendie proposé pour le site : postes fixes et "
        "itinérants, PC sécurité, moyens techniques (main courante électronique, contrôle des rondes, PTI/DATI, "
        "radios), articulation avec le SSI et les équipements existants, procédures dégradées." + _HOUSE_RULES
    ),
    "implementation_methodology": (
        "Tu rédiges le plan de mise en place de la prestation : reprise éventuelle du personnel (annexe 7 de la "
        "convention collective IDCC 1351), recrutement et habilitations (carte professionnelle CNAPS, SSIAP), "
        "formation au site, visite et consignes, montée en charge, contrôles qualité et réunions de suivi."
        + _HOUSE_RULES
    ),
    "project_timeline": (
        "Tu rédiges le calendrier de démarrage de la prestation : étapes de la notification à la prise de "
        "poste, durées, dépendances, jalons de validation avec l'acheteur." + _HOUSE_RULES
    ),
    "team_qualifications": (
        "Tu présentes l'encadrement et les équipes : organigramme de la prestation, qualifications exigées "
        "(ADS, SSIAP 1/2/3, chef de poste, maître-chien), cartes professionnelles CNAPS, recyclages, plan de "
        "remplacement des absences et des congés." + _HOUSE_RULES
    ),
    "company_profile": (
        "Tu rédiges la présentation de l'entreprise qui ouvre le mémoire : raison sociale, implantation, "
        "métiers (sûreté, sécurité incendie), autorisation d'exercer CNAPS, certifications, effectifs, zones "
        "d'intervention. Troisième personne, ton factuel." + _HOUSE_RULES
    ),
    "past_successful_projects": (
        "Tu présentes les références de l'entreprise les plus proches de ce marché : type de site (ERP, IGH, "
        "industriel, tertiaire), nature de la prestation, volume horaire, durée, résultats. Uniquement à "
        "partir des références fournies en contexte." + _HOUSE_RULES
    ),
    "past_experience": (
        "Tu présentes 3 à 5 références pertinentes : secteur de l'acheteur, périmètre, effectifs mobilisés, "
        "résultats et lien avec le présent marché. Uniquement à partir des références fournies." + _HOUSE_RULES
    ),
    "compliance_narrative": (
        "Tu es chargé de conformité pour des réponses à appels d'offres de sûreté et de sécurité incendie. "
        "Pour l'exigence donnée, propose la réponse prévue : comment l'offre y répond concrètement (moyens, "
        "qualifications, procédure, preuve à joindre). Formule une proposition à valider, jamais une "
        "affirmation de conformité." + _HOUSE_RULES
    ),
    "architecture_description": (
        "Tu décris un dispositif technique de sûreté (vidéoprotection, contrôle d'accès, détection intrusion, "
        "PC sécurité) : architecture, rôle de chaque composant, liaisons, secours, cybersécurité, évolutivité."
        + _HOUSE_RULES
    ),
    "partner_brief": (
        "Tu rédiges un cahier des charges à destination d'un sous-traitant ou cotraitant (sûreté, sécurité "
        "incendie, maintenance de systèmes) : contexte du marché, périmètre confié, livrables, délais, format "
        "de réponse attendu." + _HOUSE_RULES
    ),
    "tender_analysis": (
        "Tu es analyste avant-vente pour une entreprise de sûreté et de sécurité incendie. Analyse cette "
        "consultation : synthèse du besoin, points d'attention (qualifications, horaires, reprise du personnel, "
        "pénalités), risques, pièces à produire, éléments pour la décision GO / NO-GO. La décision appartient à "
        "l'équipe." + _HOUSE_RULES
    ),
    "proposal_summary": (
        "Tu extrais les métadonnées d'une réponse passée à un appel d'offres. Analyse tous les documents fournis "
        "et renvoie UNIQUEMENT un objet JSON valide avec ces champs :\n"
        "{\n"
        '  "tender_number": "référence exacte de la consultation, ou chaîne vide",\n'
        '  "title": "intitulé complet du marché",\n'
        '  "client": "nom de l\'acheteur",\n'
        '  "sector": "une valeur parmi : surete, securite_incendie, gardiennage, cynophile, systemes, general",\n'
        '  "country": "code pays sur deux lettres (ex. FR)",\n'
        '  "technical_summary": "synthèse en 2 à 3 paragraphes du dispositif proposé",\n'
        '  "pricing_summary": "structure du prix et principaux postes de coût",\n'
        '  "total_price": 0.0,\n'
        '  "margin_info": "taux de marge s\'ils figurent dans les tableaux financiers",\n'
        '  "technologies": ["qualifications, équipements et outils cités"],\n'
        '  "keywords": ["10 à 20 mots-clés de recherche : prestation, type de site, secteur, lieu"],\n'
        '  "full_summary": "synthèse complète en 3 à 5 paragraphes"\n'
        "}\n\n"
        "Règles :\n"
        "- Reprends les montants EXACTS des documents financiers, jamais une estimation\n"
        "- Cite toutes les qualifications (SSIAP, ADS, CNAPS…) et équipements mentionnés\n"
        "- Renvoie UNIQUEMENT du JSON valide : ni markdown, ni explication"
    ),
    "general": (
        "Tu es rédacteur professionnel d'offres pour une entreprise de sûreté et de sécurité incendie, en "
        "réponse à des marchés publics et privés français." + _HOUSE_RULES
    ),
}


class LLMRefusal(RuntimeError):
    """Le modèle a décliné la demande (stop_reason « refusal »)."""


class LLMService:
    """Wrapper around the Anthropic SDK for proposal-oriented text generation."""

    def __init__(self, api_key: str, model: str = DEFAULT_LLM_MODEL, max_tokens: int = 4096):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model
        self.max_tokens = max_tokens

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        context_documents: Optional[list[str]] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate text using Claude with optional grounding documents.

        Context documents are prepended to the system prompt inside <document> blocks
        so the model can reference them when producing its answer.
        """
        full_system = system_prompt
        if context_documents:
            docs_block = "\n\n".join(
                f"<document>\n{doc}\n</document>" for doc in context_documents
            )
            full_system = (
                f"{system_prompt}\n\n"
                f"Appuie-toi sur les documents de référence suivants :\n\n{docs_block}"
            )

        logger.debug("LLM request — model=%s, system_len=%d, user_len=%d", self.model, len(full_system), len(user_prompt))

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens or self.max_tokens,
            system=full_system,
            messages=[{"role": "user", "content": user_prompt}],
        )

        if response.stop_reason == "refusal":
            raise LLMRefusal("le modèle a décliné cette demande")
        # Les modèles récents peuvent renvoyer des blocs de réflexion avant le texte : on ne garde que le texte.
        text = "".join(block.text for block in response.content if getattr(block, "type", "") == "text")
        logger.debug("LLM response — tokens_in=%d, tokens_out=%d", response.usage.input_tokens, response.usage.output_tokens)
        return text

    async def generate_section(
        self,
        section_type: str,
        user_prompt: str,
        context_documents: Optional[list[str]] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate proposal content using a named prompt template."""
        template = PROMPT_TEMPLATES.get(section_type, PROMPT_TEMPLATES["general"])
        return await self.generate(template, user_prompt, context_documents, max_tokens)
