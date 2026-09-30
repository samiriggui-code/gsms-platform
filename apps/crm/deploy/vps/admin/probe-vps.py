#!/usr/bin/env python3
"""Probe GSMS stack on VPS → status.json for admin UI."""
from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.request
from datetime import datetime, timezone


def mem_disk():
    load = os.getloadavg()
    mem = {}
    with open("/proc/meminfo") as f:
        for line in f:
            parts = line.split()
            mem[parts[0].rstrip(":")] = int(parts[1])
    total = mem.get("MemTotal", 0) * 1024
    avail = mem.get("MemAvailable", 0) * 1024
    st = os.statvfs("/")
    disk_total = st.f_frsize * st.f_blocks
    disk_free = st.f_frsize * st.f_bavail
    with open("/proc/uptime") as f:
        up = float(f.read().split()[0])
    return {
        "load1": round(load[0], 2),
        "load5": round(load[1], 2),
        "load15": round(load[2], 2),
        "memTotal": total,
        "memAvail": avail,
        "diskTotal": disk_total,
        "diskFree": disk_free,
        "uptimeSec": int(up),
    }


def http_get(url, headers=None, timeout=5):
    req = urllib.request.Request(url, headers=headers or {})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read(200).decode("utf-8", "replace")
            return r.status, body, int((time.time() - t0) * 1000)
    except Exception as e:
        code = getattr(e, "code", 0) or 0
        body = ""
        try:
            body = e.read(200).decode("utf-8", "replace")  # type: ignore[attr-defined]
        except Exception:
            body = str(e)
        return code, body, int((time.time() - t0) * 1000)


def ok_for(expect, code):
    if expect == "2xx":
        return 200 <= code < 300
    if expect == "2xx3xx":
        return 200 <= code < 400
    if expect == "401":
        return code in (200, 401)
    return code == expect


probes = [
    ("crm", "Comp CRM", "http://172.17.0.1:3040/", None, "https://crm.global-it-ss.com/", "plateforme", "2xx3xx"),
    ("comp", "Comp AI", "http://172.17.0.1:3030/", None, "https://comp.global-it-ss.com/", "plateforme", "2xx3xx"),
    ("qatrial", "QAtrial", "http://172.17.0.1:3051/", None, "https://qatrial.global-it-ss.com/", "plateforme", "2xx3xx"),
    ("grace", "Grace", "http://172.17.0.1:3052/healthz", None, "https://grace.global-it-ss.com/", "plateforme", "2xx"),
    ("mcp", "TenderAI MCP", "http://172.17.0.1:8090/mcp", None, "https://mcp.global-it-ss.com/mcp", "plateforme", "401"),
    ("memory", "Agent Memory", "http://172.17.0.1:8096/", None, "https://memory.global-it-ss.com/", "donnees", "2xx3xx"),
    ("hub", "Memory Hub", "http://172.17.0.1:8125/", None, "https://hub.global-it-ss.com/", "donnees", "2xx3xx"),
    ("minio", "MinIO", "docker://gsms-crm-minio", None, "https://minio.global-it-ss.com/", "donnees", "2xx"),
    ("comp-api", "Comp API", "http://172.17.0.1:3333/api/auth/get-session", None, "https://comp.global-it-ss.com/api/auth/get-session", "plateforme", "2xx3xx"),
]

services = []
for id_, name, url, headers, href, group, expect in probes:
    code, body, ms = 0, "", 0
    if id_ == "minio":
        try:
            p = subprocess.run(
                [
                    "docker",
                    "exec",
                    "gsms-crm-minio",
                    "curl",
                    "-sf",
                    "http://127.0.0.1:9000/minio/health/live",
                ],
                capture_output=True,
                text=True,
                timeout=8,
            )
            code = 200 if p.returncode == 0 else 0
            body = (p.stdout or p.stderr or "")[:160]
        except Exception as e:
            code, body = 0, str(e)[:160]
    else:
        code, body, ms = http_get(url, headers)
    services.append(
        {
            "id": id_,
            "name": name,
            "url": href,
            "href": href,
            "group": group,
            "code": code,
            "ms": ms,
            "ok": ok_for(expect, code),
            "snippet": body.replace("\n", " ").replace('"', "")[:160],
        }
    )

containers = []
try:
    p = subprocess.run(
        ["docker", "ps", "-a", "--format", "{{.Names}}|{{.Status}}"],
        capture_output=True,
        text=True,
        timeout=10,
        check=True,
    )
    for line in p.stdout.splitlines():
        if "|" not in line:
            continue
        cname, status = line.split("|", 1)
        containers.append({"name": cname, "status": status, "running": status.startswith("Up")})
except Exception:
    pass

doc = {
    "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "host": "vps",
    "metrics": mem_disk(),
    "services": services,
    "containers": containers,
    "creds": {},
}
print(json.dumps(doc, indent=2))
