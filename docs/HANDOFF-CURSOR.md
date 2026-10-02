# Handoff Cursor → Claude

## 2026-10-02 — Spine AO Core (tenders + LexSocket)

Router HTTP `GET/POST /api/v1/workspaces/{ws}/tenders` :
- liste dossiers, ouverture case, summary, go-no-go GET + POST decision
- `GET …/tenders/opportunities` → LexSocket MCP (`get_open_opportunities` / `search_tenders`), best-effort (vide sans token)
- UI `/app/tenders` déjà branchée sur ces endpoints

Tests `test_tenders.py` étendus (HTTP + MCP mock). **Poussé** `60f47f5`.

**Ops :** `GSMS_LEXSOCKET_MCP_TOKEN` (+ URL) sur Core pour la veille live.

**Prochain :** connecteurs lecture Grace → findings / actions, ou onglets AO restants (pièces, analyse).

---

## 2026-10-02 — Vertical semaine 1 : dashboard + intake Core

**Dashboard** (`GET /api/v1/workspaces/{ws}/dashboard`) — agrégat attention / deadlines / missions / activity. Tests `test_dashboard.py` verts. UI `/app` déjà branchée.

**Intake** (`POST /api/v1/intake`, anonyme, `Idempotency-Key`) — crée org CLIENT + workspace TEMPORARY (ou inbox GSMS pour contact), mission `DRAFT` `origin=intake`, event `intake.request.received`, receipt idempotente. Relay CRM best-effort si `GSMS_CRM_URL` + `GSMS_CRM_PUBLIC_KEY`. Migration `0002_intake_receipt`. Tests `test_intake.py` (7) verts.

**Ops à faire sur VPS Core :** `alembic upgrade head` + redeploy Core ; poser `GSMS_CRM_PUBLIC_KEY` (= clé publique CRM) pour que `/demande` relaie jusqu’au CRM.

**Prochain vertical (sem. 2–3) :** spine AO — router Core `/tenders` + 1 outil MCP via `mcp_gateway` + `/app/tenders`.

---

## 2026-10-02 — Auth split pattern Grace / QAtrial / CRM

Pages auth alignées sur le pattern `apps/web` (`AuthBrandedLayout` #111721) :

- **Grace** — `AuthBrandedLayout` + Login/Register (bouclier GSMS, Retour au site, panneau italic, form FR)
- **QAtrial** — idem + ThemeToggle
- **CRM** — `auth-shell` + sign-in FR (Connexion / Se connecter / Contactez-nous)

Rebuild VPS fait (2026-10-02) : sync fichiers + `docker compose up -d --build --no-deps` sur grace `web`, qatrial `app`, crm `app`. Smoke : grace/qatrial 200, crm `/sign-in` 200 — fingerprints `111721` / `Retour au site` présents.

✅ traité — auth UI déployé sur VPS
