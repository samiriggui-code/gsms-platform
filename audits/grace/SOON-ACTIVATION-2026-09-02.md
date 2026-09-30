# GRACE lab — activation entrées « soon » (2026-09-02)

Patch local dans `apps/grace` (pas upstream). Objectif : brancher la sidebar sur le code existant + extrapoler le manquant.

| Entrée | Avant | Après |
|--------|--------|--------|
| Users | soon → `/admin/users` | Lien actif → `/admin/settings/users` (+ redirect legacy) |
| Action plans | soon `/tasks` | Page liste globale + `GET /api/action-plans` |
| Reports | soon `/reports` | Page PDF pour assessments APPROVED |
| Sites | soon | Admin sites = assets `SITE` + drawer existant |
| Audit log | soon | Feed snapshots `GET /api/audit-log` |
| Incidents | soon / Phase 2 | Modèle Prisma + CRUD `GET/POST/PATCH/DELETE /api/incidents` |

URLs : http://localhost:5173/incidents · /tasks · /reports · /audit · /admin/sites · /admin/settings/users
