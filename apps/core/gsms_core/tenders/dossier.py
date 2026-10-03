"""Dossier AO : un workspace dédié par appel d'offres, référence lisible, dépôt du DCE.

Le workspace d'un AO appartient à l'organisation GSMS, jamais à l'acheteur : la réponse (prix compris)
n'est visible que de l'équipe. Son identifiant lisible ``WS-AO-AAAA-NNNN`` est partagé avec les
applications (DocuLens, MCP AO, GRACE, QAtrial, CRM).
"""

from __future__ import annotations

import re
import uuid
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import PurePosixPath
from typing import BinaryIO

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from gsms_core.context.workspace_manager import WorkspaceManager
from gsms_core.db import utcnow
from gsms_core.documents import parsing
from gsms_core.documents import service as documents
from gsms_core.documents.models import Document, DocumentParse, DocumentSource, DocumentStatus
from gsms_core.identity.models import Organization, OrganizationKind, Workspace
from gsms_core.missions.models import Mission
from gsms_core.tenders.models import DossierStatus, TenderCase
from gsms_core.tenders.service import open_case
from gsms_core.vault import folders as vault_folders
from gsms_core.vault.storage import Vault

REFERENCE_PREFIX = "WS-AO"
_REFERENCE_RE = re.compile(rf"^{REFERENCE_PREFIX}-(\d{{4}})-(\d{{4,}})$")

# Garde-fous d'une archive DCE (zip bomb, arborescences absurdes).
MAX_ZIP_ENTRIES = 500
MAX_ZIP_TOTAL_BYTES = 2 * 1024 * 1024 * 1024
_IGNORED_NAMES = {"thumbs.db", "desktop.ini", ".ds_store"}


class DossierError(ValueError):
    pass


def gsms_organization(session: Session) -> Organization:
    org = session.scalar(
        select(Organization)
        .where(Organization.kind == OrganizationKind.GSMS)
        .order_by(Organization.created_at)
    )
    if org is None:
        raise DossierError("organisation GSMS absente : lancez le seed ou créez-la")
    return org


def next_reference(session: Session, year: int) -> str:
    prefix = f"{REFERENCE_PREFIX}-{year}-"
    taken = session.scalars(select(Workspace.reference).where(Workspace.reference.like(f"{prefix}%")))
    numbers = [int(m.group(2)) for r in taken if r and (m := _REFERENCE_RE.match(r))]
    return f"{prefix}{(max(numbers, default=0) + 1):04d}"


def create_dossier(
    session: Session,
    *,
    title: str,
    actor: str,
    buyer: str | None = None,
    consultation_ref: str | None = None,
    submission_deadline: datetime | None = None,
    estimated_amount: float | None = None,
) -> TenderCase:
    """Crée workspace AO + mission APPEL_OFFRES + dossier, avec la prochaine référence de l'année."""
    org = gsms_organization(session)
    year = utcnow().year
    for _ in range(5):
        reference = next_reference(session, year)
        try:
            with session.begin_nested():
                created = WorkspaceManager(session).create_workspace_for_engagement(
                    client_id=org.id,
                    site_id=None,
                    engagement_type="tender",
                    title=f"{reference} — {title}",
                    actor=actor,
                    reference=reference,
                    description=buyer,
                )
        except IntegrityError:
            continue  # référence prise entre-temps par une création concurrente
        break
    else:
        raise DossierError("impossible d'attribuer une référence de dossier")

    mission = session.get(Mission, created.engagement_id)
    assert mission is not None
    mission.title = title[:300]
    vault_folders.ensure_system_folders(session, created.workspace_id, actor)
    case = open_case(
        session,
        mission,
        title=title,
        actor=actor,
        buyer=buyer,
        submission_deadline=submission_deadline,
    )
    case.consultation_ref = consultation_ref
    case.estimated_amount = estimated_amount
    session.flush()
    return case


def current_case(session: Session, workspace_id: uuid.UUID) -> TenderCase | None:
    return session.scalar(
        select(TenderCase)
        .where(TenderCase.workspace_id == workspace_id)
        .order_by(TenderCase.created_at.desc())
        .limit(1)
    )


# --- Dépôt du DCE --------------------------------------------------------------------------------


@dataclass
class IngestedFile:
    document_id: uuid.UUID
    filename: str
    path: str
    version_created: bool
    deduplicated: bool
    parse_id: uuid.UUID | None = None


@dataclass
class SkippedEntry:
    name: str
    reason: str


@dataclass
class DceIngest:
    files: list[IngestedFile] = field(default_factory=list)
    skipped: list[SkippedEntry] = field(default_factory=list)

    @property
    def parse_ids(self) -> list[uuid.UUID]:
        return [f.parse_id for f in self.files if f.parse_id is not None]


