"""Échange de fichiers avec le Core en base64 (aucun chemin local au serveur).

Le Core reste le stockage de référence : un fichier reçu est décodé en mémoire, contrôlé (taille, empreinte
SHA-256 annoncée), traité, puis oublié. Un fichier produit est renvoyé encodé, sans copie conservée.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import mimetypes
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any

from app.config import DEFAULT_MAX_FILE_MB

DEFAULT_MAX_BYTES = DEFAULT_MAX_FILE_MB * 1024 * 1024


class FileExchangeError(ValueError):
    pass


@dataclass(frozen=True)
class InboundFile:
    filename: str
    content: bytes
    sha256: str
    mime: str

    @property
    def size(self) -> int:
        return len(self.content)


def safe_filename(name: str) -> str:
    """Nom de fichier seul (jamais de chemin), sans caractère de contrôle."""
    base = PurePosixPath(str(name).replace("\\", "/")).name
    cleaned = "".join(c for c in base if c.isprintable() and c not in '<>:"|?*').strip(" .")
    if not cleaned:
        raise FileExchangeError("nom de fichier vide ou invalide")
    return cleaned[:200]


def decode_document(doc: dict[str, Any], max_bytes: int = DEFAULT_MAX_BYTES) -> InboundFile:
    """Décode ``{filename, content_base64, sha256?, mime?}`` ; refuse un fichier trop gros ou altéré."""
    if not isinstance(doc, dict):
        raise FileExchangeError("document attendu sous forme d'objet")
    filename = safe_filename(doc.get("filename") or "")
    encoded = doc.get("content_base64")
    if not isinstance(encoded, str) or not encoded:
        raise FileExchangeError(f"{filename} : contenu base64 absent")
    # Taille décodée bornée avant tout décodage (4 caractères base64 → 3 octets).
    if len(encoded) * 3 // 4 > max_bytes + 3:
        raise FileExchangeError(f"{filename} : fichier trop volumineux (plafond {max_bytes // (1024 * 1024)} Mo)")
    try:
        content = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise FileExchangeError(f"{filename} : base64 invalide") from exc
    if len(content) > max_bytes:
        raise FileExchangeError(f"{filename} : fichier trop volumineux (plafond {max_bytes // (1024 * 1024)} Mo)")
    digest = hashlib.sha256(content).hexdigest()
    announced = doc.get("sha256")
    if announced and str(announced).lower() != digest:
        raise FileExchangeError(f"{filename} : empreinte SHA-256 différente de celle annoncée")
    mime = doc.get("mime") or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    return InboundFile(filename=filename, content=content, sha256=digest, mime=str(mime))


@contextmanager
def materialize(file: InboundFile) -> Iterator[Path]:
    """Fichier temporaire le temps d'un traitement (les parseurs lisent un chemin), supprimé ensuite."""
    with tempfile.TemporaryDirectory(prefix="tenderai-") as tmp:
        path = Path(tmp) / file.filename
        path.write_bytes(file.content)
        yield path


def encode_file(path: str | Path, *, delete: bool = True) -> dict[str, Any]:
    """Fichier produit → ``{filename, mime, size, sha256, content_base64}`` ; supprimé du serveur par défaut."""
    p = Path(path)
    content = p.read_bytes()
    out = {
        "filename": p.name,
        "mime": mimetypes.guess_type(p.name)[0] or "application/octet-stream",
        "size": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
        "content_base64": base64.b64encode(content).decode("ascii"),
    }
    if delete:
        p.unlink(missing_ok=True)
    return out
