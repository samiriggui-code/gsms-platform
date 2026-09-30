# GSMS PLATFORM — ARCHITECTURE

**Statut :** 2026-09-04 — **source de vérité unique :** [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md)  
**Complément historique :** [`ARCHITECTURE-COMPLEMENT-TENCENT-INVOICEPILOT.md`](./ARCHITECTURE-COMPLEMENT-TENCENT-INVOICEPILOT.md)  
**Règle :** fusion des codebases **interdite** (Option D). Une brique à la fois (laptop → NUC).

> Si ce fichier et `STACK-GSMS-FINALE.md` divergent → **STACK-GSMS-FINALE gagne**.

---

## OBJECTIF

Chaîne métier GSMS, apps séparées, un seul cerveau agentique :

| Couche | Composant |
|--------|-----------|
| Entrée | **InvoicePilot** — vitrine + portail `_app` (pas un CRM) |
| Core / cockpit | **Comp AI CRM** (`apps/crm`) + **Eve** |
| AO — trouver | **LexSocket** |
| AO — répondre | **TenderAI MCP Max** |
| Audit physique | **GRACE** |
| CAPA | **QAtrial** |
| Cyber GRC (optionnel) | **Comp AI** (`apps/comp`) |
| Transport | Appels HTTP/MCP uniquement — **pas** de DB partagée |
| n8n / Circuit Worker | **Pas dans le core** tant qu’Eve suffit |

---

## Architecture globale

```text
                        CLIENT
                           │
                           ▼
                ┌────────────────────┐
                │   INVOICEPILOT     │
                │  VITRINE / PORTAIL │
                └─────────┬──────────┘
                          │  GSMS_PUBLIC_API_* 
                          │  (audit / AO intake)
                          ▼
                ┌────────────────────┐
                │  COMP AI CRM       │
                │  + EVE (pull)      │
                └─────────┬──────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     LexSocket      TenderAI MCP       GRACE
     (veille AO)    (répondre AO)   (audit terrain)
                                          │
                                          ▼
                                       QAtrial
                                        (CAPA)
```

---

## Rôles (ne pas confondre)

| Composant | Est | N’est pas |
|-----------|-----|-----------|
| InvoicePilot `_app` | Portail missions (souvent façade mémoire) | Le CRM / cockpit ops |
| Comp CRM | Cockpit commercial + Eve | Un moteur d’audit terrain |
| LexSocket | Recherche AO | Rédaction mémoire technique |
| TenderAI | Traitement AO | Veille multi-portails |
| GRACE | Sécurité physique / CSMP | Conformité SOC2 SaaS |
| Comp AI | Cyber / ISO / GDPR (si besoin) | Remplaçant de GRACE |
| Xacta (NUC) | Héritage ops jusqu’à bascule | Cible lab portable |

---

## Eve

- Un seul orchestrateur.  
- Eve **pull** (cron / AgentTask / tools).  
- MCP d’abord (TenderAI, LexSocket) ; REST pour GRACE au besoin.  
- Interdit : second agent parallèle, n8n « devant » Eve par défaut.

Intake vitrine → `POST /api/public/*` CRM = **entrée contrôlée**, pas un bus push multi-apps.

---

## Cas métier

**AO :** Vitrine ou veille LexSocket → Deal CRM → Eve → TenderAI → (si gagné) suite mission / audit.  
**Audit :** Vitrine → Deal CRM → Eve → GRACE → QAtrial → rapport.

---

## Règle avant tout nouveau code

> Cette fonction existe-t-elle déjà dans Comp CRM, Eve, TenderAI, LexSocket, GRACE ou QAtrial ?

Si OUI → utiliser l’existant. Pas de microservice / n8n / DB partagée / second scheduler.

---

## Chantiers

Voir priorités dans [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md) § Chantiers.

---

## Archive

Les sections Xacta-centrées, « Circuit Worker dans le core », et « InvoicePilot = GSMS Core » des versions 2026-09-03 sont **obsolètes**. Détail ops NUC : [`GSMS_STACK_STATUS.md`](./GSMS_STACK_STATUS.md).
