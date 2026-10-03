"""Vues métier d'un dossier AO (onglets du portail), construites sur le Digest, les documents et l'audit.

Rien n'est recalculé ici : on rassemble ce que le Core sait déjà, avec la provenance de chaque donnée.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.audit.models import AuditLog
from gsms_core.db import utcnow
from gsms_core.digest.completeness import expected_documents
from gsms_core.digest.schemas import WorkspaceDigest
from gsms_core.digest.service import latest_digest, load_digest
from gsms_core.documents import parsing
from gsms_core.documents.models import Blob, Document, DocumentStatus, DocumentVersion
from gsms_core.documents.parsers.schemas import SourceRef
from gsms_core.identity.models import Role, User
from gsms_core.missions.models import MissionType
from gsms_core.tenders.models import TenderCase
from gsms_core.vault import folders as vault_folders
from gsms_core.vault.models import Folder

PIECE_LABELS = {**vault_folders.TYPE_FOLDER_NAMES, "autre": "Autre pièce", "a_classer": "En cours d'analyse"}

ACTION_LABELS = {
    "engagement.create": "Dossier AO créé",
    "tender.create": "Dossier de réponse ouvert",
    "tender.score": "Grille Go / No-Go calculée",
    "tender.go_no_go.decide": "Décision Go / No-Go",
    "tender.status.change": "Changement de statut",
    "document.upload": "Pièce déposée",
    "document.download": "Pièce consultée",
    "document.parse": "Analyse d'une pièce",
    "digest.build": "Digest reconstruit",
    "vault.folder.create": "Dossier créé dans le coffre-fort",
    "vault.document.move": "Pièce rangée",
    "vault.document.verify": "Intégrité vérifiée",
    "tender.requirements.sync": "Matrice d'exigences mise à jour",
    "tender.requirement.update": "Exigence modifiée",
    "tender.requirement.create": "Exigence ajoutée",
}

FIELD_LABELS = {
    "status": "statut",
    "owner": "responsable",
    "planned_response": "réponse prévue",
    "evidence": "preuve",
    "target_document": "document cible",
    "mandatory": "obligatoire",
    "type": "type",
    "text": "texte",
}


def digest_of(session: Session, workspace_id: uuid.UUID) -> WorkspaceDigest | None:
    record = latest_digest(session, workspace_id)
    return load_digest(record) if record is not None else None


def describe_source(src: SourceRef) -> str:
    """« CCTP.pdf p. 12 », « BPU.xlsx · Feuille1!B4 »."""
    where = src.filename
    if src.sheet:
        where += f" · {src.sheet}" + (f"!{src.cell}" if src.cell else "")
    elif src.page:
        where += f" p. {src.page}"
    if src.section:
        where += f" · {src.section}"
    return where


def _docs(session: Session, case: TenderCase, role: Role) -> list[Document]:
    docs = list(
        session.scalars(
            select(Document)
            .where(Document.workspace_id == case.workspace_id, Document.status != DocumentStatus.ARCHIVED)
            .order_by(Document.created_at)
        )
    )
    visible = vault_folders.visible_document_ids(session, case.workspace_id, role)
    return [d for d in docs if visible is None or d.id in visible]


def _versions(session: Session, docs: list[Document]) -> dict[uuid.UUID, tuple[DocumentVersion, Blob]]:
    ids = [d.current_version_id for d in docs if d.current_version_id]
    if not ids:
        return {}
    rows = session.execute(
        select(DocumentVersion, Blob)
        .join(Blob, Blob.id == DocumentVersion.blob_id)
        .where(DocumentVersion.id.in_(ids))
    )
    return {v.document_id: (v, b) for v, b in rows}


def pieces(session: Session, case: TenderCase, role: Role) -> list[dict[str, Any]]:
    """Pièces du DCE reçues (type reconnu par le Digest) puis pièces attendues encore absentes."""
    digest = digest_of(session, case.workspace_id)
    classified = {d.document_id: d for d in (digest.documents if digest else [])}
    expected = expected_documents(MissionType.APPEL_OFFRES)
    required_types = {t for alternatives in expected for t in alternatives}
    docs = [d for d in _docs(session, case, role) if d.mission_id in (None, case.mission_id)]
    statuses = parsing.parse_statuses(session, docs)
    versions = _versions(session, docs)

    rows: list[dict[str, Any]] = []
    present: set[str] = set()
    for doc in docs:
        info = classified.get(doc.id)
        kind = info.business_type if info else (doc.doc_type or "a_classer")
        present.add(kind)
        version = versions.get(doc.id)
        status = statuses.get(doc.id)
        rows.append(
            {
                "id": str(doc.id),
                "document_id": str(doc.id),
                "kind": kind,
                "label": PIECE_LABELS.get(kind, kind),
                "title": doc.title,
                "required": kind in required_types,
                "provided": True,
                "confidence": info.classification_confidence if info else None,
                "reason": info.classification_reason if info else None,
                "pages": info.page_count if info else None,
                "parse_status": status.value if status else None,
                "version": version[0].n if version else None,
                "updated_at": version[0].uploaded_at.isoformat() if version else None,
            }
        )
    for alternatives in expected:
        if present.intersection(alternatives):
            continue
        kind = alternatives[0]
        rows.append(
            {
                "id": f"missing:{'|'.join(alternatives)}",
                "document_id": None,
                "kind": kind,
                "label": " / ".join(PIECE_LABELS.get(t, t) for t in alternatives),
                "title": None,
                "required": True,
                "provided": False,
                "confidence": None,
                "reason": None,
                "pages": None,
                "parse_status": None,
                "version": None,
                "updated_at": None,
            }
        )
    return rows


def documents(session: Session, case: TenderCase, role: Role) -> list[dict[str, Any]]:
    docs = _docs(session, case, role)
    digest = digest_of(session, case.workspace_id)
    classified = {d.document_id: d.business_type for d in (digest.documents if digest else [])}
    statuses = parsing.parse_statuses(session, docs)
    versions = _versions(session, docs)
    folder_ids = {d.folder_id for d in docs if d.folder_id}
    folders = (
        {f.id: f.name for f in session.scalars(select(Folder).where(Folder.id.in_(folder_ids)))}
        if folder_ids
        else {}
    )
    rows = []
    for doc in docs:
        version = versions.get(doc.id)
        status = statuses.get(doc.id)
        kind = classified.get(doc.id) or doc.doc_type
        rows.append(
            {
                "id": str(doc.id),
                "title": doc.title,
                "kind": PIECE_LABELS.get(kind, kind) if kind else None,
                "folder": folders.get(doc.folder_id) if doc.folder_id else None,
                "version": version[0].n if version else None,
                "sha256": version[1].sha256 if version else None,
                "size": version[1].size if version else None,
                "origin": doc.source.value,
                "parse_status": status.value if status else None,
                "updated_at": version[0].uploaded_at.isoformat() if version else None,
            }
        )
    rows.sort(key=lambda r: r["updated_at"] or "", reverse=True)
    return rows


def _due(d: date, time: str | None = None) -> str:
    return f"{d.isoformat()}T{time}" if time else d.isoformat()


def deadlines(session: Session, case: TenderCase) -> list[dict[str, Any]]:
    today = utcnow().date()
    rows: list[dict[str, Any]] = []
    if case.submission_deadline is not None:
        rows.append(
            {
                "id": "submission",
                "title": "Remise de l'offre",
                "kind": "remise_offres",
                "due_at": case.submission_deadline.isoformat(),
                "status": "depassee" if case.submission_deadline.date() < today else "a_venir",
                "source": "Saisie du dossier",
            }
        )
    digest = digest_of(session, case.workspace_id)
    for dl in digest.deadlines if digest else []:
        rows.append(
            {
                "id": dl.id,
                "title": dl.label,
                "kind": dl.kind,
                "due_at": _due(dl.due_date, dl.due_time),
                "status": "depassee" if dl.due_date < today else "a_venir",
                "source": describe_source(dl.source),
                "excerpt": dl.source.excerpt,
            }
        )
    rows.sort(key=lambda r: r["due_at"])
    return rows


def actor_names(session: Session, actors: set[str]) -> dict[str, str]:
    ids = []
    for actor in actors:
        if actor.startswith("user:"):
            try:
                ids.append(uuid.UUID(actor.removeprefix("user:")))
            except ValueError:
                continue
    names = (
        {f"user:{u.id}": u.name for u in session.scalars(select(User).where(User.id.in_(ids)))} if ids else {}
    )
    labels = {"service:core": "Core", "service:workflow": "Workflow", "system:workspace_manager": "Core"}
    return {a: names.get(a) or labels.get(a) or a for a in actors}


def _summary(entry: AuditLog, folders: dict[str, str]) -> str:
    before, after = entry.before or {}, entry.after or {}
    if entry.action == "vault.document.move":
        return f"Rangée dans « {folders.get(str(after.get('folder_id')), 'un dossier')} »"
    if entry.action == "tender.status.change":
        from gsms_core.tenders.lifecycle import STATUS_LABELS

        labels = {k.value: v for k, v in STATUS_LABELS.items()}
        text = f"{labels.get(before.get('status'), '?')} → {labels.get(after.get('status'), '?')}"
        return f"{text} — {after['comment']}" if after.get("comment") else text
    if entry.action == "tender.go_no_go.decide":
        return f"Décision {after.get('decision')} (recommandation {after.get('recommendation')})"
    if entry.action == "document.upload":
        return f"Version {after.get('version')} · empreinte {str(after.get('sha256', ''))[:12]}…"
    if entry.action == "document.download":
        return f"Version {after.get('version')}"
    if entry.action == "tender.requirement.update":
        changed = [FIELD_LABELS.get(k, k) for k in after if k != "code"]
        status = f" → {after['status']}" if "status" in after else ""
        return f"{after.get('code', '')} : {', '.join(changed)}{status}"
    if entry.action == "tender.requirements.sync":
        return (
            f"{after.get('added', 0)} ajoutée(s), {after.get('refreshed', 0)} mise(s) à jour, "
            f"{after.get('stale', 0)} disparue(s) du DCE"
        )
    if entry.action == "tender.requirement.create":
        return f"{after.get('code', '')} : {after.get('text', '')}"
    if entry.action in ("tender.create", "engagement.create"):
        return str(after.get("title") or "")
    keys = ", ".join(f"{k} : {v}" for k, v in list(after.items())[:3] if isinstance(v, (str, int, float)))
    return keys


def history(session: Session, case: TenderCase, limit: int = 200) -> list[dict[str, Any]]:
    entries = list(
        session.scalars(
            select(AuditLog)
            .where(AuditLog.workspace_id == str(case.workspace_id))
            .order_by(AuditLog.id.desc())
            .limit(limit)
        )
    )
    names = actor_names(session, {e.actor for e in entries})
    folder_ids = set()
    for e in entries:
        if e.action == "vault.document.move" and e.after and e.after.get("folder_id"):
            try:
                folder_ids.add(uuid.UUID(str(e.after["folder_id"])))
            except ValueError:
                continue
    folders = (
        {str(f.id): f.name for f in session.scalars(select(Folder).where(Folder.id.in_(folder_ids)))}
        if folder_ids
        else {}
    )
    return [
        {
            "id": e.id,
            "at": e.at.isoformat() if isinstance(e.at, datetime) else str(e.at),
            "type": ACTION_LABELS.get(e.action, e.action),
            "action": e.action,
            "actor": names.get(e.actor, e.actor),
            "summary": _summary(e, folders),
        }
        for e in entries
    ]


RISK_LABELS = {
    "eliminatoire": ("Critère éliminatoire", "critique"),
    "resiliation": ("Clause de résiliation", "elevee"),
    "penalite": ("Pénalités", "elevee"),
    "astreinte": ("Astreinte", "moyenne"),
}


def analysis(session: Session, case: TenderCase) -> dict[str, Any]:
    """Lecture du DCE par thème (avec un exemple sourcé) et critères d'attribution pondérés."""
    from gsms_core.digest.clauses import CLAUSE_RULES

    digest = digest_of(session, case.workspace_id)
    if digest is None:
        return {"sections": [], "criteria": [], "criteria_total": None, "documents": 0}
    by_category: dict[str, list] = {}
    for clause in digest.clauses:
        by_category.setdefault(clause.category, []).append(clause)
    sections = []
    for key, label, _ in CLAUSE_RULES:
        items = by_category.get(key)
        if not items:
            continue
        first = items[0]
        mandatory = sum(1 for c in items if c.mandatory)
        sections.append(
            {
                "id": key,
                "title": label,
                "count": len(items),
                "mandatory": mandatory,
                "summary": f"{len(items)} passage(s), dont {mandatory} obligatoire(s) — {first.text[:180]}",
                "source": describe_source(first.source),
            }
        )
    criteria = [
        {
            "id": c.id,
            "label": c.label,
            "weight": c.weight,
            "unit": c.unit,
            "source": describe_source(c.source),
            "excerpt": c.source.excerpt,
        }
        for c in digest.criteria
    ]
    percents = [c.weight for c in digest.criteria if c.unit == "%" and c.weight is not None]
    return {
        "sections": sections,
        "criteria": criteria,
        "criteria_total": round(sum(percents), 2) if percents else None,
        "documents": len(digest.documents),
    }


def risks(session: Session, case: TenderCase) -> list[dict[str, Any]]:
    digest = digest_of(session, case.workspace_id)
    rows = []
    for risk in digest.risks if digest else []:
        title, severity = RISK_LABELS.get(risk.kind, (risk.kind, "moyenne"))
        rows.append(
            {
                "id": risk.id,
                "title": title,
                "kind": risk.kind,
                "severity": severity,
                "text": risk.text,
                "source": describe_source(risk.source),
            }
        )
    order = {"critique": 0, "elevee": 1, "moyenne": 2}
    rows.sort(key=lambda r: order.get(r["severity"], 3))
    return rows
