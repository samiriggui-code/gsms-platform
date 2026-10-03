"""Matrice d'exigences d'un dossier AO, construite à partir du Digest (provenance conservée).

Le Digest repère ; la matrice garde la réponse humaine. Ordre de priorité quand plusieurs éléments
viennent du même passage du DCE : pièce à produire > effectif demandé > critère éliminatoire > clause
classée > obligation brute. Les pénalités vont dans l'onglet Risques, pas dans la matrice.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, replace
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.db import utcnow
from gsms_core.digest.classifier import fold
from gsms_core.digest.clauses import CATEGORY_LABELS
from gsms_core.digest.schemas import WorkspaceDigest
from gsms_core.documents.parsers.schemas import SourceRef
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.missions.uri import core_uri
from gsms_core.tenders.models import RequirementStatus, TenderCase, TenderRequirement
from gsms_core.tenders.views import describe_source, digest_of

TYPE_LABELS: dict[str, str] = {
    "piece": "Pièce à produire",
    "moyens_humains": "Moyens humains",
    "eliminatoire": "Critère éliminatoire",
    "critere": "Critère d'attribution",
    "obligation": "Obligation",
    **CATEGORY_LABELS,
}
TARGETS = ("administratif", "technique", "financier", "annexes")
TARGET_LABELS = {
    "administratif": "Administratif",
    "technique": "Technique",
    "financier": "Financier",
    "annexes": "Annexes",
}
# Thèmes qui ne sont pas des exigences à couvrir (ils vont dans l'onglet Risques).
EXCLUDED_CATEGORIES = frozenset({"penalites"})

_TARGET_BY_TYPE = {
    "attestations": "administratif",
    "visite": "administratif",
    "prix": "financier",
    "critere": "technique",
    "eliminatoire": "administratif",
}
_PIECE_TARGETS: tuple[tuple[str, str], ...] = (
    (r"bpu|dpgf|dqe|bordereau|decomposition|detail quantitatif|prix|devis|sous-detail", "financier"),
    (r"memoire|methodolog|cadre de reponse|planning|organigramme|\bcv\b|references", "technique"),
    (
        r"dc1|dc2|dume|kbis|urssaf|attestation|assurance|lettre de candidature|pouvoir|acte d.engagement"
        r"|\bae\b|rib|certificat|declaration",
        "administratif",
    ),
)


class RequirementError(ValueError):
    pass


@dataclass(frozen=True)
class Candidate:
    key: str
    type: str
    text: str
    mandatory: bool
    source: SourceRef
    target: str | None
    order: int = 0  # ordre d'apparition dans le Digest (départage dans un même passage)

    @property
    def place(self) -> tuple[str, str]:
        s = self.source
        return str(s.document_id), s.block_id or f"{s.sheet}!{s.cell}"

    def sort_key(self) -> tuple[Any, ...]:
        s = self.source
        nums = [int(n) for n in re.findall(r"\d+", s.block_id or s.cell or "")]
        return (s.filename, s.page or 0, s.sheet or "", nums, self.order)


def _piece_target(text: str) -> str:
    folded = fold(text)
    for pattern, target in _PIECE_TARGETS:
        if re.search(pattern, folded):
            return target
    return "annexes"


def candidates(digest: WorkspaceDigest) -> list[Candidate]:
    """Exigences proposées par le Digest, sans doublon pour un même passage du DCE."""
    ranked: list[tuple[int, Candidate]] = []
    for d in digest.deliverables:
        ranked.append((0, Candidate(d.id, "piece", d.label, True, d.source, _piece_target(d.label))))
    for r in digest.requirements:
        text = f"{r.value} — {r.source.excerpt}" if r.source.excerpt else r.value
        ranked.append((1, Candidate(r.id, "moyens_humains", text, True, r.source, "technique")))
    for k in digest.risks:
        if k.kind == "eliminatoire":
            ranked.append((2, Candidate(k.id, "eliminatoire", k.text, True, k.source, "administratif")))
    for c in digest.clauses:
        if c.category in EXCLUDED_CATEGORIES:
            continue
        target = _TARGET_BY_TYPE.get(c.category, "technique")
        ranked.append((3, Candidate(c.id, c.category, c.text, c.mandatory, c.source, target)))
    for o in digest.obligations:
        ranked.append((4, Candidate(o.id, "obligation", o.text, True, o.source, None)))
    for c in digest.criteria:
        weight = f" ({c.weight:g} {c.unit or '%'})" if c.weight is not None else ""
        ranked.append((5, Candidate(c.id, "critere", f"{c.label}{weight}", False, c.source, "technique")))

    # Un passage déjà couvert par une pièce, un effectif ou un critère éliminatoire n'est pas répété ;
    # une obligation déjà classée par thème (même phrase) non plus.
    specific = {cand.place for rank, cand in ranked if rank <= 2}
    classified = {(cand.place, cand.text) for rank, cand in ranked if rank == 3}
    out: dict[str, Candidate] = {}
    for order, (rank, cand) in enumerate(ranked):
        cand = replace(cand, order=order)
        if rank in (3, 4) and cand.place in specific:
            continue
        if rank == 4 and (cand.place, cand.text) in classified:
            continue
        out.setdefault(cand.key, cand)
    return sorted(out.values(), key=Candidate.sort_key)


def list_requirements(session: Session, case: TenderCase) -> list[TenderRequirement]:
    return list(
        session.scalars(
            select(TenderRequirement)
            .where(TenderRequirement.case_id == case.id)
            .order_by(TenderRequirement.code)
        )
    )


def _next_number(session: Session, case: TenderCase) -> int:
    codes = session.scalars(select(TenderRequirement.code).where(TenderRequirement.case_id == case.id))
    numbers = [int(c.split("-")[-1]) for c in codes if c and c.split("-")[-1].isdigit()]
    return max(numbers, default=0) + 1


@dataclass(frozen=True)
class SyncReport:
    added: int
    refreshed: int
    stale: int
    total: int


def sync_from_digest(
    session: Session, case: TenderCase, actor: str, digest: WorkspaceDigest | None = None
) -> SyncReport:
    digest = digest or digest_of(session, case.workspace_id)
    found = candidates(digest) if digest else []
    rows = {r.digest_key: r for r in list_requirements(session, case) if r.origin == "digest"}
    number = _next_number(session, case)
    added = refreshed = 0
    seen: set[str] = set()
    for cand in found:
        seen.add(cand.key)
        source = cand.source.model_dump(mode="json")
        row = rows.get(cand.key)
        if row is None:
            session.add(
                TenderRequirement(
                    case_id=case.id,
                    workspace_id=case.workspace_id,
                    code=f"REQ-{number:03d}",
                    origin="digest",
                    digest_key=cand.key,
                    type=cand.type,
                    text=cand.text,
                    mandatory=cand.mandatory,
                    source=source,
                    source_label=describe_source(cand.source),
                    target_document=cand.target,
                )
            )
            number += 1
            added += 1
        elif row.stale or row.text != cand.text or row.source != source:
            row.text, row.source, row.stale = cand.text, source, False
            row.source_label = describe_source(cand.source)
            refreshed += 1
    stale = 0
    for key, row in rows.items():
        if key not in seen and not row.stale:
            row.stale = True
            stale += 1
    session.flush()
    total = session.scalar(select(func.count()).where(TenderRequirement.case_id == case.id)) or 0
    report = SyncReport(added=added, refreshed=refreshed, stale=stale, total=total)
    if added or refreshed or stale:
        uri = core_uri("tender", case.id)
        data = {"added": added, "refreshed": refreshed, "stale": stale, "total": total}
        record(
            session,
            actor=actor,
            action="tender.requirements.sync",
            subject_uri=uri,
            workspace_id=case.workspace_id,
            after=data,
        )
        publish(
            session,
            EventEnvelope(
                type="tender.requirements.synced",
                source="core",
                subject=uri,
                workspace_id=case.workspace_id,
                mission_id=case.mission_id,
                actor=actor,
                data=data,
            ),
        )
    return report


EDITABLE = ("status", "owner", "planned_response", "evidence", "target_document", "mandatory", "type", "text")


def update_requirement(
    session: Session, case: TenderCase, requirement_id: uuid.UUID, changes: dict[str, Any], actor: str
) -> TenderRequirement:
    row = session.get(TenderRequirement, requirement_id)
    if row is None or row.case_id != case.id:
        raise LookupError("exigence")
    unknown = set(changes) - set(EDITABLE)
    if unknown:
        raise RequirementError(f"champs non modifiables : {', '.join(sorted(unknown))}")
    if "text" in changes and row.origin != "manual":
        raise RequirementError("le texte d'une exigence du DCE ne se modifie pas (il cite la source)")
    if changes.get("target_document") not in (None, *TARGETS):
        raise RequirementError("document cible inconnu")
    if "type" in changes and changes["type"] not in TYPE_LABELS:
        raise RequirementError("type d'exigence inconnu")
    before = {k: _plain(getattr(row, k)) for k in changes}
    for key, value in changes.items():
        if isinstance(value, str):
            value = value.strip() or None
        setattr(row, key, value)
    if row.status is None:
        row.status = RequirementStatus.TODO
    row.updated_by = actor
    row.updated_at = utcnow()
    session.flush()
    after = {k: _plain(getattr(row, k)) for k in changes}
    uri = core_uri("tender", case.id)
    record(
        session,
        actor=actor,
        action="tender.requirement.update",
        subject_uri=uri,
        workspace_id=case.workspace_id,
        before={"code": row.code, **before},
        after={"code": row.code, **after},
    )
    publish(
        session,
        EventEnvelope(
            type="tender.requirement.updated",
            source="core",
            subject=uri,
            workspace_id=case.workspace_id,
            mission_id=case.mission_id,
            actor=actor,
            data={"requirement_id": str(row.id), "code": row.code, "changes": after},
        ),
    )
    return row


def add_manual(
    session: Session, case: TenderCase, *, text: str, type_: str, mandatory: bool, actor: str
) -> TenderRequirement:
    if type_ not in TYPE_LABELS:
        raise RequirementError("type d'exigence inconnu")
    row = TenderRequirement(
        case_id=case.id,
        workspace_id=case.workspace_id,
        code=f"REQ-{_next_number(session, case):03d}",
        origin="manual",
        type=type_,
        text=text.strip(),
        mandatory=mandatory,
        source_label="Ajout manuel",
        updated_by=actor,
        updated_at=utcnow(),
    )
    session.add(row)
    session.flush()
    record(
        session,
        actor=actor,
        action="tender.requirement.create",
        subject_uri=core_uri("tender", case.id),
        workspace_id=case.workspace_id,
        after={"code": row.code, "type": type_, "text": row.text[:200]},
    )
    return row


def _plain(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def coverage(rows: list[TenderRequirement]) -> dict[str, Any]:
    live = [r for r in rows if not r.stale]
    counts = {s.value: sum(1 for r in live if r.status == s) for s in RequirementStatus}
    mandatory = [r for r in live if r.mandatory and r.status != RequirementStatus.NOT_APPLICABLE]
    covered = sum(1 for r in mandatory if r.status == RequirementStatus.COVERED)
    return {
        "total": len(live),
        "stale": len(rows) - len(live),
        "mandatory": len(mandatory),
        "mandatory_covered": covered,
        "coverage_rate": round(covered / len(mandatory), 4) if mandatory else None,
        "by_status": counts,
        "unassigned": sum(1 for r in live if not r.owner and r.status != RequirementStatus.NOT_APPLICABLE),
    }


def on_digest_updated(session: Session, event: EventEnvelope) -> None:
    """Abonné EventBus : un nouveau Digest met à jour la matrice du dossier AO (champs humains intacts)."""
    from gsms_core.digest.models import WorkspaceDigestRecord
    from gsms_core.digest.service import load_digest
    from gsms_core.tenders.dossier import current_case

    if event.workspace_id is None:
        return
    case = current_case(session, event.workspace_id)
    if case is None:
        return
    digest_id = event.data.get("digest_id")
    record_ = session.get(WorkspaceDigestRecord, uuid.UUID(digest_id)) if digest_id else None
    digest = load_digest(record_) if record_ is not None else None
    sync_from_digest(session, case, actor="service:core", digest=digest)


def register(bus) -> None:
    bus.replace_group("tenders", [("digest.updated", on_digest_updated)])
