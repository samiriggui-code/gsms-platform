"""Planificateur des relances (repris de gsms-qualiopi, ``app/relances/planner.py``).

À chaque passage (worker toutes les N minutes, ou « Planifier maintenant »), chaque règle active examine
les prestations et crée les messages dus. Une occurrence (règle, objet, date, destinataire) ne produit
jamais deux messages ; une date passée depuis plus de ``rattrapage_jours`` jours n'est plus rattrapée.
"""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.communications import conditions, service, templates
from gsms_core.communications.models import Message
from gsms_core.communications.rules import WEEKDAYS, Rule, load_rules
from gsms_core.identity.models import Organization, Site, Workspace, WorkspaceStatus
from gsms_core.settings import Settings

ACTOR = "service:planificateur"


def _fr(d: date) -> str:
    months = [
        "janvier",
        "février",
        "mars",
        "avril",
        "mai",
        "juin",
        "juillet",
        "août",
        "septembre",
        "octobre",
        "novembre",
        "décembre",
    ]
    return f"{d.day} {months[d.month - 1]} {d.year}"


class Planner:
    def __init__(self, session: Session, settings: Settings, today: date) -> None:
        self.session = session
        self.today = today
        self.config = service.relance_settings(session)
        self.grace = int(self.config["rattrapage_jours"])
        self.app_url = settings.app_url.rstrip("/")
        self.organisme = service.organisme(session)
        self.created = 0

    # --- outils ---------------------------------------------------------------------------------------

    def _due_window(self, due: date) -> bool:
        return 0 <= (self.today - due).days <= self.grace

    def _workspaces(self) -> list[Workspace]:
        return list(self.session.scalars(select(Workspace).where(Workspace.status == WorkspaceStatus.ACTIVE)))

    def _context(self, ws: Workspace) -> dict:
        org = self.session.get(Organization, ws.organization_id)
        site = self.session.get(Site, ws.site_id) if ws.site_id else None
        return {
            "organisme": self.organisme,
            "prestation": ws.name,
            "client": org.name if org else "",
            "site": site.name if site else "",
        }

    def _vault_link(self, ws: Workspace, label: str) -> dict:
        return {"libelle": label, "lien": f"{self.app_url}/app/coffre-fort?ws={ws.id}"}

    def _create(
        self,
        rule: Rule,
        occurrence: str,
        ws: Workspace | None,
        context: dict,
        due: date,
        related_uri: str | None = None,
    ) -> None:
        for r in service.recipients(self.session, rule.destinataire, ws):
            values = context | {"destinataire": r.name or ""}
            rendered = templates.render(rule.modele, values)
            msg = service.create_message(
                self.session,
                rendered,
                rule_key=rule.cle,
                occurrence_key=f"{occurrence}|{r.email or r.name}",
                recipient=r,
                due_on=due,
                external=rule.externe,
                actor=ACTOR,
                workspace_id=ws.id if ws else None,
                related_uri=related_uri,
                needs_validation=rule.externe and bool(self.config["validation_externe"]),
            )
            self.created += msg is not None

    # --- règles ---------------------------------------------------------------------------------------

    def _pieces(self, rule: Rule) -> None:
        bucket = self.today.toordinal() // int(rule.frequence_jours)
        for ws in self._workspaces():
            pieces = conditions.missing_pieces(self.session, ws)
            if not pieces:
                continue
            already = self.session.scalar(
                select(Message.id).where(Message.rule_key == rule.cle, Message.workspace_id == ws.id).limit(1)
            )
            context = self._context(ws) | {
                "pieces": pieces,
                "relance": already is not None,
                "action": self._vault_link(ws, "Déposer mes pièces"),
            }
            self._create(rule, f"{rule.cle}|{ws.id}|{bucket}", ws, context, self.today)

    def _deadlines(self, rule: Rule) -> None:
        for ws in self._workspaces():
            d = conditions.digest(self.session, ws)
            for deadline in conditions.tender_deadlines(self.session, ws):
                for offset in rule.decalages:
                    due = deadline.due_date + timedelta(days=offset)
                    if not self._due_window(due):
                        continue
                    context = self._context(ws) | {
                        "date_limite": _fr(deadline.due_date),
                        "heure": deadline.due_time or "",
                        "jours": -offset,
                        "nb_pieces": len(d.documents) if d else 0,
                        "nb_conflits": len(d.conflicts) if d else 0,
                        "nb_manquantes": len(conditions.missing_pieces(self.session, ws)),
                        "action": self._vault_link(ws, "Ouvrir la prestation"),
                    }
                    occurrence = f"{rule.cle}|{ws.id}|{deadline.due_date.isoformat()}|{offset}"
                    self._create(rule, occurrence, ws, context, due)

    def _conflicts(self, rule: Rule) -> None:
        for ws in self._workspaces():
            for c in conditions.conflicts(self.session, ws):
                values = [f"{v.value} — {v.source.filename}" for v in c.values]
                context = self._context(ws) | {
                    "conflit": c.message,
                    "valeurs": values,
                    "action": self._vault_link(ws, "Voir les pièces"),
                }
                key = f"conflict:{c.code}:{c.key}"
                self._create(rule, f"{rule.cle}|{ws.id}|{key}", ws, context, self.today, related_uri=key)

    def _deposits(self, rule: Rule) -> None:
        for ws in self._workspaces():
            for back in range(self.grace + 1):
                day = self.today - timedelta(days=back)
                pieces = conditions.client_deposits(self.session, ws, day)
                if not pieces:
                    continue
                context = self._context(ws) | {
                    "pieces": pieces,
                    "jour": _fr(day),
                    "action": self._vault_link(ws, "Voir les pièces"),
                }
                self._create(rule, f"{rule.cle}|{ws.id}|{day.isoformat()}", ws, context, day)

    def _weekly(self, rule: Rule) -> None:
        target = WEEKDAYS[rule.jour]
        due = self.today - timedelta(days=(self.today.weekday() - target) % 7)
        if not self._due_window(due):
            return
        workspaces = self._workspaces()
        week_ago = due - timedelta(days=7)
        deposits = sum(
            len(conditions.client_deposits(self.session, ws, week_ago + timedelta(days=i)))
            for ws in workspaces
            for i in range(7)
        )
        upcoming = []
        for ws in workspaces:
            for d in conditions.tender_deadlines(self.session, ws):
                if 0 <= (d.due_date - due).days <= 14:
                    upcoming.append(f"{_fr(d.due_date)} — {ws.name}")
        from gsms_core.communications.models import MessageStatus

        to_validate = self.session.scalars(
            select(Message.id).where(Message.status == MessageStatus.A_VALIDER)
        )
        failed = self.session.scalars(select(Message.id).where(Message.status == MessageStatus.ECHEC))
        context = {
            "organisme": self.organisme,
            "date": _fr(due),
            "nb_prestations": len(workspaces),
            "nb_depots": deposits,
            "nb_conflits": sum(len(conditions.conflicts(self.session, ws)) for ws in workspaces),
            "nb_manquantes": sum(len(conditions.missing_pieces(self.session, ws)) for ws in workspaces),
            "nb_a_valider": len(list(to_validate)),
            "nb_echecs": len(list(failed)),
            "echeances": sorted(upcoming),
            "action": {"libelle": "Ouvrir la messagerie", "lien": f"{self.app_url}/app/messagerie"},
        }
        iso = due.isocalendar()
        self._create(rule, f"{rule.cle}|{iso.year}-W{iso.week:02d}", None, context, due)

    def run(self) -> dict:
        if not self.config["actif"]:
            return {"inactif": True, "crees": 0}
        disabled = set(self.config["regles_desactivees"])
        handlers = {
            "PRESTATION": self._pieces,
            "ECHEANCE": self._deadlines,
            "CONFLIT": self._conflicts,
            "DEPOT": self._deposits,
            "HEBDO": self._weekly,
        }
        for rule in load_rules():
            if rule.cle not in disabled:
                handlers[rule.portee](rule)
        self.session.flush()
        return {"inactif": False, "crees": self.created}


def plan(session: Session, settings: Settings, today: date | None = None) -> dict:
    return Planner(session, settings, today or date.today()).run()
