"""Analyse de faisabilité GO / NO-GO : une matrice lisible, pas un score opaque.

Chaque dimension (§3 du chantier) reçoit READY / WARNING / BLOCKED, une justification en clair et ses
sources (passage du DCE ou exigence de la matrice). Le calcul est déterministe : mêmes pièces, même profil,
même résultat. Il éclaire la décision ; la décision GO / NO-GO reste humaine.
"""

from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from typing import Any

from gsms_core.digest.classifier import fold
from gsms_core.digest.schemas import WorkspaceDigest
from gsms_core.documents.parsers.schemas import SourceRef
from gsms_core.tenders.models import RequirementStatus, TenderCase, TenderRequirement
from gsms_core.tenders.profile import QUALIFICATION_LABELS, CompanyProfile
from gsms_core.tenders.views import describe_source

READY, WARNING, BLOCKED = "READY", "WARNING", "BLOCKED"
_RANK = {READY: 0, WARNING: 1, BLOCKED: 2}

# Un poste tenu 24 h/24, 7 j/7 : 8 760 h par an ÷ ~1 600 h effectives par agent ≈ 5,5 agents.
ETP_PER_POST_24_7 = 5.5
_H24 = re.compile(r"24\s?h\s?/\s?24|7\s?j\s?/\s?7|jour et nuit|en permanence")
_CERTIFICATIONS = {
    "ISO 9001": r"iso\s?9001",
    "ISO 14001": r"iso\s?14001",
    "ISO 45001": r"iso\s?45001",
    "MASE": r"\bmase\b",
    "APSAD": r"apsad",
    "Qualibat": r"qualibat",
    "Qualisécurité": r"qualisecurite",
}


@dataclass
class Dimension:
    key: str
    label: str
    status: str
    justification: str
    sources: list[dict[str, Any]] = field(default_factory=list)


def _n(value: float) -> str:
    """Nombre à la française : 5,5 et non 5.5."""
    return f"{value:g}".replace(".", ",")


def _sentence(text: str) -> str:
    """Première lettre en majuscule sans toucher au reste (sigles, références CNAPS)."""
    return text[:1].upper() + text[1:]


def _src(source: SourceRef) -> dict[str, Any]:
    return {"label": describe_source(source), "document_id": str(source.document_id), "page": source.page}


def _req(row: TenderRequirement) -> dict[str, Any]:
    src = row.source or {}
    return {
        "label": f"{row.code} — {row.text[:90]}",
        "requirement_id": str(row.id),
        "document_id": src.get("document_id"),
        "page": src.get("page"),
    }


def _human(digest: WorkspaceDigest, profile: CompanyProfile) -> Dimension:
    label = "Capacité humaine"
    if not digest.requirements:
        return Dimension("humaine", label, WARNING, "Aucun effectif chiffré trouvé dans le DCE : à vérifier.")
    needed: dict[str, float] = {}
    sources: dict[str, list[SourceRef]] = defaultdict(list)
    for r in digest.requirements:
        if r.quantity:
            needed[r.key] = max(needed.get(r.key, 0), r.quantity)
            sources[r.key].append(r.source)
    round_the_clock = any(c.category == "horaires" and _H24.search(fold(c.text)) for c in digest.clauses)
    factor = ETP_PER_POST_24_7 if round_the_clock else 1.0
    lines, worst, refs = [], READY, []
    for key, posts in sorted(needed.items()):
        need = posts * factor
        have = profile.effectifs.get(key)
        name = QUALIFICATION_LABELS.get(key, key)
        refs.extend(_src(s) for s in sources[key][:2])
        if have is None:
            lines.append(f"{name} : {_n(posts)} poste(s), effectif GSMS non renseigné")
            worst = max(worst, WARNING, key=_RANK.get)
        elif have == 0:
            lines.append(f"{name} : {_n(posts)} poste(s) demandé(s), aucun agent disponible")
            worst = BLOCKED
        elif have < need:
            lines.append(f"{name} : besoin ≈ {_n(need)} agent(s), {have} mobilisable(s)")
            worst = max(worst, WARNING, key=_RANK.get)
        else:
            lines.append(f"{name} : besoin ≈ {_n(need)}, {have} mobilisable(s)")
    basis = (
        f"Service 24 h/24 détecté : {_n(ETP_PER_POST_24_7)} agents par poste (estimation avant chiffrage)."
        if round_the_clock
        else "Horaires sans service continu détecté : 1 agent par poste (estimation avant chiffrage)."
    )
    return Dimension("humaine", label, worst, " ; ".join(lines) + ". " + basis, refs)


