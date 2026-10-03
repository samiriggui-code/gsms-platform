"""Envoi SMTP (serveur de GSMS sur le VPS, Mailpit en local). Repris de gsms-qualiopi."""

from __future__ import annotations

import smtplib
from email import policy
from email.headerregistry import Address
from email.message import EmailMessage
from email.utils import make_msgid
from typing import Protocol

from gsms_core.settings import Settings


class Sender(Protocol):
    def send(
        self, *, to: str, to_name: str | None, subject: str, html: str, text: str, reply_to: str | None = None
    ) -> str: ...


def _address(name: str | None, email: str, utf8: bool) -> Address | str:
    """Adresse d'en-tête. Accents avant « @ » : Address les refuse, on écrit l'en-tête tel quel (SMTPUTF8)."""
    if not utf8 or email.isascii():
        return Address(name or "", addr_spec=email)
    safe = (name or "").replace('"', "")
    return f'"{safe}" <{email}>' if safe else email


class SmtpSender:
    def __init__(self, settings: Settings) -> None:
        self.cfg = settings

    def send(
        self, *, to: str, to_name: str | None, subject: str, html: str, text: str, reply_to: str | None = None
    ) -> str:
        cfg = self.cfg
        utf8 = not (to + cfg.smtp_from).isascii()
        msg = EmailMessage(policy=policy.SMTPUTF8 if utf8 else policy.SMTP)
        msg["Subject"] = subject
        msg["From"] = _address(cfg.smtp_from_name, cfg.smtp_from, utf8)
        msg["To"] = _address(to_name, to, utf8)
        if reply_to:
            msg["Reply-To"] = reply_to
        msg_id = make_msgid(domain=cfg.smtp_from.split("@")[-1] or "gsms.local")
        msg["Message-ID"] = msg_id
        msg.set_content(text)
        msg.add_alternative(html, subtype="html")
        smtp_cls = smtplib.SMTP_SSL if cfg.smtp_ssl else smtplib.SMTP
        with smtp_cls(cfg.smtp_host, cfg.smtp_port, timeout=20) as smtp:
            if cfg.smtp_starttls and not cfg.smtp_ssl:
                smtp.starttls()
            if cfg.smtp_user:
                smtp.login(cfg.smtp_user, cfg.smtp_password)
            if utf8:
                smtp.ehlo()
                if not smtp.has_extn("smtputf8"):
                    raise ValueError(f"adresse accentuée refusée par le serveur d'envoi : {to}")
                smtp.send_message(msg, mail_options=["SMTPUTF8"])
            else:
                smtp.send_message(msg)
        return msg_id
