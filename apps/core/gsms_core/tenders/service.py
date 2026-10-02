from __future__ import annotations

import uuid
from dataclasses import asdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.db import utcnow
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.missions.models import Mission, MissionType
from gsms_core.missions.uri import core_uri
from gsms_core.tenders.models import GoNoGo, TenderCase
from gsms_core.tenders.scoring import Criterion, evaluate


class TenderError(ValueError):
    pass


class NotFound(LookupError):
    pass


def list_cases(session: Session, workspace_id: uuid.UUID) -> list[TenderCase]:
    return list(
        session.scalars(
            select(TenderCase)
            .where(TenderCase.workspace_id == workspace_id)
            .order_by(TenderCase.submission_deadline.asc().nullslast(), TenderCase.created_at.desc())
        )
    )


def get_case_by_mission(session: Session, workspace_id: uuid.UUID, mission_id: uuid.UUID) -> TenderCase:
    case = session.scalar(
        select(TenderCase).where(TenderCase.workspace_id == workspace_id, TenderCase.mission_id == mission_id)
    )
    if case is None:
        raise NotFound("dossier AO")
    return case


def open_case(
    session: Session,
    mission: Mission,
    *,
    title: str,
    actor: str,
    buyer: str | None = None,
    submission_deadline=None,
) -> TenderCase:
    if mission.type != MissionType.APPEL_OFFRES:
        raise TenderError("la mission doit être de type APPEL_OFFRES")
    existing = session.scalar(select(TenderCase).where(TenderCase.mission_id == mission.id))
    if existing is not None:
        raise TenderError("un dossier AO existe déjà pour cette mission")
    case = TenderCase(
        workspace_id=mission.workspace_id,
        mission_id=mission.id,
        title=title,
        buyer=buyer,
        submission_deadline=submission_deadline,
    )
    session.add(case)
    session.flush()
    record(
        session,
        actor=actor,
        action="tender.create",
        subject_uri=core_uri("tender", case.id),
        workspace_id=case.workspace_id,
        after={"title": title, "mission_id": str(mission.id)},
    )
    return case


def score_case(
    session: Session, case: TenderCase, criteria: list[Criterion], actor: str, go_threshold: float = 60.0
) -> TenderCase:
    result = evaluate(criteria, go_threshold)
    case.criteria = [asdict(c) for c in criteria]
    case.score = result.score
    case.recommendation = result.recommendation
    session.flush()
    record(
        session,
        actor=actor,
        action="tender.score",
        subject_uri=core_uri("tender", case.id),
        workspace_id=case.workspace_id,
        after={
            "score": result.score,
            "recommendation": result.recommendation.value,
            "blocking": result.blocking,
        },
    )
    return case


def decide(
    session: Session, case: TenderCase, decision: GoNoGo, *, decided_by: str, rationale: str
) -> TenderCase:
    """Décision humaine. La recommandation calculée n'est qu'un avis ; un écart doit être motivé."""
    if decision == GoNoGo.PENDING:
        raise TenderError("décision attendue : GO ou NO_GO")
    if case.decision != GoNoGo.PENDING:
        raise TenderError("décision déjà prise")
    if not rationale or not rationale.strip():
        raise TenderError("motivation obligatoire")
    if not decided_by.startswith("user:"):
        raise TenderError("la décision Go/No-Go est réservée à un humain")
    case.decision = decision
    case.decided_by = decided_by
    case.decided_at = utcnow()
    case.rationale = rationale.strip()
    session.flush()
    uri = core_uri("tender", case.id)
    record(
        session,
        actor=decided_by,
        action="tender.go_no_go.decide",
        subject_uri=uri,
        workspace_id=case.workspace_id,
        after={"decision": decision.value, "score": case.score, "recommendation": case.recommendation.value},
    )
    publish(
        session,
        EventEnvelope(
            type="tender.go_no_go.decided",
            source="core",
            subject=uri,
            workspace_id=case.workspace_id,
            mission_id=case.mission_id,
            actor=decided_by,
            data={
                "decision": decision.value,
                "score": case.score,
                "recommendation": case.recommendation.value,
                "overrides_recommendation": case.recommendation not in (GoNoGo.PENDING, decision),
            },
        ),
    )
    return case