def _regulatory(digest: WorkspaceDigest, profile: CompanyProfile, deadline: date | None) -> Dimension:
    label = "Capacité réglementaire"
    cnaps = [
        c
        for c in digest.clauses
        if re.search(r"cnaps|carte professionnelle|autorisation d.exercer", fold(c.text))
    ]
    reprise = [c for c in digest.clauses if c.category == "reprise_personnel"]
    status, notes, refs = READY, [], [_src(c.source) for c in (cnaps + reprise)[:4]]
    if not profile.cnaps_autorisation:
        status = BLOCKED if cnaps else WARNING
        notes.append("autorisation d'exercer CNAPS non renseignée dans le profil")
    elif profile.cnaps_validite and deadline and profile.cnaps_validite < deadline:
        status = BLOCKED
        notes.append(f"autorisation CNAPS expirée avant la remise ({profile.cnaps_validite.isoformat()})")
    else:
        notes.append(f"autorisation CNAPS {profile.cnaps_autorisation}")
    if reprise:
        if profile.reprise_personnel is False:
            status = max(status, WARNING, key=_RANK.get)
            notes.append("le DCE impose une reprise du personnel, non prévue au profil")
        else:
            notes.append("reprise du personnel demandée (avenant 5 CCN 1351) : coût à intégrer au chiffrage")
            status = max(status, WARNING, key=_RANK.get) if profile.reprise_personnel is None else status
    return Dimension("reglementaire", label, status, _sentence("; ".join(notes)) + ".", refs)


def _matrix_dimension(
    key: str, label: str, rows: list[TenderRequirement], types: set[str] | None, empty: str
) -> Dimension:
    live = [r for r in rows if not r.stale and r.mandatory and (types is None or r.type in types)]
    if not live:
        return Dimension(key, label, READY, empty)
    blocked = [r for r in live if r.status == RequirementStatus.BLOCKED]
    partial = [r for r in live if r.status == RequirementStatus.PARTIAL]
    open_ = [r for r in live if r.status in (RequirementStatus.TODO, RequirementStatus.IN_PROGRESS)]
    if blocked:
        return Dimension(
            key,
            label,
            BLOCKED,
            f"{len(blocked)} exigence(s) obligatoire(s) bloquée(s).",
            [_req(r) for r in blocked[:5]],
        )
    if partial or open_:
        text = f"{len(partial)} partielle(s), {len(open_)} encore à traiter sur {len(live)} obligatoire(s)."
        return Dimension(key, label, WARNING, text, [_req(r) for r in (partial + open_)[:5]])
    return Dimension(key, label, READY, f"{len(live)} exigence(s) obligatoire(s) couverte(s) ou sans objet.")


def _financial(case: TenderCase, profile: CompanyProfile) -> Dimension:
    label = "Capacité financière"
    amount, revenue = case.estimated_amount, profile.chiffre_affaires_annuel
    if not amount or not revenue:
        missing = [
            n
            for n, v in (("montant estimé du marché", amount), ("chiffre d'affaires GSMS", revenue))
            if not v
        ]
        return Dimension("financiere", label, WARNING, f"À renseigner : {', '.join(missing)}.")
    ratio = amount / revenue

    def eur(value: float) -> str:
        return f"{value:,.0f} €".replace(",", " ")

    text = f"Marché ≈ {eur(amount)} par an pour un chiffre d'affaires de {eur(revenue)} ({ratio:.0%})."
    if ratio > 1:
        return Dimension(
            "financiere", label, BLOCKED, text + " Le marché dépasse le chiffre d'affaires annuel."
        )
    if ratio > 0.5:
        return Dimension(
            "financiere", label, WARNING, text + " Plus de la moitié du chiffre d'affaires : à arbitrer."
        )
    return Dimension("financiere", label, READY, text)


def _documentary(digest: WorkspaceDigest) -> Dimension:
    label = "Capacité documentaire"
    missing = [m for m in digest.missing_information if m.code == "MISSING_DOCUMENT"]
    if not digest.documents:
        return Dimension("documentaire", label, BLOCKED, "Aucune pièce du DCE analysée.")
    notes = [m.message.rstrip(". ") for m in missing] + [c.message.rstrip(". ") for c in digest.conflicts]
    refs = [_src(v.source) for c in digest.conflicts for v in c.values][:4]
    if notes:
        return Dimension("documentaire", label, WARNING, " ; ".join(notes) + ".", refs)
    return Dimension(
        "documentaire",
        label,
        READY,
        f"{len(digest.documents)} pièce(s) analysée(s), sans contradiction relevée.",
    )


def _deadline(case: TenderCase, profile: CompanyProfile, today: date) -> Dimension:
    label = "Délai"
    if case.submission_deadline is None:
        return Dimension("delai", label, WARNING, "Date limite de remise non renseignée.")
    days = (case.submission_deadline.date() - today).days
    if days < 0:
        return Dimension("delai", label, BLOCKED, "La date limite de remise est dépassée.")
    text = f"{days} jour(s) avant la remise."
    if days < 3:
        return Dimension("delai", label, BLOCKED, text + " Trop court pour produire un dossier complet.")
    if days < 10:
        return Dimension("delai", label, WARNING, text + " Délai serré.")
    if profile.delai_mobilisation_jours is not None:
        text += f" Mobilisation GSMS : {profile.delai_mobilisation_jours} jour(s) après notification."
    return Dimension("delai", label, READY, text)


