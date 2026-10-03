from __future__ import annotations

import base64
import hashlib
import io
import json
from typing import Any

import pytest
from mcp.server.fastmcp import FastMCP

from app.db.database import Database
from app.services.docwriter import DocWriterService
from app.services.parser import ParserService
from app.tools.ao import register_ao_tools
from app.tools.document import register_document_tools
from app.tools.financial import register_financial_tools
from app.tools.technical import register_technical_tools

WS_A = "11111111-1111-4111-8111-111111111111"
WS_B = "22222222-2222-4222-8222-222222222222"
REF_A = "WS-AO-2026-0001"
REF_B = "WS-AO-2026-0002"


class FakeLLM:
    """Réponses fixes, sans appel réseau : le premier prompt qui contient une clé reçoit sa réponse."""

    def __init__(self, replies: dict[str, str] | None = None) -> None:
        self.replies = replies or {}
        self.calls: list[str] = []

    async def generate(self, system_prompt: str, user_prompt: str, context_documents=None, max_tokens=None) -> str:
        self.calls.append(user_prompt)
        for key, reply in self.replies.items():
            if key in user_prompt:
                return reply
        return "Texte proposé."

    async def generate_section(self, section_type: str, user_prompt: str, context_documents=None, max_tokens=None):
        return await self.generate(section_type, user_prompt, context_documents, max_tokens)


RFP_JSON = json.dumps(
    {
        "title": "Gardiennage du siège",
        "client": "Métropole",
        "sector": "security",
        "deadline": "2099-01-15",
        "requirements": ["Agents SSIAP 1 de 7 h à 19 h", "Rondes de nuit"],
        "evaluation_criteria": [{"criterion": "Valeur technique", "weight": "60 %"}],
    }
)

QUOTE_JSON = json.dumps(
    {
        "currency": "EUR",
        "items": [
            {"category": "hardware", "item_name": "Radio", "quantity": 4, "unit": "unit", "unit_cost": 120.0},
            {"category": "services", "item_name": "Installation", "quantity": 1, "unit": "unit", "unit_cost": 300.0},
        ],
    }
)


def b64_document(filename: str, content: bytes, **extra: Any) -> dict[str, Any]:
    return {
        "filename": filename,
        "content_base64": base64.b64encode(content).decode(),
        "sha256": hashlib.sha256(content).hexdigest(),
        **extra,
    }


def docx_bytes(text: str) -> bytes:
    from docx import Document

    doc = Document()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def xlsx_bytes(rows: list[list[Any]]) -> bytes:
    from openpyxl import Workbook

    wb = Workbook()
    for row in rows:
        wb.active.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@pytest.fixture
async def db(tmp_path):
    database = Database(tmp_path / "test.db")
    await database.connect()
    yield database
    await database.close()


@pytest.fixture
def llm() -> FakeLLM:
    return FakeLLM({"Analyze this tender": RFP_JSON, "vendor quote": QUOTE_JSON})


@pytest.fixture
def server(db, llm, tmp_path) -> FastMCP:
    mcp = FastMCP("test")
    data_dir = tmp_path / "data"
    parser = ParserService(data_dir=data_dir)
    docwriter = DocWriterService(output_dir=data_dir / "generated_proposals")
    max_bytes = 1024 * 1024
    register_ao_tools(mcp, db, max_bytes)
    register_document_tools(mcp, db, llm, parser, docwriter, data_dir, max_bytes)
    register_technical_tools(mcp, db, llm, parser, docwriter, data_dir, "GSMS")
    register_financial_tools(mcp, db, llm, parser, docwriter, data_dir, "EUR", 15.0, "GSMS", max_bytes)
    return mcp


async def call(mcp: FastMCP, name: str, arguments: dict[str, Any]) -> Any:
    """Appel d'un outil comme le ferait un client MCP ; renvoie la valeur Python produite par l'outil."""
    result = await mcp.call_tool(name, arguments)
    if isinstance(result, tuple):
        content, structured = result
        if isinstance(structured, dict) and set(structured) == {"result"}:
            return structured["result"]
        if structured is not None:
            return structured
        result = content
    text = "".join(getattr(block, "text", "") for block in result)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text
