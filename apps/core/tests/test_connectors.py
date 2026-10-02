from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

from gsms_core.connectors.base import CallContext, ConnectorError
from gsms_core.connectors.crm import CrmClient
from gsms_core.connectors.grace import GraceClient
from gsms_core.connectors.normalizer import FindingNormalizer, find_schema_path
from gsms_core.connectors.qatrial import QAtrialClient

REPO_ROOT = Path(__file__).resolve().parents[3]
EXAMPLES = json.loads((REPO_ROOT / "shared/contracts/finding.examples.json").read_text())["examples"]
CTX = CallContext(workspace_id="ws-lyon", mission_id="m-1", actor="user:42", correlation_id="corr-1")


class Recorder:
    def __init__(self, responder):
        self.requests: list[httpx.Request] = []
        self.responder = responder

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self.responder(request)


def _assert_gsms_headers(req: httpx.Request, token: str = "svc-token"):
    assert req.headers["X-GSMS-Workspace-Id"] == "ws-lyon"
    assert req.headers["X-GSMS-Mission-Id"] == "m-1"
    assert req.headers["X-GSMS-Actor"] == "user:42"
    assert req.headers["X-GSMS-Correlation-Id"] == "corr-1"
    assert req.headers["Authorization"] == f"Bearer {token}"


def test_schema_is_found_from_repo_root():
    assert find_schema_path() == REPO_ROOT / "shared/contracts/finding.schema.json"
    assert FindingNormalizer().strict


def test_grace_list_findings_validates_contract():
    invalid = {**EXAMPLES[0], "id": "grace-bad", "severity": "apocalyptique"}
    rec = Recorder(lambda r: httpx.Response(200, json={"findings": [*EXAMPLES, invalid]}))
    calls = []
    with GraceClient(
        "http://grace.test",
        "svc-token",
        transport=httpx.MockTransport(rec),
        on_call=lambda rec_, ctx: calls.append(rec_),
    ) as grace:
        result = grace.list_findings(CTX, site_id="site-lyon-01")
    req = rec.requests[0]
    assert req.url.path == "/api/findings" and req.url.params["site_id"] == "site-lyon-01"
    _assert_gsms_headers(req)
    assert [f["id"] for f in result.valid] == [e["id"] for e in EXAMPLES]
    assert len(result.rejected) == 1 and "severity" in result.rejected[0][1][0]
    assert calls[0].status == 200 and calls[0].correlation_id == "corr-1"


def test_normalizer_fail_soft_without_schema(tmp_path):
    n = FindingNormalizer(contracts_dir=tmp_path)
    assert not n.strict
    res = n.normalize([EXAMPLES[0], {"id": "x"}])
    assert len(res.valid) == 1 and not res.strict
    assert "version: champ requis" in res.rejected[0][1]


def test_qatrial_findings_and_create_capa():
    def responder(req: httpx.Request) -> httpx.Response:
        if req.method == "POST":
            return httpx.Response(201, json={"id": "capa-118", **json.loads(req.content)})
        return httpx.Response(200, json=[e for e in EXAMPLES if e["source"] == "qatrial"])

    rec = Recorder(responder)
    with QAtrialClient("http://qatrial.test/", "svc-token", transport=httpx.MockTransport(rec)) as qa:
        found = qa.list_findings(CTX, project_id="p-lyon")
        capa = qa.create_capa(
            CTX, project_id="p-lyon", title="Extincteurs", severity="critical", source_uri="action://1"
        )
    assert all(f["source"] == "qatrial" for f in found.valid)
    post = rec.requests[1]
    assert post.method == "POST" and post.url.path == "/api/capa"
    _assert_gsms_headers(post)
    assert json.loads(post.content) == {
        "projectId": "p-lyon",
        "title": "Extincteurs",
        "severity": "critical",
        "sourceUri": "action://1",
    }
    assert capa["id"] == "capa-118"


def test_crm_company_and_deal():
    def responder(req: httpx.Request) -> httpx.Response:
        kind, ident = req.url.raw_path.decode().split("?")[0].split("/")[-2:]
        return httpx.Response(200, json={"kind": kind, "id": ident})

    rec = Recorder(responder)
    with CrmClient("http://crm.test", "svc-token", transport=httpx.MockTransport(rec)) as crm:
        assert crm.get_company(CTX, "c1") == {"kind": "companies", "id": "c1"}
        assert crm.get_deal(CTX, "d/2")["id"] == "d%2F2"  # identifiant échappé, pas de traversée
    _assert_gsms_headers(rec.requests[0])


def test_connector_errors():
    transport = httpx.MockTransport(lambda r: httpx.Response(503))
    with CrmClient("http://crm.test", transport=transport) as crm, pytest.raises(ConnectorError) as exc:
        crm.get_company(CTX, "c1")
    assert exc.value.status == 503

    def boom(_):
        raise httpx.ConnectError("refused")

    with (
        GraceClient("http://grace.test", transport=httpx.MockTransport(boom)) as grace,
        pytest.raises(ConnectorError),
    ):
        grace.list_findings(CTX)