def _certifications(digest: WorkspaceDigest, profile: CompanyProfile) -> Dimension:
    label = "Certifications"
    held = {fold(c) for c in profile.certifications}
    asked: dict[str, list] = defaultdict(list)
    for c in digest.clauses:
        for name, pattern in _CERTIFICATIONS.items():
            if re.search(pattern, fold(c.text)):
                asked[name].append(c)
    if not asked:
        return Dimension("certifications", label, READY, "Aucune certification exigée relevée dans le DCE.")
    lacking = {n: cs for n, cs in asked.items() if not any(re.search(_CERTIFICATIONS[n], h) for h in held)}
    if not lacking:
        return Dimension(
            "certifications", label, READY, f"Certifications demandées détenues : {', '.join(sorted(asked))}."
        )
    mandatory = any(c.mandatory for cs in lacking.values() for c in cs)
    refs = [_src(c.source) for cs in lacking.values() for c in cs[:1]]
    text = f"Non détenues : {', '.join(sorted(lacking))}" + (
        " (exigées)." if mandatory else " (citées dans le DCE)."
    )
    return Dimension("certifications", label, BLOCKED if mandatory else WARNING, text, refs)


def _risks(digest: WorkspaceDigest) -> Dimension:
    label = "Risques"
    eliminatory = [r for r in digest.risks if r.kind == "eliminatoire"]
    others = [r for r in digest.risks if r.kind != "eliminatoire"]
    if not digest.risks:
        return Dimension("risques", label, READY, "Aucune pénalité ni clause éliminatoire relevée.")
    from gsms_core.tenders.views import RISK_LABELS

    counts: dict[str, int] = defaultdict(int)
    for r in digest.risks:
        counts[RISK_LABELS.get(r.kind, (r.kind, ""))[0].lower()] += 1
    text = ", ".join(f"{label} ({n})" for label, n in sorted(counts.items()))
    refs = [_src(r.source) for r in (eliminatory + others)[:4]]
    return Dimension("risques", label, WARNING, f"À relire avant décision : {text}.", refs)


def _dependencies(
    digest: WorkspaceDigest, rows: list[TenderRequirement], profile: CompanyProfile
) -> Dimension:
    label = "Dépendances"
    notes, refs, status = [], [], READY
    visits = [r for r in rows if not r.stale and r.type == "visite"]
    if visits and not all(
        r.status in (RequirementStatus.COVERED, RequirementStatus.NOT_APPLICABLE) for r in visits
    ):
        notes.append("visite des lieux obligatoire à planifier")
        refs.extend(_req(r) for r in visits[:2])
        status = WARNING
    subcontract = [c for c in digest.clauses if c.category == "sous_traitance"]
    if subcontract:
        notes.append("sous-traitance ou groupement évoqué dans le DCE")
        refs.extend(_src(c.source) for c in subcontract[:2])
        if profile.sous_traitance is False:
            status = WARNING
    return Dimension(
        "dependances",
        label,
        status,
        _sentence("; ".join(notes) or "Aucune dépendance relevée") + ".",
        refs,
    )


def _missing(case: TenderCase, digest: WorkspaceDigest, profile: CompanyProfile) -> Dimension:
    label = "Informations manquantes"
    notes = []
    if not digest.criteria:
        notes.append("critères d'attribution non trouvés dans le RC")
    if case.submission_deadline is None and not any(d.kind == "remise_offres" for d in digest.deadlines):
        notes.append("date de remise introuvable")
    notes.extend(f"profil GSMS : {f}" for f in profile.missing_fields())
    if not notes:
        return Dimension("manquantes", label, READY, "Rien de bloquant ne manque pour décider.")
    return Dimension("manquantes", label, WARNING, _sentence("; ".join(notes)) + ".")


def assess(
    case: TenderCase,
    digest: WorkspaceDigest | None,
    rows: list[TenderRequirement],
    profile: CompanyProfile,
    today: date,
) -> dict[str, Any]:
    if digest is None:
        dims = [
            Dimension(
                "documentaire", "Capacité documentaire", BLOCKED, "DCE non déposé ou pas encore analysé."
            )
        ]
    else:
        deadline = case.submission_deadline.date() if case.submission_deadline else None
        dims = [
            _human(digest, profile),
            _regulatory(digest, profile, deadline),
            _matrix_dimension(
                "technique",
                "Capacité technique",
                rows,
                None,
                "Aucune exigence obligatoire dans la matrice pour l'instant.",
            ),
            _financial(case, profile),
            _documentary(digest),
            _deadline(case, profile, today),
            _certifications(digest, profile),
            _matrix_dimension(
                "moyens",
                "Moyens matériels",
                rows,
                {"moyens_materiels"},
                "Aucun moyen matériel obligatoire relevé.",
            ),
            _risks(digest),
            _dependencies(digest, rows, profile),
            _missing(case, digest, profile),
        ]
    for d in dims:  # une même source citée deux fois n'apporte rien
        seen: set[str] = set()
        d.sources = [s for s in d.sources if not (s["label"] in seen or seen.add(s["label"]))]
    status = max((d.status for d in dims), key=_RANK.get)
    return {
        "status": status,
        "dimensions": [d.__dict__ for d in dims],
        "counts": {s: sum(1 for d in dims if d.status == s) for s in (READY, WARNING, BLOCKED)},
        "profile_missing": profile.missing_fields(),
    }
