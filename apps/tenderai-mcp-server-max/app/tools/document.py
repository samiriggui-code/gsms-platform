"""Document Intelligence tools — RFP parsing, compliance matrix, deadlines, validation."""

from __future__ import annotations

import json
import logging
import shutil
from datetime import datetime, timedelta
from pathlib import Path

from mcp.server.fastmcp import FastMCP

from app.db.database import Database
from app.files import DEFAULT_MAX_BYTES, decode_document, encode_file, materialize
from app.services.docwriter import DocWriterService
from app.services.llm import LLMService
from app.services.parser import ParserService
from app.tools.ao import resolve_scope

logger = logging.getLogger(__name__)

# Statut d'une ligne de matrice proposée par le moteur : la conformité est toujours confirmée par une personne.
REVIEW_STATUS = "À vérifier"


def register_document_tools(
    mcp: FastMCP,
    db: Database,
    llm: LLMService,
    parser: ParserService,
    docwriter: DocWriterService,
    data_dir: Path,
    max_bytes: int = DEFAULT_MAX_BYTES,
) -> None:
    """Register all document intelligence tools on the MCP server."""

    async def _rfp(rfp_id: str, workspace_id: str | None) -> dict:
        scope = await resolve_scope(db, workspace_id)
        rfp = await db.get_rfp_in_workspace(rfp_id, scope)
        if not rfp:
            raise ValueError(f"RFP introuvable dans cet espace : {rfp_id}")
        return rfp

    @mcp.tool()
    async def parse_tender_rfp(
        file_path: str = "",
        document: dict | None = None,
        workspace_id: str | None = None,
    ) -> dict:
        """Parse a tender RFP document (PDF or DOCX) and extract structured data.

        Extracts the title, client, deadline, sections, requirements, and evaluation
        criteria using AI-powered analysis. Stores the parsed RFP in the database.

        Args:
            file_path: Path to the RFP document on this server (standalone use only)
            document: {filename, content_base64, sha256?} — required when workspace_id is set
            workspace_id: Core workspace of the tender (loaded first with ao_workspace_load)

        Returns:
            Dict with rfp_id, title, client, deadline, sections, requirements,
            and evaluation_criteria
        """
        scope = await resolve_scope(db, workspace_id)
        if scope is not None and document is None:
            raise ValueError("dossier du Core : transmettez la pièce en base64 (document), pas un chemin")
        if document is not None:
            inbound = decode_document(document, max_bytes)
            with materialize(inbound) as tmp_path:
                parsed = await parser.parse_file(str(tmp_path))
            stored_path = inbound.filename
        else:
            if not file_path:
                raise ValueError("file_path ou document requis")
            parsed = await parser.parse_file(file_path)
            stored_path = None
        text = parsed["text"]

        # Use LLM to structure the extracted text
        structure_prompt = (
            "Analyze this tender/RFP document and extract the following as JSON:\n"
            "{\n"
            '  "title": "full tender title",\n'
            '  "client": "issuing organization name",\n'
            '  "rfp_number": "reference number if found, or null",\n'
            '  "sector": "telecom|it|infrastructure|security|general",\n'
            '  "deadline": "submission deadline in YYYY-MM-DD format if found, or null",\n'
            '  "submission_method": "how to submit (email, portal, physical) if stated, or null",\n'
            '  "sections": {"section_name": "brief description of what this section covers"},\n'
            '  "requirements": ["list of specific technical and functional requirements"],\n'
            '  "evaluation_criteria": [{"criterion": "name", "weight": "percentage or description"}]\n'
            "}\n\n"
            "Return ONLY valid JSON, no markdown formatting.\n\n"
            f"Document text:\n{text[:15000]}"
        )

        result_text = await llm.generate(
            system_prompt="You are an expert at analyzing government and enterprise tender documents. Extract structured data accurately.",
            user_prompt=structure_prompt,
        )

        # Parse LLM response as JSON
        try:
            structured = json.loads(result_text.strip())
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block
            if "```json" in result_text:
                json_str = result_text.split("```json")[1].split("```")[0].strip()
                structured = json.loads(json_str)
            elif "```" in result_text:
                json_str = result_text.split("```")[1].split("```")[0].strip()
                structured = json.loads(json_str)
            else:
                raise ValueError(f"LLM did not return valid JSON: {result_text[:200]}")

        # Usage autonome : copie locale. Dossier du Core : rien n'est conservé (le Core garde la pièce).
        if stored_path is None:
            rfp_docs_dir = data_dir / "rfp_documents"
            rfp_docs_dir.mkdir(parents=True, exist_ok=True)
            dest_path = rfp_docs_dir / Path(file_path).name
            if Path(file_path).resolve() != dest_path.resolve():
                shutil.copy2(file_path, dest_path)
            stored_path = str(dest_path)

        # Store in database
        rfp = await db.create_rfp(
            workspace_id=scope,
            title=structured.get("title", "Untitled RFP"),
            client=structured.get("client", "Unknown"),
            sector=structured.get("sector", "telecom"),
            rfp_number=structured.get("rfp_number"),
            deadline=structured.get("deadline"),
            submission_method=structured.get("submission_method"),
            status="analyzing",
            file_path=stored_path,
            parsed_sections=structured.get("sections", {}),
            requirements=structured.get("requirements", []),
            evaluation_criteria=structured.get("evaluation_criteria", []),
        )

        logger.info("Parsed RFP: %s (id=%s)", rfp["title"], rfp["id"])

        return {
            "rfp_id": rfp["id"],
            "workspace_id": scope,
            "title": rfp["title"],
            "client": rfp["client"],
            "deadline": rfp["deadline"],
            "sections": rfp["parsed_sections"],
            "requirements": rfp["requirements"],
            "evaluation_criteria": rfp["evaluation_criteria"],
        }

    @mcp.tool()
    async def generate_compliance_matrix(
        rfp_id: str, output_format: str = "docx", workspace_id: str | None = None
    ) -> str | dict:
        """Generate a compliance matrix draft for an RFP: one proposed response per requirement.

        Every status is "À vérifier": a person confirms compliance, never the model.

        Args:
            rfp_id: ID of the parsed RFP
            output_format: Output format — "docx" (default) or "json"
            workspace_id: Core workspace of the tender (the DOCX is then returned in base64)

        Returns:
            JSON string, a file path (standalone) or {filename, content_base64, sha256…} (Core)
        """
        rfp = await _rfp(rfp_id, workspace_id)

        requirements = rfp["requirements"]
        if not requirements:
            raise ValueError(f"No requirements found for RFP {rfp_id}. Parse the RFP first.")

        # Generate compliance responses via LLM
        responses = []
        for req in requirements:
            req_text = req if isinstance(req, str) else req.get("requirement", str(req))
            narrative = await llm.generate_section(
                "compliance_narrative",
                f"Requirement: {req_text}\n\n"
                f"RFP Title: {rfp['title']}\n"
                f"Client: {rfp['client']}\n\n"
                "Rédige une réponse de conformité (2 à 3 phrases) expliquant comment notre offre répond à "
                "cette exigence. N'affirme rien qui ne figure pas dans l'exigence ou le contexte fourni.",
            )
            responses.append({
                "requirement": req_text,
                "status": REVIEW_STATUS,
                "narrative": narrative.strip(),
            })

        if output_format == "json":
            return json.dumps(responses, indent=2)

        # Generate DOCX
        req_dicts = [{"requirement": r if isinstance(r, str) else r.get("requirement", str(r))} for r in requirements]
        output_path = docwriter.create_compliance_matrix(req_dicts, responses)

        logger.info("Generated compliance matrix: %s", output_path)
        if rfp.get("workspace_id"):
            return encode_file(output_path)
        return output_path

    @mcp.tool()
    async def check_submission_deadline(rfp_id: str, workspace_id: str | None = None) -> dict:
        """Check the submission deadline for an RFP and calculate time remaining.

        Returns the deadline date, days remaining, urgency status, and recommended
        milestone dates for proposal preparation.

        Args:
            rfp_id: ID of the parsed RFP
            workspace_id: Core workspace of the tender (required for an RFP parsed in a workspace)

        Returns:
            Dict with deadline, days_remaining, status, and milestones
        """
        rfp = await _rfp(rfp_id, workspace_id)

        deadline_str = rfp.get("deadline")
        if not deadline_str:
            return {
                "deadline": None,
                "days_remaining": None,
                "status": "unknown",
                "message": "No deadline set for this RFP.",
                "milestones": [],
            }

        try:
            deadline = datetime.strptime(deadline_str, "%Y-%m-%d")
        except ValueError:
            return {
                "deadline": deadline_str,
                "days_remaining": None,
                "status": "unparseable",
                "message": f"Could not parse deadline format: {deadline_str}",
                "milestones": [],
            }

        now = datetime.now()
        days_remaining = (deadline - now).days

        if days_remaining < 0:
            status = "overdue"
        elif days_remaining <= 1:
            status = "critical"
        elif days_remaining <= 3:
            status = "urgent"
        elif days_remaining <= 7:
            status = "warning"
        elif days_remaining <= 14:
            status = "attention"
        else:
            status = "on_track"

        # Calculate milestone dates
        milestones = []
        milestone_defs = [
            (14, "Start proposal drafting"),
            (10, "Complete technical approach"),
            (7, "Internal review deadline"),
            (5, "Partner inputs due"),
            (3, "Final review and formatting"),
            (1, "Submission preparation"),
            (0, "Submission deadline"),
        ]
        for days_before, label in milestone_defs:
            m_date = deadline - timedelta(days=days_before)
            is_past = m_date < now
            milestones.append({
                "date": m_date.strftime("%Y-%m-%d"),
                "label": label,
                "days_before_deadline": days_before,
                "completed": is_past,
            })

        return {
            "rfp_title": rfp["title"],
            "deadline": deadline_str,
            "days_remaining": days_remaining,
            "status": status,
            "milestones": milestones,
        }

    @mcp.tool()
    async def validate_document_completeness(rfp_id: str, workspace_id: str | None = None) -> dict:
        """Validate that a proposal has all required sections and documents.

        Checks the RFP requirements against existing proposal sections and identifies
        any gaps or missing mandatory components.

        Args:
            rfp_id: ID of the parsed RFP
            workspace_id: Core workspace of the tender (required for an RFP parsed in a workspace)

        Returns:
            Dict with complete (bool), missing_sections, warnings, and section_status
        """
        rfp = await _rfp(rfp_id, workspace_id)

        proposals = await db.get_proposals_for_rfp(rfp_id)

        # Standard mandatory sections for government tenders
        mandatory_sections = [
            "Executive Summary",
            "Technical Approach",
            "Solution Architecture",
            "Implementation Methodology",
            "Project Timeline",
            "Team Qualifications",
            "Past Experience",
        ]

        # Check what sections exist in proposals
        existing_sections = set()
        if proposals:
            if isinstance(proposals, list):
                for prop in proposals:
                    for sec in prop.get("sections", []):
                        existing_sections.add(sec.get("title", "").lower())
            elif isinstance(proposals, dict):
                for sec in proposals.get("sections", []):
                    existing_sections.add(sec.get("title", "").lower())

        section_status = []
        missing = []
        for section in mandatory_sections:
            found = section.lower() in existing_sections
            section_status.append({"section": section, "present": found})
            if not found:
                missing.append(section)

        # Warnings
        warnings = []
        if not rfp.get("deadline"):
            warnings.append("No submission deadline set — risk of missing submission window.")
        if not rfp.get("requirements"):
            warnings.append("No requirements extracted from RFP — compliance matrix will be empty.")
        if not proposals:
            warnings.append("No proposal documents created yet.")

        complete = len(missing) == 0 and not any("No proposal" in w for w in warnings)

        return {
            "rfp_title": rfp["title"],
            "complete": complete,
            "missing_sections": missing,
            "section_status": section_status,
            "warnings": warnings,
            "total_sections": len(mandatory_sections),
            "completed_sections": len(mandatory_sections) - len(missing),
        }
