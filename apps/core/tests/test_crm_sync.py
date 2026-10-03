"""Pont CRM → Core : clients, contacts, et ouverture de la prestation quand une affaire est gagnée."""

from __future__ import annotations

import json
import uuid

import pytest
from sqlalchemy import func, select

from gsms_core.context.models import ClientApplicationBinding, Contact
from gsms_core.events.models import Event
from gsms_core.identity.models import Organization, Site, Workspace
from gsms_core.missions.models import Mission, MissionType
from gsms_core.security import sign_hmac_sha256

SECRET = "test-crm-secret"
URL = "/api/v1/integrations/crm/events"

COMPANY = {
    "id": "crm-co-1",
    "name": "Clinique du Parc",
    "domain": "clinique-du-parc.example",
    "city": "Grenoble",
    "country": "FR",
    "fields": {
        "siret": "123 456 789 00012",
        "cat_gorie_erp": "2e catégorie (701 à 1 500)",
        "types_dactivit_erp": "U",
    },
}


@pytest.fixture
def crm(app, client):
    app.state.settings.webhook_secrets["crm"] = SECRET
    app.state.settings.app_url = "https://gsms-security.com"

    def send(type_: str, data: dict, secret: str = SECRET):
        body = json.dumps({"type": type_, "data": data}).encode()
        return client.post(
            URL,
            content=body,
            headers={"X-GSMS-Signature": sign_hmac_sha256(secret, body), "content-type": "application/json"},
        )

    return send


def _deal(stage: str, mission: str = "appel-offres") -> dict:
    return {
        "id": "crm-deal-1",
        "name": "AO gardiennage et SSIAP 2027 — Clinique du Parc",
        "stage": stage,
        "amount": 180000,
        "currency": "EUR",
        "company": COMPANY,
        "fields": {"type_de_mission": mission},
    }


def test_signature_is_required(crm):
    assert crm("company.created", COMPANY, secret="faux").status_code == 401


def test_company_and_contact_become_client_and_contact(crm, session):
    r = crm("company.created", COMPANY)
    assert r.status_code == 200, r.text
    assert crm("company.created", COMPANY).json()["client_id"] == r.json()["client_id"]  # idempotent
    org = session.scalar(select(Organization).where(Organization.crm_company_ref == "crm-co-1"))
    assert org.name == "Clinique du Parc" and org.siren == "123456789"
    site = session.scalar(select(Site).where(Site.organization_id == org.id))
    assert site.name == "Clinique du Parc — Grenoble" and site.erp_category == "2" and site.erp_type == "U"
    assert session.scalar(select(func.count()).select_from(ClientApplicationBinding)) == 1

    contact = {
        "id": "crm-ct-1",
        "firstName": "Hélène",
        "lastName": "Roux",
        "email": "h.roux@clinique-du-parc.example",
        "title": "Responsable sécurité",
        "company": COMPANY,
    }
    r = crm("contact.created", contact)
    assert r.status_code == 200 and r.json()["contact_id"]
    row = session.get(Contact, uuid.UUID(r.json()["contact_id"]))
    assert row.organization_id == org.id and row.title == "Responsable sécurité"


def test_won_deal_opens_the_engagement_once(crm, session):
    open_deal = crm("deal.stage.changed", _deal("NEGOTIATION")).json()
    assert open_deal["workspace"] is None

    won = crm("deal.stage.changed", _deal("CLOSED_WON")).json()
    ws = won["workspace"]
    assert ws["created"] is True and ws["url"] == f"https://gsms-security.com/app/espace/{ws['id']}"
    workspace = session.get(Workspace, uuid.UUID(ws["id"]))
    mission = session.scalar(select(Mission).where(Mission.workspace_id == workspace.id))
    assert mission.type == MissionType.APPEL_OFFRES and mission.title == "AO gardiennage et SSIAP 2027"
    assert workspace.name == "Clinique du Parc — Grenoble — AO gardiennage et SSIAP 2027"

    again = crm("deal.closed", _deal("CLOSED_WON")).json()
    assert again["workspace"]["id"] == ws["id"] and again["workspace"]["created"] is False
    assert session.scalar(select(func.count()).select_from(Mission)) == 1
    types = set(session.scalars(select(Event.type).where(Event.workspace_id == workspace.id)))
    assert {"engagement.created", "crm.deal.stage.changed", "crm.deal.closed"} <= types


def test_mission_type_mapping_and_errors(crm, session):
    deal = _deal("CLOSED_WON", mission="commission-securite") | {"id": "crm-deal-2"}
    ws = crm("deal.stage.changed", deal).json()["workspace"]
    mission = session.scalar(select(Mission).where(Mission.workspace_id == uuid.UUID(ws["id"])))
    assert mission.type == MissionType.COMMISSION_SECURITE
    assert crm("deal.stage.changed", {"id": "x"}).status_code == 422
    assert crm("invoice.created", {}).status_code == 422
