"""Contexte métier central GSMS : résolution Client/Site/Engagement/Workspace + bindings apps."""

from __future__ import annotations

from gsms_core.context.applications import APPLICATION_REGISTRY, ApplicationId
from gsms_core.context.catalog import SERVICE_CATALOG
from gsms_core.context.resolver import ContextResolver, ResolvedContext
from gsms_core.context.workspace_manager import WorkspaceManager

__all__ = [
    "APPLICATION_REGISTRY",
    "ApplicationId",
    "SERVICE_CATALOG",
    "ContextResolver",
    "ResolvedContext",
    "WorkspaceManager",
]
