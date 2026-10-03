"""Chiffrement des fichiers du coffre-fort : AES-256-GCM par blocs, une clé par workspace.

- **Clé maître** (``GSMS_STORAGE_MASTER_KEY``, 32 octets en base64) : ne chiffre que les clés de workspace.
- **Clé de workspace** (32 octets aléatoires) : chiffre les fichiers d'un seul workspace. Stockée
  enveloppée par la clé maître (table ``vault_workspace_key``), jamais en clair. Une fuite de fichiers
  d'un client n'expose pas les autres ; changer de clé maître ne demande que de ré-envelopper les clés.
- **Format de fichier** (flux, mémoire constante) :
  ``MAGIC (6) | version de clé (4) | préfixe de nonce (8)`` puis, pour chaque bloc de 1 Mio :
  ``longueur (4) | bloc chiffré + tag (16)``. Nonce = préfixe ‖ numéro de bloc ; les données associées
  lient l'en-tête, le numéro de bloc et un drapeau « dernier bloc » : un bloc modifié, déplacé, retiré
  ou un fichier tronqué échoue au déchiffrement (``IntegrityError``).
"""

from __future__ import annotations

import base64
import os
import struct
from collections.abc import Iterator
from typing import BinaryIO

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAGIC = b"GSMSV1"
CHUNK_SIZE = 1024 * 1024
HEADER_SIZE = len(MAGIC) + 4 + 8
ALGORITHM = "aes256gcm-chunked-v1"


class IntegrityError(Exception):
    """Fichier altéré, tronqué ou chiffré avec une autre clé."""


class MissingMasterKey(RuntimeError):
    pass


def generate_key() -> bytes:
    return AESGCM.generate_key(bit_length=256)


def decode_master_key(value: str) -> bytes:
    try:
        key = base64.b64decode(value, validate=True)
    except ValueError as exc:
        raise MissingMasterKey("GSMS_STORAGE_MASTER_KEY doit être en base64") from exc
    if len(key) != 32:
        raise MissingMasterKey("GSMS_STORAGE_MASTER_KEY doit faire 32 octets (openssl rand -base64 32)")
    return key


def wrap_key(master: bytes, key: bytes, context: bytes) -> str:
    """Enveloppe une clé de workspace ; ``context`` (id du workspace) est authentifié."""
    nonce = os.urandom(12)
    return base64.b64encode(nonce + AESGCM(master).encrypt(nonce, key, context)).decode()


def unwrap_key(master: bytes, wrapped: str, context: bytes) -> bytes:
    raw = base64.b64decode(wrapped)
    try:
        return AESGCM(master).decrypt(raw[:12], raw[12:], context)
    except InvalidTag as exc:
        raise IntegrityError("clé de workspace illisible avec cette clé maître") from exc


def _aad(header: bytes, index: int, last: bool) -> bytes:
    return header + struct.pack(">I?", index, last)


def _read_exact(src: BinaryIO, n: int) -> bytes:
    buf = b""
    while len(buf) < n:
        chunk = src.read(n - len(buf))
        if not chunk:
            break
        buf += chunk
    return buf


def encrypt_stream(key: bytes, key_version: int, src: BinaryIO, dst: BinaryIO) -> None:
    aes = AESGCM(key)
    header = MAGIC + struct.pack(">I", key_version) + os.urandom(8)
    dst.write(header)
    prefix = header[-8:]
    index = 0
    current = _read_exact(src, CHUNK_SIZE)
    while True:
        following = _read_exact(src, CHUNK_SIZE) if len(current) == CHUNK_SIZE else b""
        last = not following
        sealed = aes.encrypt(prefix + struct.pack(">I", index), current, _aad(header, index, last))
        dst.write(struct.pack(">I", len(sealed)) + sealed)
        if last:
            return
        current = following
        index += 1


def read_header(src: BinaryIO) -> tuple[bytes, int]:
    header = _read_exact(src, HEADER_SIZE)
    if len(header) != HEADER_SIZE or not header.startswith(MAGIC):
        raise IntegrityError("en-tête de fichier chiffré absent ou invalide")
    return header, struct.unpack(">I", header[len(MAGIC) : len(MAGIC) + 4])[0]


def decrypt_stream(key: bytes, header: bytes, src: BinaryIO) -> Iterator[bytes]:
    """Déchiffre bloc par bloc (après ``read_header``) ; lève ``IntegrityError`` à la moindre altération."""
    aes = AESGCM(key)
    prefix = header[-8:]
    index = 0
    pending = _read_exact(src, 4)
    if len(pending) != 4:
        raise IntegrityError("fichier chiffré tronqué")
    while True:
        (length,) = struct.unpack(">I", pending)
        sealed = _read_exact(src, length)
        if len(sealed) != length:
            raise IntegrityError("fichier chiffré tronqué")
        pending = _read_exact(src, 4)
        last = not pending
        try:
            yield aes.decrypt(prefix + struct.pack(">I", index), sealed, _aad(header, index, last))
        except InvalidTag as exc:
            raise IntegrityError(f"bloc {index} altéré ou fichier tronqué") from exc
        if last:
            return
        if len(pending) != 4:
            raise IntegrityError("fichier chiffré tronqué")
        index += 1
