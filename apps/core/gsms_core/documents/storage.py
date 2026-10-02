"""Stockage objet : interface + implémentations LocalFS (dev/tests) et S3/MinIO (production)."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import BinaryIO, Protocol

from gsms_core.settings import Settings


def object_key_for(sha256: str) -> str:
    """Clé objet adressée par contenu. Voir README : le préfixe par workspace du §15 est incompatible
    avec une déduplication globale (sha256 unique) ; l'isolation est portée par Document/Version."""
    return f"sha256/{sha256[:2]}/{sha256}"


class Storage(Protocol):
    bucket: str

    def put_file(self, key: str, path: Path, content_type: str) -> None: ...
    def open(self, key: str) -> BinaryIO: ...
    def exists(self, key: str) -> bool: ...
    def delete(self, key: str) -> None: ...
    def presigned_url(self, key: str, expires_seconds: int = 300) -> str: ...


class LocalFSStorage:
    def __init__(self, root: Path, bucket: str = "gsms-documents") -> None:
        self.bucket = bucket
        self.root = Path(root).resolve() / bucket
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        p = (self.root / key).resolve()
        if not p.is_relative_to(self.root):
            raise ValueError("clé objet hors du bucket")
        return p

    def put_file(self, key: str, path: Path, content_type: str) -> None:
        dest = self._path(key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(".part")
        shutil.copyfile(path, tmp)
        tmp.replace(dest)

    def open(self, key: str) -> BinaryIO:
        return self._path(key).open("rb")

    def exists(self, key: str) -> bool:
        return self._path(key).is_file()

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)

    def presigned_url(self, key: str, expires_seconds: int = 300) -> str:
        return self._path(key).as_uri()


class S3Storage:
    """MinIO / S3 via boto3 (extra ``s3``). Squelette : non couvert par les tests unitaires."""

    def __init__(self, settings: Settings) -> None:
        try:
            import boto3
        except ImportError as exc:  # pragma: no cover - dépend de l'extra installé
            raise RuntimeError("boto3 requis pour GSMS_STORAGE_BACKEND=s3 (pip install '.[s3]')") from exc
        self.bucket = settings.s3_bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
        )

    def put_file(self, key: str, path: Path, content_type: str) -> None:
        self._client.upload_file(str(path), self.bucket, key, ExtraArgs={"ContentType": content_type})

    def open(self, key: str) -> BinaryIO:
        return self._client.get_object(Bucket=self.bucket, Key=key)["Body"]

    def exists(self, key: str) -> bool:
        try:
            self._client.head_object(Bucket=self.bucket, Key=key)
        except Exception:
            return False
        return True

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self.bucket, Key=key)

    def presigned_url(self, key: str, expires_seconds: int = 300) -> str:
        return self._client.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=expires_seconds
        )


def build_storage(settings: Settings) -> Storage:
    if settings.storage_backend == "s3":
        return S3Storage(settings)
    return LocalFSStorage(settings.storage_local_root, settings.s3_bucket)
