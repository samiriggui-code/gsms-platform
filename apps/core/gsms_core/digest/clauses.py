"""Clauses d'un DCE classées par thème métier sûreté / sécurité incendie (règles déterministes).

Chaque phrase d'un bloc de texte est rattachée au premier thème reconnu ; elle garde son ``SourceRef``
(document, page, section, bloc). Les phrases prescriptives (« doit », « obligatoire »…) sont marquées
obligatoires. Aucun LLM : un thème non reconnu n'est pas inventé.
"""

from __future__ import annotations

import re

from gsms_core.digest.classifier import fold
from gsms_core.digest.obligations import _PRESCRIPTIVE, _SENTENCE_SPLIT
from gsms_core.digest.provenance import iter_units, stable_id, with_excerpt
from gsms_core.digest.schemas import TenderClause
from gsms_core.documents.parsers.schemas import BlockKind, NormalizedDocument

# (thème, libellé, motif sur texte replié) \u2014 ordre = priorité quand une phrase en touche plusieurs.
CLAUSE_RULES: tuple[tuple[str, str, str], ...] = (
    (
        "reprise_personnel",
        "Reprise du personnel",
        r"reprise (du|des) (personnel|salaries)|transfert (du|des) (personnel|contrats)|avenant (n\W*)?5"
        r"|accord du 5 mars 2002|l\.?\s?1224",
    ),
    ("convention_collective", "Convention collective", r"convention collective|\bidcc\b|\b1351\b"),
    (
        "clause_sociale",
        "Clause sociale",
        r"clause (sociale|d.insertion)|heures d.insertion|insertion professionnelle|travailleurs handicapes"
        r"|\besat\b|entreprises? adaptees?",
    ),
    (
        "clause_environnementale",
        "Clause environnementale",
        r"clause environnementale|developpement durable|\brse\b|empreinte carbone|bilan carbone"
        r"|vehicules? (electriques?|hybrides?|propres)|gestion des dechets|eco-?responsable",
    ),
    (
        "sous_traitance",
        "Sous-traitance / groupement",
        r"sous-?trait|cotrait|groupement (momentane|d.entreprises)",
    ),
    (
        "plan_prevention",
        "Plan de prévention",
        r"plan de prevention|inspection commune prealable|protocole de securite|permis de feu"
        r"|decret (n\W*)?92-?158",
    ),
    (
        "mobilisation",
        "Démarrage et mobilisation",
        r"delai de (mise en place|mobilisation|demarrage)|prise de (poste|service)"
        r"|demarrage (de la|des) prestations?"
        r"|periode (de transition|probatoire)|passation (de|des) consignes|tuilage",
    ),
    (
        "qualifications",
        "Qualifications et agréments",
        r"\bssiap\b|\bcnaps\b|carte professionnelle|autorisation d.exercer|\bcqp\b|\bsst\b"
        r"|sauveteur secouriste"
        r"|habilitation|h0b0|agrement|certification|qualibat|apsad|iso 9001|\bmase\b",
    ),
    (
        "horaires",
        "Horaires et vacations",
        r"\d{1,2}\s?h\s?\d{0,2}\s?(a|-|\u2013)\s?\d{1,2}\s?h|24\s?h\s?/\s?24|7\s?j\s?/\s?7|\bhoraires?\b"
        r"|vacations?|jours? feries|dimanches?|\bde nuit\b|heures? (de|d.)?ouverture",
    ),
    (
        "moyens_humains",
        "Moyens humains",
        r"\beffectifs?\b|\bagents?\b|chef de (poste|site|service)|encadrement|remplacement|absenteisme"
        r"|astreinte|formation (initiale|continue|du personnel)",
    ),
    (
        "moyens_materiels",
        "Moyens matériels",
        r"vehicules?|radios?|talkie|\bpti\b|\bdati\b|ronde electronique|uniformes?|tenues?|equipements?"
        r"|\bmateriels?\b|main courante (electronique)?|logiciel|telephone",
    ),
    (
        "securite_surete",
        "Sécurité / sûreté",
        r"securite incendie|\bssi\b|surete|controle d.acces|video ?protection|levee de doute|\brondes?\b"
        r"|consignes|registre de securite|evacuation|malveillance",
    ),
    (
        "prix",
        "Prix et bordereaux",
        r"\bbpu\b|\bdpgf\b|\bdqe\b|bordereau|decomposition du prix|detail quantitatif|prix unitaires?"
        r"|revision des prix|actualisation des prix|\bforfait",
    ),
    (
        "memoire_technique",
        "Mémoire technique",
        r"memoire technique|note methodologique|cadre de (reponse|memoire)|trame (imposee|de reponse)",
    ),
    (
        "attestations",
        "Pièces administratives",
        r"attestations?|\bkbis\b|\burssaf\b|assurances?|\bdc1\b|\bdc2\b|\bdume\b|certificats?"
        r"|lettre de candidature"
        r"|pouvoir (de|du) signataire",
    ),
    (
        "variantes_options",
        "Variantes et options",
        r"variantes?|prestations? supplementaires?|\bpse\b|options?",
    ),
    ("visite", "Visite des lieux", r"visite (obligatoire|de site|des lieux|des sites)|attestation de visite"),
    (
        "duree_marche",
        "Durée et forme du marché",
        r"duree du (marche|contrat)|reconduction|reconductible|accord-?cadre|bons? de commande",
    ),
    ("penalites", "Pénalités", r"penalites?|retenues?|minorations?"),
    ("confidentialite", "Confidentialité / RGPD", r"confidentiel|\brgpd\b|donnees personnelles|secret"),
)

CATEGORY_LABELS = {key: label for key, label, _ in CLAUSE_RULES}
_COMPILED = tuple((key, label, re.compile(pattern)) for key, label, pattern in CLAUSE_RULES)
_SKIPPED_KINDS = {BlockKind.TITLE, BlockKind.HEADING}


def categorize(text: str) -> tuple[str, str] | None:
    folded = fold(text)
    for key, label, pattern in _COMPILED:
        if pattern.search(folded):
            return key, label
    return None


def extract_clauses(doc: NormalizedDocument) -> list[TenderClause]:
    out: list[TenderClause] = []
    kinds = {b.id: b.kind for b in doc.blocks}
    for unit in iter_units(doc):
        if unit.cells or kinds.get(unit.source.block_id or "") in _SKIPPED_KINDS:
            continue
        for sentence in _SENTENCE_SPLIT.split(unit.text):
            sentence = sentence.strip()
            if not 20 <= len(sentence) <= 600:
                continue
            found = categorize(sentence)
            if found is None:
                continue
            key, label = found
            out.append(
                TenderClause(
                    id=stable_id("cls", doc.document_id, unit.source.block_id, sentence),
                    category=key,
                    label=label,
                    text=sentence,
                    mandatory=bool(_PRESCRIPTIVE.search(fold(sentence))),
                    source=with_excerpt(unit.source, sentence),
                )
            )
    return out
