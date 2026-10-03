"""Digest GSMS : intelligence métier multi-document du Core (au-dessus des ``NormalizedDocument``).

Docling parse (moteur technique) ; le Digest comprend (classification métier, exigences,
obligations, échéances, livrables, risques, conflits, informations manquantes) en gardant la
provenance de chaque donnée. Il appartient au Core : ce n'est pas une application.
"""

from gsms_core.digest.engine import DigestEngine, WorkspaceMismatch
from gsms_core.digest.schemas import WorkspaceDigest

__all__ = ["DigestEngine", "WorkspaceDigest", "WorkspaceMismatch"]
