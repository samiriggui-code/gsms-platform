"""Rendu des e-mails : registre versionné des modèles (``emails/*.html``) et rendu HTML + texte.

Repris de gsms-qualiopi (``app/relances/render.py``). Le modèle ne fait que présenter : la logique (qui,
quand, quoi) est dans le planificateur. Changer un texte = monter la version, gardée dans le journal.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

EMAILS_DIR = Path(__file__).parent / "emails"


@dataclass(frozen=True)
class Template:
    version: int
    sujet: str  # gabarit Jinja d'une ligne
    pourquoi: str  # « pourquoi je reçois ce message », en tête


_PLURAL = "{{ 's' if pieces|length > 1 }}"

TEMPLATES: dict[str, Template] = {
    "pieces_manquantes": Template(
        1, "Pièces à déposer — {{ prestation }}", "Vous êtes le contact de cette prestation."
    ),
    "alerte_echeance": Template(
        1,
        "[J-{{ jours }}] Remise des offres le {{ date_limite }} — {{ prestation }}",
        "Vous travaillez sur les prestations de GSMS.",
    ),
    "alerte_conflit": Template(
        1, "Conflit entre pièces — {{ prestation }}", "Vous travaillez sur les prestations de GSMS."
    ),
    "depot_client": Template(
        1,
        "{{ pieces|length }} pièce" + _PLURAL + " déposée" + _PLURAL + " — {{ prestation }}",
        "Vous travaillez sur les prestations de GSMS.",
    ),
    "synthese_hebdo": Template(
        1, "Synthèse hebdomadaire des prestations — {{ date }}", "Vous administrez la plateforme GSMS."
    ),
    "test_smtp": Template(1, "Test d'envoi — GSMS Sécurité", "Message technique."),
}

_env = Environment(
    loader=FileSystemLoader(EMAILS_DIR),
    autoescape=select_autoescape(["html"]),
    undefined=StrictUndefined,
    trim_blocks=True,
    lstrip_blocks=True,
)
# Objet d'e-mail : texte brut d'en-tête (jamais du HTML), donc sans échappement HTML.
_subject_env = Environment(autoescape=False, undefined=StrictUndefined)  # noqa: S701


@dataclass(frozen=True)
class Rendered:
    template: str
    subject: str
    html: str
    text: str
    version: int


def _to_text(body: str) -> str:
    """Version texte (clients qui n'affichent pas le HTML) : le contenu, sans la mise en forme."""
    body = re.sub(r"(?is)<(style|title)[^>]*>.*?</\1>", "", body)
    body = re.sub(r'(?is)<span style="display:none[^>]*>.*?</span>', "", body)
    body = re.sub(r"(?i)<br\s*/?>|</p>|</li>|</tr>|</div>", "\n", body)
    body = re.sub(r"(?i)<li[^>]*>", "- ", body)
    body = re.sub(r'(?i)<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', r"\2 : \1", body)
    body = html.unescape(re.sub(r"<[^>]+>", " ", body))
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in body.splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip() + "\n"


def render(key: str, context: dict) -> Rendered:
    tpl = TEMPLATES[key]
    subject = " ".join(_subject_env.from_string(tpl.sujet).render(**context).split())
    if context.get("relance") and not subject.startswith("Relance"):
        subject = f"Relance : {subject}"
    subject = subject[:300]
    values = {"action": None, "apercu": subject} | context | {"sujet": subject, "pourquoi": tpl.pourquoi}
    body = _env.get_template(f"{key}.html").render(**values)
    return Rendered(template=key, subject=subject, html=body, text=_to_text(body), version=tpl.version)
