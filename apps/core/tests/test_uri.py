from __future__ import annotations

import pytest

from gsms_core.missions.uri import InvalidUri, parse_uri


@pytest.mark.parametrize(
    ("uri", "system", "kind", "ext"),
    [
        ("crm://deal/cl9x", "crm", "deal", "cl9x"),
        ("grace://finding/4f2a", "grace", "finding", "4f2a"),
        ("qatrial://capa/118", "qatrial", "capa", "118"),
        ("tender://rfp/ao-2026-77", "tender", "rfp", "ao-2026-77"),
        ("lexsocket://notice/FR-2026/123", "lexsocket", "notice", "FR-2026/123"),
        ("doc://version/0b8e", "doc", "version", "0b8e"),
    ],
)
def test_parse_known_schemes(uri, system, kind, ext):
    p = parse_uri(uri)
    assert (p.system, p.kind, p.external_id) == (system, kind, ext)
    assert str(p) == uri


@pytest.mark.parametrize(
    "uri",
    [
        "http://x/y",
        "grace://finding",
        "grace:/finding/1",
        "ftp://a/b",
        "grace://finding/../etc",
        "grace://fin ding/1",
        "",
    ],
)
def test_rejects_invalid(uri):
    with pytest.raises(InvalidUri):
        parse_uri(uri)


def test_external_ref_endpoint(client, auth, demo):
    m = client.get(f"/api/v1/workspaces/{demo.lyon}/missions", headers=auth("consultant")).json()[0]
    base = f"/api/v1/workspaces/{demo.lyon}/missions/{m['id']}/external-refs"
    r = client.post(base, json={"uri": "grace://assessment/a-12"}, headers=auth("consultant"))
    assert r.status_code == 201 and r.json()["system"] == "grace"
    assert client.post(base, json={"uri": "bogus://x/y"}, headers=auth("consultant")).status_code == 422
    assert [x["uri"] for x in client.get(base, headers=auth("lyon")).json()] == ["grace://assessment/a-12"]
