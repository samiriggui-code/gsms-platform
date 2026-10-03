"""Migration vers le coffre-fort : chiffre les fichiers d'avant le coffre-fort et range les pièces.

- Chaque blob en clair (``encryption = none``) est relu depuis l'ancien stockage, vérifié (SHA-256),
  puis réécrit chiffré dans le coffre de **chaque** workspace qui l'utilise ; les versions sont
  repointées. L'ancien blob est retiré de la base une fois inutilisé (le fichier d'origine n'est pas
  effacé : à supprimer à la main après vérification).
- Chaque document sans dossier rejoint « Pièces client » de son workspace.

Idempotent : relancer ne refait rien. Commande : ``python -m gsms_core.cli vault-migrate``.
"""

from __future__ import annotations

import hashlib
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.documents.models import Blob, Document, DocumentVersion
from gsms_core.documents.storage import Storage
from gsms_core.vault import folders
from gsms_core.vault.storage import Vault


@dataclass
class MigrationReport:
    blobs_encrypted: int = 0
    versions_repointed: int = 0
    documents_filed: int = 0
    legacy_blobs_removed: int = 0
    errors: list[str] = field(default_factory=list)


def migrate_legacy(session: Session, vault: Vault, legacy: Storage) -> MigrationReport:
    report = MigrationReport()
    for blob in list(session.scalars(select(Blob).where(Blob.encryption == "none"))):
        rows = session.execute(
            select(DocumentVersion, Document)
            .join(Document, Document.id == DocumentVersion.document_id)
            .where(DocumentVersion.blob_id == blob.id)
        ).all()
        by_ws: dict = {}
        for version, doc in rows:
            by_ws.setdefault(doc.workspace_id, []).append(version)
        if not legacy.exists(blob.object_key):
            report.errors.append(f"fichier absent pour le blob {blob.id} ({blob.object_key})")
            continue
        with tempfile.NamedTemporaryFile(prefix="gsms-migrate-", delete=False) as tmp:
            tmp_path = Path(tmp.name)
            digest = hashlib.sha256()
            with legacy.open(blob.object_key) as src:
                while data := src.read(1024 * 1024):
                    digest.update(data)
                    tmp.write(data)
        try:
            if digest.hexdigest() != blob.sha256:
                report.errors.append(f"empreinte différente pour le blob {blob.id} : non migré")
                continue
            for workspace_id, versions in by_ws.items():
                new_blob, existed = vault.store(
                    session, workspace_id, tmp_path, sha256=blob.sha256, size=blob.size, mime=blob.mime
                )
                report.blobs_encrypted += 0 if existed else 1
                for version in versions:
                    version.blob_id = new_blob.id
                    report.versions_repointed += 1
            session.flush()
            session.delete(blob)
            report.legacy_blobs_removed += 1
            session.commit()
        finally:
            tmp_path.unlink(missing_ok=True)

    for doc in list(session.scalars(select(Document).where(Document.folder_id.is_(None)))):
        doc.folder_id = folders.ensure_system_folders(session, doc.workspace_id, "service:core")["client"].id
        report.documents_filed += 1
    session.commit()
    return report
