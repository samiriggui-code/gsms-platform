# Chantiers — adaptation métier + interconnexions circuit GSMS

**Date :** 2026-09-05
**Portée :** adaptation métier sécurité privée/incendie par app, connexions CRM/Eve ↔ apps ↔ front (et retour), tests/smoke associés.
**Hors scope volontaire :** unification visuelle (couleurs, UX, signature front commune) — chantier séparé, à traiter plus tard.
**Référence circuit :** [`circuit/FINDING-HARMONIZATION.md`](./circuit/FINDING-HARMONIZATION.md) · [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md)

---

## 0. État des lieux vérifié (pas de suppositions)

| App | Adaptation métier sécurité privée | Preuve |
|---|---|---|
| **GRACE** | Faite, avancée | i18n FR, packs `erp-precommission`, `site-surete`, `igh-precommission`, `sec-privee-cnaps`, `entreprise-risques`, RuleSets/Applicability, endpoint `circuit-handoff` |
| **QAtrial** | **Pas commencée** — 100% générique GxP/pharma | `templates/verticals/` = `pharma`, `meddevice`, `cro`, `logistics`, `software-csv` uniquement (`src/templates/registry.ts`) ; modèles Prisma = `CAPA`, `AuditFinding`, `BatchRecord`, `StabilityStudy`, `TMFZone`, `ConsentForm`... zéro rondes/agents/sites/habilitations |
| **Comp AI** (`apps/comp`) | **Sortie de stack** (2026-09-06) — salvage données dans `docs/circuit/controls/` | Voir `COMP-AI-DECOMPOSITION.md` ; ne plus adapter l’app |
| **TenderAI MCP Max** | Neutre par nature (AO générique) | 15 tools MCP (parse RFP, compliance matrix, proposal financier/technique, partenaires) — pas de logique propre à un secteur, réutilisable tel quel |
| **mcp-tenders** (LexSocket) | Sans objet | Proxy stdio/SSE vers service tiers, zéro code métier propre |
| **CRM** (`apps/crm`) | Partielle | `/api/public/tender-request` **et** `/api/public/audit-request` existent déjà (`public.controller.ts`) — **`docs/GSMS_INTEGRATION_MAP.md` est obsolète**, il marque encore `audit-request` comme "à créer". `/api/public/contact` n'existe toujours pas. Aucun modèle/endpoint "finding" côté CRM. |

---

## 1. Chantiers métier par app

### GRACE
Rien d'urgent — le socle métier est posé (cf. `PROGRAMME-ATTAQUE.md` phases 0–7). Reste ouvert : phase 7 imports réels (Xacta retiré du NUC, mapping à revoir), création session School auto (volontairement pas fait).

### QAtrial — décision prise (2026-09-06) : option A élargie — « virer le pharma, utiliser tout le potentiel »
**Stage 1 fait (2026-09-06)** :
- `registry.ts` : les 10 verticals pharma remplacés par 4 verticals sécurité — `securite_privee` (CSI Livre VI, CNAPS, ISO 18788), `incendie_prevention` (ERP/IGH, SSIAP, APSAD), `surete_entreprise` (intrusion R81, vidéoprotection CSI/CNIL, EN 50131), `datacenter_infra` (EN 50600, ISO 27001 Annexe A, convergence physique/cyber). 37 pays → 9 pays européens.
- 8 packs de templates pharma supprimés (`verticals/pharma`, `biotech`, `cro`, `meddevice`, `clinical-lab`, `cosmetics-chemical`, `logistics`, `software-csv`) ; 4 packs sécurité créés avec exigences + tests FR (cartes pro CNAPS, main courante, rondes, MAC, registre de sécurité, prescriptions de commission, SSIAP, droits d'accès, chaîne d'alarme, zonage datacenter, convergence control_ref).
- i18n fr/en (`public/locales/*/common.json` section `verticals`) + icônes wizard (`StepVertical.tsx`). Build Vite OK ; les 16 erreurs tsc restantes sont des imports inutilisés préexistants dans des fichiers non touchés.
- Les 15 modules fonctionnels génériques (CAPA, déviations, document control, formation, change control, risques, fournisseurs, réclamations, audit trail, e-signatures, validation, access control, backup, migration, reporting) sont conservés intégralement — c'est le « plein potentiel » de l'app.

