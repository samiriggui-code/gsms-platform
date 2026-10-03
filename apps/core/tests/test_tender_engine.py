"""Moteur AO : le Core transmet un dossier WS-AO au MCP (ao_workspace_load), sans jamais casser les écrans."""

from __future__ import annotations

import base64
import hashlib
import json
import uuid

import httpx
import pytest
from sqlalchemy import select

from gsms_core.context.models import BindingStatus, WorkspaceApplicationBinding
from gsms_core.documents.parsers import DoclingAdapter
from gsms_core.mcp_gateway.registry import ALLOWED_TOOLS
from gsms_core.settings import TENDERAI_MCP_DEFAULT_URL, Settings
from gsms_core.tenders import engine
from tests.fake_docling import CCTP, RC, FakeConverter
from tests.test_tender_dossier import create

RC_BYTES = b"%PDF reglement de consultation"
CCTP_BYTES = b"%PDF cahier des clauses techniques"


class AoServer:
    """MCP AO simulé : vérifie le jeton et renvoie ce que renverrait ao_workspace_load."""

    def __init__(self, status: int = 200, tool_error: bool = False) -> None:
        self.status = status
        self.tool_error = tool_error
        self.calls: list[dict] = []

    def __call__(self, req: httpx.Request) -> httpx.Response:
        if self.status != 200:
            return httpx.Response(self.status)
        assert req.headers["Authorization"] == "Bearer ao-token"
        msg = json.loads(req.content)
        if "id" not in msg:
            return httpx.Response(202)
        if msg["method"] == "initialize":
            return httpx.Response(
                200,
                json={"jsonrpc": "2.0", "id": msg["id"], "result": {"protocolVersion": "2025-06-18"}},
                headers={"Mcp-Session-Id": "ao-1"},
            )
        assert msg["params"]["name"] == "ao_workspace_load"
        args = msg["params"]["arguments"]
        self.calls.append(args)
        if self.tool_error:
            result = {"content": [{"type": "text", "text": "référence déjà liée"}], "isError": True}
        else:
            docs = [
                {
                    "filename": d["filename"],
                    "sha256": hashlib.sha256(base64.b64decode(d["content_base64"])).hexdigest(),
                }
                for d in args["documents"]
            ]
            payload = {
                "mcp_workspace_id": "mcpws-42",
                "workspace_id": args["workspace_id"],
                "reference": args["reference"],
                "documents": docs,
                "rejected": [],
                "capabilities": [
                    {"key": "workspace", "label": "Chargement du dossier", "tools": ["ao_workspace_load"]}
                ],
            }
            result = {
                "content": [{"type": "text", "text": json.dumps(payload)}],
                "structuredContent": payload,
                "isError": False,
            }
        return httpx.Response(200, json={"jsonrpc": "2.0", "id": msg["id"], "result": result})


@pytest.fixture
def converter(app):
    conv = FakeConverter({"RC.pdf": RC, "CCTP.pdf": CCTP})
    app.state.document_parser = DoclingAdapter(converter_factory=lambda: conv)
    return conv


@pytest.fixture
def configured(app, settings):
    settings.tenderai_mcp_token = "ao-token"
    settings.tenderai_mcp_url = "http://tenderai.test/mcp"
    app.state.settings = settings
    return settings


def _dossier_with_dce(client, staff):
    d = create(client, staff)
    r = client.post(
        f"/api/v1/workspaces/{d['workspace_id']}/tenders/{d['mission_id']}/dce",
        headers=staff,
        files=[
            ("files", ("RC.pdf", RC_BYTES, "application/pdf")),
            ("files", ("CCTP.pdf", CCTP_BYTES, "application/pdf")),
        ],
    )
    assert r.status_code == 201, r.text
    return d


def _url(d) -> str:
    return f"/api/v1/workspaces/{d['workspace_id']}/tenders/{d['mission_id']}/engine"


def _binding(session, d) -> WorkspaceApplicationBinding:
    session.expire_all()
    return session.scalar(
        select(WorkspaceApplicationBinding).where(
            WorkspaceApplicationBinding.gsms_workspace_id == uuid.UUID(d["workspace_id"]),
            WorkspaceApplicationBinding.application_id == "tender",
        )
    )


def test_registry_opens_ao_workspace_load_and_not_financial_proposal():
    assert "ao_workspace_load" in ALLOWED_TOOLS["tenderai"]
    assert "generate_financial_proposal" not in ALLOWED_TOOLS["tenderai"]


