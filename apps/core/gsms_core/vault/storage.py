"""Écriture et lecture des fichiers du coffre-fort : chiffrés par workspace, intégrité vérifiée.

Toutes les applications passent par le Core (API) ; aucune n'accède au stockage objet directement.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import tempfile
import uuid
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gsms_core.documents.models import Blob
from gsms_core.documents.storage import Storage
from gsms_core.settings import Settings
from gsms_core.vault import crypto
from gsms_core.vault.models import WorkspaceKey

log = logging.getLogger(__name__)

# Clé maître de développement et de test UNIQUEMENT (refusée en production par Settings).
DEV_MASTER_KEY = base64.b64encode(hashlib.sha256(b"gsms-dev-vault-master-key").digest()).decode()


def object_key(workspace_id: uuid.UUID, sha256: str) -> str:
    """Un préfixe par workspace : les objets d'un client sont rangés et supprimables ensemble."""
    return f"ws/{workspace_id}/{sha256[:2]}/{sha256}.enc"


class Vault:
    def __init__(self, storage: Storage, master_key: str) -> None:
        self.storage = storage
        self.bucket = storage.bucket
        self._master = crypto.decode_master_key(master_key)

    @classmethod
    def from_settings(cls, storage: Storage, settings: Settings) -> Vault:
        key = settings.storage_master_key
        if not key:
            log.warning("GSMS_STORAGE_MASTER_KEY absente : clé maître de développement utilisée")
            key = DEV_MASTER_KEY
        return cls(storage, key)

    # --- secrets de configuration (mot de passe SMTP, clé API LLM) ------------------------------------

    def seal(self, value: str, context: str) -> str:
        """Chiffre un secret de configuration (clé maître) ; ``context`` (nom du réglage) est authentifié."""
        return crypto.wrap_key(self._master, value.encode("utf-8"), context.encode("utf-8"))

    def unseal(self, sealed: str, context: str) -> str:
        return crypto.unwrap_key(self._master, sealed, context.encode("utf-8")).decode("utf-8")

    # --- clés de workspace ---------------------------------------------------------------------------

    def _workspace_key(self, session: Session, workspace_id: uuid.UUID, version: int | None = None):
        stmt = select(WorkspaceKey).where(WorkspaceKey.workspace_id == workspace_id)
        if version is not None:
            stmt = stmt.where(WorkspaceKey.version == version)
        row = session.scalar(stmt.order_by(WorkspaceKey.version.desc()).limit(1))
        if row is None:
            if version is not None:
                raise crypto.IntegrityError(f"clé v{version} du workspace introuvable")
            current = session.scalar(
                select(func.max(WorkspaceKey.version)).where(WorkspaceKey.workspace_id == workspace_id)
            )
            row = WorkspaceKey(
                workspace_id=workspace_id,
                version=(current or 0) + 1,
                wrapped_key=crypto.wrap_key(self._master, crypto.generate_key(), workspace_id.bytes),
            )
            session.add(row)
            session.flush()
        return row.version, crypto.unwrap_key(self._master, row.wrapped_key, workspace_id.bytes)

    # --- écriture ------------------------------------------------------------------------------------

    def store(
        self,
        session: Session,
        workspace_id: uuid.UUID,
        plaintext: Path,
        *,
        sha256: str,
        size: int,
        mime: str,
    ) -> tuple[Blob, bool]:
        """Range un fichier en clair dans le coffre du workspace ; renvoie (blob, déjà présent)."""
        blob = session.scalar(select(Blob).where(Blob.workspace_id == workspace_id, Blob.sha256 == sha256))
        if blob is not None:
            return blob, True
        version, key = self._workspace_key(session, workspace_id)
        name = object_key(workspace_id, sha256)
        with tempfile.NamedTemporaryFile(prefix="gsms-vault-", delete=False) as tmp:
            tmp_path = Path(tmp.name)
            with plaintext.open("rb") as src:
                crypto.encrypt_stream(key, version, src, tmp)
        try:
            self.storage.put_file(name, tmp_path, "application/octet-stream")
        finally:
            tmp_path.unlink(missing_ok=True)
        blob = Blob(
            workspace_id=workspace_id,
            sha256=sha256,
            size=size,
            mime=mime,
            bucket=self.bucket,
            object_key=name,
            encryption=crypto.ALGORITHM,
            key_version=version,
        )
        session.add(blob)
        session.flush()
        return blob, False

    # --- lecture -------------------------------------------------------------------------------------

    def iter_plaintext(self, session: Session, blob: Blob) -> Iterator[bytes]:
        """Contenu en clair, bloc par bloc. Un fichier altéré lève ``crypto.IntegrityError``.

        La clé est résolue ici, avant le premier bloc : le flux peut ensuite être consommé après la fin
        de la session SQL (réponse HTTP en streaming).
        """
        src = self.storage.open(blob.object_key)
        try:
            if blob.encryption == "none":
                return _plain_chunks(src)
            if blob.workspace_id is None:
                raise crypto.IntegrityError("blob chiffré sans workspace")
            header, version = crypto.read_header(src)
            _, key = self._workspace_key(session, blob.workspace_id, version)
        except BaseException:
            src.close()
            raise
        return _decrypted_chunks(src, key, header)

    def copy_to(self, session: Session, blob: Blob, dest: Path) -> None:
        with dest.open("wb") as out:
            for data in self.iter_plaintext(session, blob):
                out.write(data)

    def verify(self, session: Session, blob: Blob) -> tuple[bool, str]:
        """Relit tout le fichier : authentification de chaque bloc + empreinte SHA-256 du contenu."""
        digest = hashlib.sha256()
        size = 0
        try:
            for data in self.iter_plaintext(session, blob):
                digest.update(data)
                size += len(data)
        except crypto.IntegrityError as exc:
            return False, str(exc)
        if digest.hexdigest() != blob.sha256 or size != blob.size:
            return False, "empreinte SHA-256 ou taille différente de celle enregistrée"
        return True, "intègre"


def _plain_chunks(src) -> Iterator[bytes]:
    try:
        while data := src.read(crypto.CHUNK_SIZE):
            yield data
    finally:
        src.close()


def _decrypted_chunks(src, key: bytes, header: bytes) -> Iterator[bytes]:
    try:
        yield from crypto.decrypt_stream(key, header, src)
    finally:
        src.close()