**Stage 2 restant** : purge de la surface UI pharma résiduelle (écrans eTMF, eConsent, batches, stability, environmental monitoring — composants et routes serveur encore présents mais plus atteints par le wizard) + réécriture des `regulatoryRef` pharma (21 CFR/ICH) des 15 modules génériques en références FR — à faire avec validation réglementaire de Samir, pas d'invention de références.

### Comp AI — **SUPERSÉDÉ 2026-09-06 (soir)** : décortiquer → Grace/QAtrial → supprimer
**Ancienne décision** (garder Comp + seed SSP dans l’app) **annulée** par la consolidée §7 + demande user : pas de GRC Comp dans la stack.

**Fait :**
- Seed SSP-01…12 récupéré en donnée native : [`docs/circuit/controls/ssp-surete.json`](./circuit/controls/ssp-surete.json)
- Listes couverture ISO 27001 / SOC 2 (id + titre) : `iso27001-2022.json`, `soc2-tsc.json`
- Plan complet : [`COMP-AI-DECOMPOSITION.md`](./COMP-AI-DECOMPOSITION.md)

**Restant :** brancher SSP + module cyber dans **GRACE** (laptop → NUC) ; policy/calendrier **QAtrial** ; purge ops NUC/VPS Comp (`docker compose down` `/opt/gsms/comp`).

### TenderAI MCP Max
Pas de chantier métier identifié — les 15 tools sont déjà génériques AO. Vérifier seulement, au cas par cas, que `generate_compliance_matrix` sait ingérer un référentiel sécurité privée (ERP, CNAPS...) quand un AO l'exige — pas de reconstruction, juste vérifier l'input accepté.

### mcp-tenders
Aucun chantier métier — app tierce, rôle figé (recherche/veille).