def _entry_name(info: zipfile.ZipInfo) -> str:
    """Nom lisible : les archives Windows encodent souvent les accents en CP437/CP850 sans le signaler."""
    name = info.filename
    if info.flag_bits & 0x800:
        return name
    try:
        raw = name.encode("cp437")
    except UnicodeEncodeError:
        return name
    for encoding in ("utf-8", "cp850"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return name


def _is_zip(filename: str, stream: BinaryIO) -> bool:
    if filename.lower().endswith(".zip"):
        return True
    pos = stream.tell()
    head = stream.read(4)
    stream.seek(pos)
    return head == b"PK\x03\x04" and not filename.lower().endswith(
        (".docx", ".xlsx", ".xlsm", ".pptx", ".odt")
    )


class _Ingestor:
    def __init__(self, session: Session, vault: Vault, case: TenderCase, actor: str, max_bytes: int, parser):
        self.session = session
        self.vault = vault
        self.case = case
        self.actor = actor
        self.max_bytes = max_bytes
        self.parser = parser
        self.folder = vault_folders.ensure_system_folders(session, case.workspace_id, actor)["consultation"]
        self.result = DceIngest()

    def _existing(self, filename: str) -> Document | None:
        """Même nom de pièce déjà reçu : la nouvelle réception en devient une version (rectificatif)."""
        return self.session.scalar(
            select(Document)
            .where(
                Document.workspace_id == self.case.workspace_id,
                Document.mission_id == self.case.mission_id,
                Document.title == filename,
                Document.status != DocumentStatus.ARCHIVED,
            )
            .order_by(Document.created_at.desc())
            .limit(1)
        )

    def add(self, stream: BinaryIO, filename: str, path: str) -> None:
        existing = self._existing(filename)
        try:
            uploaded = documents.upload_document(
                self.session,
                self.vault,
                workspace_id=self.case.workspace_id,
                actor=self.actor,
                stream=stream,
                filename=filename,
                content_type=None,
                max_bytes=self.max_bytes,
                title=filename,
                mission_id=self.case.mission_id,
                document_id=existing.id if existing else None,
                note=f"DCE : {path}" if path != filename else "DCE",
                folder_id=self.folder.id,
            )
        except documents.UploadTooLarge as exc:
            self.result.skipped.append(SkippedEntry(path, str(exc)))
            return
        doc = uploaded.document
        if doc.source != DocumentSource.TENDER:
            doc.source = DocumentSource.TENDER
        parse: DocumentParse | None = None
        if uploaded.version_created:
            parse = parsing.request_parse(
                self.session, self.case.workspace_id, doc.id, self.parser, self.actor
            )
        self.result.files.append(
            IngestedFile(
                document_id=doc.id,
                filename=filename,
                path=path,
                version_created=uploaded.version_created,
                deduplicated=uploaded.blob_deduplicated,
                parse_id=parse.id if parse else None,
            )
        )

    def add_zip(self, stream: BinaryIO, archive_name: str) -> None:
        try:
            archive = zipfile.ZipFile(stream)
        except zipfile.BadZipFile:
            self.result.skipped.append(SkippedEntry(archive_name, "archive ZIP illisible"))
            return
        with archive:
            entries = [i for i in archive.infolist() if not i.is_dir()]
            if len(entries) > MAX_ZIP_ENTRIES:
                raise DossierError(f"archive trop volumineuse : plus de {MAX_ZIP_ENTRIES} fichiers")
            if sum(i.file_size for i in entries) > MAX_ZIP_TOTAL_BYTES:
                raise DossierError("archive trop volumineuse une fois décompressée")
            for info in entries:
                path = _entry_name(info)
                parts = PurePosixPath(path.replace("\\", "/")).parts
                name = parts[-1] if parts else ""
                if not name or "__MACOSX" in parts or name.startswith(".") or name.lower() in _IGNORED_NAMES:
                    continue
                if info.flag_bits & 0x1:
                    self.result.skipped.append(SkippedEntry(path, "fichier chiffré par mot de passe"))
                    continue
                if name.lower().endswith(".zip"):
                    self.result.skipped.append(
                        SkippedEntry(path, "archive imbriquée : déposez-la séparément")
                    )
                    continue
                if info.file_size > self.max_bytes:
                    self.result.skipped.append(SkippedEntry(path, "fichier trop volumineux"))
                    continue
                with archive.open(info) as member:
                    self.add(member, name, "/".join(parts))


def ingest_dce(
    session: Session,
    vault: Vault,
    case: TenderCase,
    uploads: list[tuple[str, BinaryIO]],
    *,
    actor: str,
    max_bytes: int,
    parser,
) -> DceIngest:
    """Range chaque pièce (ou le contenu d'un ZIP) dans « Dossier de consultation » et demande son analyse."""
    if case.status == DossierStatus.SUBMITTED:
        raise DossierError("dossier déjà déposé : le DCE ne peut plus être modifié")
    ingestor = _Ingestor(session, vault, case, actor, max_bytes, parser)
    for filename, stream in uploads:
        if _is_zip(filename, stream):
            ingestor.add_zip(stream, filename)
        else:
            ingestor.add(stream, filename, filename)
    return ingestor.result