def test_default_mcp_url_is_the_docker_service():
    assert Settings().tenderai_mcp_url == TENDERAI_MCP_DEFAULT_URL == "http://gsms-tenderai-mcp:8090/mcp"
    assert Settings(tenderai_mcp_url="").tenderai_mcp_url == TENDERAI_MCP_DEFAULT_URL
    assert (
        Settings(tenderai_mcp_url="http://localhost:8000/mcp").tenderai_mcp_url == "http://localhost:8000/mcp"
    )


def test_engine_not_configured_is_shown_without_error(client, staff):
    d = create(client, staff)
    got = client.get(_url(d), headers=staff)
    assert got.status_code == 200 and got.json()["status"] == "non_configure"
    posted = client.post(_url(d), headers=staff)
    assert posted.status_code == 200
    assert posted.json()["status"] == "non_configure" and posted.json()["connected"] is False


def test_load_sends_pieces_and_activates_binding(client, staff, session, app, configured, converter):
    d = _dossier_with_dce(client, staff)
    assert _binding(session, d).status == BindingStatus.PENDING
    assert client.get(_url(d), headers=staff).json()["status"] == "jamais"

    server = AoServer()
    app.state.mcp_transport = httpx.MockTransport(server)
    r = client.post(_url(d), headers=staff)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "connecte" and body["connected"] and body["label"] == "Moteur AO connecté"
    assert body["documents_sent"] == 2 and body["reference"] == d["reference"]
    assert body["capabilities"] == [{"key": "workspace", "label": "Chargement du dossier"}]

    (args,) = server.calls
    assert args["workspace_id"] == d["workspace_id"] and args["reference"] == d["reference"]
    sent = {doc["filename"]: doc for doc in args["documents"]}
    assert base64.b64decode(sent["RC.pdf"]["content_base64"]) == RC_BYTES
    assert sent["CCTP.pdf"]["sha256"] == hashlib.sha256(CCTP_BYTES).hexdigest()
    assert sent["RC.pdf"]["kind"] == "rc"

    binding = _binding(session, d)
    assert binding.status == BindingStatus.ACTIVE and binding.external_workspace_id == "mcpws-42"
    assert client.get(_url(d), headers=staff).json()["connected"] is True

    history = client.get(
        f"/api/v1/workspaces/{d['workspace_id']}/tenders/{d['mission_id']}/history", headers=staff
    ).json()
    assert "tender.engine.load" in {h["action"] for h in history}


@pytest.mark.parametrize(
    ("server", "reason"),
    [
        (AoServer(status=401), "jeton"),
        (AoServer(status=502), "HTTP 502"),
        (AoServer(tool_error=True), "référence déjà liée"),
    ],
)
def test_engine_failure_never_breaks_screens(client, staff, session, app, configured, server, reason):
    d = create(client, staff)
    app.state.mcp_transport = httpx.MockTransport(server)
    r = client.post(_url(d), headers=staff)
    assert r.status_code == 200
    assert r.json()["status"] == "indisponible" and reason in r.json()["last_error"]
    assert _binding(session, d).status == BindingStatus.PENDING
    summary = client.get(f"/api/v1/workspaces/{d['workspace_id']}/tenders/{d['mission_id']}", headers=staff)
    assert summary.status_code == 200


def test_unreachable_engine_keeps_an_active_binding(client, staff, session, app, configured):
    d = create(client, staff)
    app.state.mcp_transport = httpx.MockTransport(AoServer())
    assert client.post(_url(d), headers=staff).json()["connected"] is True

    def down(req: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused", request=req)

    app.state.mcp_transport = httpx.MockTransport(down)
    body = client.post(_url(d), headers=staff).json()
    assert body["status"] == "indisponible" and body["last_error"] == "moteur AO injoignable"
    assert body["last_success_at"] is not None
    binding = _binding(session, d)
    assert binding.status == BindingStatus.ACTIVE and binding.external_workspace_id == "mcpws-42"


def test_oversized_piece_is_listed_not_sent(client, staff, app, configured, converter, monkeypatch):
    d = _dossier_with_dce(client, staff)
    monkeypatch.setattr(engine, "MAX_FILE_BYTES", len(RC_BYTES))
    server = AoServer()
    app.state.mcp_transport = httpx.MockTransport(server)
    body = client.post(_url(d), headers=staff).json()
    assert [doc["filename"] for doc in server.calls[0]["documents"]] == ["RC.pdf"]
    assert body["documents_skipped"][0]["filename"] == "CCTP.pdf"


def test_engine_is_team_only(client, staff, auth):
    d = create(client, staff)
    assert client.get(_url(d), headers=auth("owner")).status_code == 403
    assert client.post(_url(d), headers=auth("owner")).status_code == 403