### CRM / Eve
- Ajouter `/api/public/contact` (seul endpoint public encore manquant, cf. tableau §0).
- Corriger `docs/GSMS_INTEGRATION_MAP.md` (ligne `audit-request` marquée "à créer" alors qu'elle existe déjà) pour ne pas induire un futur agent en erreur.
- Aucun modèle "finding" ni endpoint de synthèse cross-app : c'est le chantier interconnexion §2, pas un chantier métier CRM en soi.

---

## 2. Interconnexions — CRM/Eve ↔ apps ↔ front (aller-retour)

### 2.1 Front (vitrine) → CRM — **en place, partiel**
| Flux | État |
|---|---|
| Formulaire devis/audit → `POST /api/public/audit-request` | **Existe** |
| Formulaire AO → `POST /api/public/tender-request` | **Existe** |
| Formulaire contact simple → `POST /api/public/contact` | **Fait 2026-09-05** — Contact + Activity + trigger Eve `contactCreated`, idempotent par `externalId`, honeypot + rate-limit (même pattern que tender/audit) |
| Tracking events → `/api/t/e` | **Existe** |

### 2.2 CRM → Eve — **en place pour les events CRM natifs**
`AgentTriggerService` écrit des `AgentTask` sur `companyCreated`, `contactCreated`, `companyRequested`, `meetingSoon`. Rien n'existe encore pour déclencher une tâche Eve depuis un événement métier externe (ex. "nouveau finding non-conforme critique reçu").

### 2.3 Eve → apps métier (GRACE / QAtrial / Comp AI / TenderAI) — **quasi tout à faire**
| Connexion | État |
|---|---|
| Eve → GRACE (déclencher/consulter un audit) | Pas d'API définie — `GSMS_INTEGRATION_MAP.md` marque "À brancher"/"À définir" |
| Eve → QAtrial (CAPA) | Pas d'API définie, et QAtrial n'a pas encore de vertical sécurité (§1) |
| Eve → Comp AI | Pas d'API définie — cohérent avec "brancher seulement si besoin confirmé" |
| Eve → TenderAI MCP Max | **Vérifié 2026-09-05 : pas branché.** Eve (`apps/crm/apps/agent`) a 27 tools, tous CRM, zéro client MCP. Seule l'infra est prête (Caddy → `:8090`, sonde probe.sh). C'est bien un chantier listé dans `STACK-GSMS-FINALE.md` §Chantiers (item 2), pas un existant. |

### 2.4 Apps métier → Eve (retour, la vraie synthèse cross-domaine) — **rien d'implémenté**
C'est le chantier `finding.schema.json` : GRACE/QAtrial/Comp AI/TenderAI exposent `/findings`, un agrégateur côté CRM/Eve les consulte. Contrat prêt (v0.1.0), zéro endpoint réel aujourd'hui.

### 2.5 CRM → Front (retour statut mission vers le client) — **à créer**
`GSMS_INTEGRATION_MAP.md` section B, ligne "Apps → status sync → Core → CRM" : marqué "à créer". Le client n'a aujourd'hui aucun moyen de voir l'avancement de son audit/AO depuis le site vitrine.

---

## 3. Tests / smoke à prévoir (par connexion, dans l'ordre où les chantiers ci-dessus seraient faits)

| Connexion | Test à écrire | Existe déjà ? |
|---|---|---|
| `POST /api/public/audit-request` | Smoke : payload valide → 200 + Deal/Company/Contact créés + `AgentTask` émise | À vérifier (probable, endpoint existant) |
| `POST /api/public/tender-request` | Idem | À vérifier |
| `POST /api/public/contact` | Smoke : payload minimal → Activity/Contact créé | **Fait (schema)** — `test/public-contact-schema.spec.ts` (4 tests) ; smoke HTTP réel à faire au déploiement |
| `GET /assessments/:id/circuit-handoff` (GRACE) | Validation du payload contre `precom-handoff.schema.json` | À vérifier si un test existe déjà côté Grace |
| `/findings` (chaque app) | Validation stricte du payload contre `finding.schema.json` (schema conformance, `additionalProperties:false`) | **Fait pour GRACE 2026-09-05** — `GET /api/findings` (module `circuit/findings.ts`) + test conformance `findings.test.ts` (8 tests, sync enums/required/examples avec le contrat). QAtrial/Comp/TenderAI : à écrire |
| Agrégateur Eve (`/findings` × 4 apps) | Test d'intégration : injecter un finding par source, vérifier que l'agrégateur les restitue tous avec le bon `source` | À écrire une fois l'agrégateur codé |
| Crosswalk `control_ref` | Test : deux findings de sources différentes partageant un `control_ref` sont bien liés côté agrégateur | À écrire, dépend de l'agrégateur |
| Eve → TenderAI MCP (client MCP) | Smoke end-to-end : Eve appelle un tool MCP réel (`parse_tender_rfp` par ex.) et reçoit une réponse exploitable | À écrire — priorité haute vu le doute au §2.3 |

---

## 4. Ordre suggéré (à valider, rien ne démarre sans ton feu vert)

1. ~~Vérifier connexion Eve ↔ TenderAI MCP~~ — **Fait 2026-09-05** : pas branchée (Caddy + probe seulement, zéro client MCP dans les 27 tools Eve). C'est un chantier à venir, pas un existant.
2. ~~Corriger `GSMS_INTEGRATION_MAP.md`~~ — **Fait 2026-09-05** (audit-request marqué EXISTS).
3. ~~Trancher QAtrial~~ — **Décidé + stage 1 fait 2026-09-06** (verticals sécurité, packs pharma virés, cf. §1). Stage 2 : purge UI pharma résiduelle + regulatoryRefs FR.
4. ~~Trancher Comp AI~~ — **Décidé + seed écrit 2026-09-06** (framework custom « Sûreté & Sécurité Physique », cf. §1). Reste : exécuter le seed contre la base, mapper les Controls.
5. ~~`/api/public/contact` côté CRM~~ — **Fait 2026-09-05** (`public.controller.ts` + `public-intake.service.ts` + `public.schemas.ts` + 4 tests, tsc clean).
6. ~~Endpoint `/findings` sur GRACE + test conformité~~ — **Fait 2026-09-05** : `GET /api/findings` (module `circuit/findings.ts`, filtres status/category/assessmentId/limit ; gaps ouverts→non_conforme, gaps fermés→conforme, threats→a_verifier) + 8 tests conformance (`findings.test.ts`) qui verrouillent enums/required/exemples contre le contrat. Limites P0 documentées dans le module : `client_id` via env `GSMS_CLIENT_ID`, `control_ref` synthétique en attendant le crosswalk.
7. Reproduire `/findings` sur QAtrial/Comp AI/TenderAI une fois 3-4 tranchés.
8. Agrégateur Eve + tests d'intégration cross-app.
9. Retour statut vers le front (§2.5).
10. Eve → client MCP TenderAI (constat du point 1 : à construire côté `apps/crm/apps/agent`).

L'unification visuelle front (couleurs, composants partagés, signature GSMS) reste un chantier à part, non traité ici, à ouvrir quand tu le dis.
