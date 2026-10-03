"""Modèles d'e-mail versionnés (changer un texte = monter sa version, gardée dans le journal).

Le modèle ne fait que présenter : qui reçoit quoi et quand est décidé par le service. Toutes les valeurs
insérées sont échappées pour le HTML.
"""

from __future__ import annotations

import html
from dataclasses import dataclass


@dataclass(frozen=True)
class Rendered:
    template: str
    version: int
    subject: str
    html: str
    text: str


def _layout(
    title: str, why: str, paragraphs: list[str], items: list[str], link: tuple[str, str] | None
) -> str:
    e = html.escape
    parts = [
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1b1b1f">',
        f'<p style="font-size:12px;color:#6b6b76">{e(why)}</p>',
        f'<h1 style="font-size:20px">{e(title)}</h1>',
    ]
    parts += [f"<p>{e(p)}</p>" for p in paragraphs]
    if items:
        parts.append("<ul>" + "".join(f"<li>{e(i)}</li>" for i in items) + "</ul>")
    if link:
        label, url = link
        parts.append(
            f'<p><a href="{e(url, quote=True)}" style="display:inline-block;background:#111;color:#fff;'
            f'padding:10px 16px;border-radius:8px;text-decoration:none">{e(label)}</a></p>'
        )
    parts.append('<p style="font-size:12px;color:#6b6b76">GSMS Sécurité — gsms-security.com</p></div>')
    return "".join(parts)


def _text(title: str, paragraphs: list[str], items: list[str], link: tuple[str, str] | None) -> str:
    lines = [title, "", *paragraphs]
    if items:
        lines += [""] + [f"- {i}" for i in items]
    if link:
        lines += ["", f"{link[0]} : {link[1]}"]
    lines += ["", "GSMS Sécurité — gsms-security.com"]
    return "\n".join(lines)


def missing_pieces(*, prestation: str, client: str, pieces: list[str], url: str) -> Rendered:
    title = f"Pièces à déposer — {prestation}"
    paragraphs = [
        f"Bonjour, pour avancer sur la prestation « {prestation} » ({client}), "
        "il nous manque les pièces suivantes.",
        "Vous pouvez les déposer directement dans votre espace sécurisé : chaque fichier y est chiffré.",
    ]
    link = ("Déposer mes pièces", url)
    return Rendered(
        "relance_pieces",
        1,
        title,
        _layout(title, "Vous êtes le contact de cette prestation.", paragraphs, pieces, link),
        _text(title, paragraphs, pieces, link),
    )


def smtp_test(*, sent_by: str) -> Rendered:
    title = "Test d'envoi — GSMS Sécurité"
    paragraphs = [
        f"Ce message confirme que la messagerie de la plateforme fonctionne (envoi demandé par {sent_by})."
    ]
    return Rendered(
        "test_smtp",
        1,
        title,
        _layout(title, "Message technique.", paragraphs, [], None),
        _text(title, paragraphs, [], None),
    )
