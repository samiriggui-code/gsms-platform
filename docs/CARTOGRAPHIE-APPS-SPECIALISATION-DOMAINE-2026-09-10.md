# Cartographie — spécialisation domaine (QAtrial / Grace / TenderAI MCP)

**Date :** 2026-09-10 · **Auteur :** Claude (audit lecture seule, 3 agents parallèles sur le code réel)
**Domaine cible :** conseil en sécurité privée / sécurité incendie / sûreté (France) — ERP, IGH, CNAPS, SSIAP, APSAD, commissions de sécurité.
**Méthode :** vérification du code réel (grep exhaustif + lecture ciblée fichier:ligne), pas des docs seules — les docs de référence (`CHANTIERS-METIER-INTERCONNEXION.md` 05-09, `QATRIAL-REFERENTIEL.md`/`CHANTIER-QATRIAL-REFONTE-FRONT.md` 07/08-09, `GSMS_STACK_STATUS.md` 05-09) ont servi de point de départ mais ont été recroisées avec le code, pas prises pour acquises.

---

## 0. Verdict en une ligne par app

| App | Verdict | Écart le plus grave |
|---|---|---|
| **Grace** | La plus avancée, contenu métier réel et vérifiable | **Mono-tenant structurel** — `client_id` = variable d'env globale, aucun modèle `Client` en base |
| **QAtrial** | Stage 1 (verticals) fait, mais résidus pharma **actifs** dans le parcours principal | Wizard étape 0 (`COMPLIANCE_PACKS`) et onglet Dashboard « ISO 13485 » pointent encore vers du pharma, montés en prod |
| **TenderAI MCP Max** | Cœur RFP neutre et réutilisable, mais `generate_compliance_matrix` ne peut pas ingérer un référentiel réglementaire | Statut de conformité codé en dur à `"Compliant"`, aucune connexion à la resource `standards://` |
| **mcp-tenders** | Confirmé neutre, proxy pur | Aucun — mais `package.json` pointe vers un fichier (`src/index.js`) qui n'existe pas dans le checkout |

---

## 1. GRACE — `apps/grace`

### 1.1 Packs de contrôles réels vs `server/data/controls/`

Écart avec la doc mémoire : les 5 packs métier FR (`erp-precommission`, `site-surete`, `igh-precommission`, `sec-privee-cnaps`, `entreprise-risques`) ne sont **pas** dans `server/data/controls/` mais dans `server/prisma/*_seed.json`. Contenu vérifié de haute qualité, ex. `erp_precommission_seed.json:1-71` : « GN 1 (RS 25/06/1980) — LEGIARTI000045143487 », « CCH R143-19 : 1re >1500 · 2e 701–1500... », « MS 45–52 · arrêté SSIAP 2/05/2005 ».

`server/data/controls/` contient en réalité : `ssp-surete.json` (12 entrées SSP-01…12, contenu propre GSMS, cite APSAD R81/R4/R5/R13, NF EN 50131, CSI L.251, EN 50600 — réel), et `iso27001-2022.json`/`soc2-tsc.json`/`control-prompts.json` — coquilles id/nom marquées **non-canon par leurs propres métadonnées** (`« do not treat Comp prose as GSMS canon »`, extraites de Comp AI).

### 1.2 Routes montées

`GET /api/controls`, `/api/controls/:slug` confirmées actives (`index.ts:117-118`), protégées par permission `assessments:read`.

### 1.3 Module cyber SSP — canal différent de ce qu'annonçaient les docs

Le seed SSP n'alimente **pas** le module cyber UI (`cyber.ts`/`CyberChecklistPage.tsx` ne connaissent que `iso27001-2022`/`soc2-tsc`). Il est en réalité consommé côté **findings**, pour enrichir automatiquement les gaps/menaces physiques par heuristique regex (`findings.ts:201-205,235`, `control-ref-map.ts:40-71`). Le module cyber lui-même n'a qu'**une seule réponse enregistrée** en base, manifestement un test (`notes: "smoke http laragon"`).

### 1.4 Multi-tenant — écart structurel confirmé, priorité haute

```ts
// findings.ts:118-120
function clientId(): string {
  return process.env.GSMS_CLIENT_ID?.trim() || 'grace-local';
}
```
`schema.prisma:1-3` : *« single-tenant instance »*, `Organization` = ligne singleton. `Threat`/`CountermeasureGap` n'ont que `assessmentId`, pas de `clientId`/`organizationId`. Aucun filtrage serveur multi-client possible aujourd'hui — une instance Grace = un client, point.

### 1.5 `GET /api/findings`

Existe, monté, testé contre `docs/circuit/contracts/finding.schema.json` (chargé dynamiquement, pas recopié à la main — pas de dérive silencieuse possible). Alignement enums/champs requis confirmé par lecture croisée.

### 1.6 Résidus / i18n

Aucun `TODO`/mock/placeholder détecté dans les modules audit/assessment. i18n FR : 1936 lignes vs 1932 EN (quasi 1:1, typé donc toute clé manquante casse la compilation), vocabulaire idiomatique réel, pas de calque.

### Écarts Grace priorisés
1. **Multi-client** — bloquant pour un usage cabinet-conseil multi-clients depuis une même instance/base.
2. Doc mémoire à corriger — confusion entre seeds Prisma (packs métier) et `server/data/controls/` (ISO/SOC2/SSP).
3. Module cyber peu représentatif — n'expose que ISO/SOC2 générique (non-canon), le vrai contenu FR (SSP) reste invisible en UI dédiée.
4. `iso27001-2022.json`/`soc2-tsc.json`/`control-prompts.json` restent des coquilles Comp AI — à enrichir ou remplacer si le module cyber doit devenir un vrai levier métier.

---

## 2. QATRIAL — `apps/qatrial`

### 2.1 `src/templates/registry.ts` (64 Ko, 1297 lignes) — confirmation partielle

`VERTICAL_DEFINITIONS` (l.20-84) : bien les 4 verticals sécurité (`securite_privee`, `incendie_prevention`, `surete_entreprise`, `datacenter_infra`), standards FR réels (CSI Livre VI, CNAPS, APSAD R1/R4/R5/R6/R13, SSIAP, NF EN 50131, EN 50600, NIS2/CER). **Fait.**

`MODULE_DEFINITIONS` (l.184-1268, les 15 modules génériques conservés) : **resté intégralement pharma/GxP en anglais** — `21 CFR 11.10(e)` (l.202), `21 CFR 820.90(a); ICH Q10` (l.384), `GAMP 5; 21 CFR Part 11; EU Annex 11` (l.947), `EU MDR Article 87` (l.905). **Pas fait** — c'est l'essentiel du poids des 64 Ko.

### 2.2 Résidus pharma actifs dans le parcours utilisateur principal (le plus grave)

**`COMPLIANCE_PACKS`** (`src/templates/packs/index.ts:20-102`) — 4 packs 100% pharma (`fda_csv`, `eu_mdr`, `fda_gmp`, `iso_gdpr`) référençant des verticals qui **n'existent plus**. Ces packs sont **l'étape 0 du wizard de création de projet** (`SetupWizard.tsx:58-64,364-367`) et **contournent** l'écran `StepVertical.tsx` qui, lui, n'affiche que les 4 verticals GSMS. Sélectionner un pack pharma charge dynamiquement des overlays qui existent toujours et sont exécutables : `regions/{us,eu,jp}/overlays/pharma.ts`, `regions/eu/overlays/meddevice.ts`.

**Onglet Dashboard « ISO 13485 »** (`DashboardPage.tsx:19,25,62,135`) — monté, visible en permanence, label même pas traduit (chaîne en dur), aucune condition liée au vertical du projet. Alimenté par `ISO13485Assessment.tsx`, `iso13485Clauses.ts`, `qmsrGap.ts` (prompt IA « FDA's QMSR / ISO 13485:2016 »).

**`demoProjects.ts`** — 15 projets démo, **tous** pharma/biotech/meddevice/CRO/logistics/software_it, **zéro** vertical GSMS. Accessible via « charger un projet de démo » dans le wizard.

**`src/types/index.ts` (`IndustryVertical`)** — le type central de l'app ne connaît **toujours pas** les 4 verticals GSMS, forçant un cast `as IndustryVertical` dans `SetupWizard.tsx:221`. C'est la racine structurelle qui explique pourquoi packs/démos/prompts IA ont pu rester pharma sans erreur de compilation.

### 2.3 Résidus orphelins (code mort, sans risque à supprimer)
- Modèles Prisma `BatchRecord`/`BatchStep`/`StabilityStudy`/`StabilitySample`/`TMFZone`/`TMFSection`/`TMFArtifact`/`ConsentForm`/`ConsentSignature` — 0 route serveur ne les référence.
- `src/lib/templates.ts` (`PROJECT_TEMPLATES`) — aucun import trouvé ailleurs dans `src`.

### 2.4 Résidu vivant à trancher (pas orphelin, décision produit)
- `gampCategory` (schema + `server/routes/systems.ts` + `SystemsPage.tsx`) — module Systems entier reste orienté CSV pharma, actif et routé. Pas d'équivalent GSMS défini — à garder tel quel (usage interne SI), renommer, ou retirer : décision produit, pas un fait à trancher seul.

### 2.5 Contenu réel des 4 packs sécurité — pas des coquilles
`securite_privee` (6 req + 3 tests : CNAPS carte pro, autorisation d'exercice, main courante, rondes, MAC), `incendie_prevention` (5 req + 3 tests : registre de sécurité, vérifications périodiques, levée de prescriptions, SSIAP, exercices), `surete_entreprise` (droits d'accès, APSAD R81, vidéoprotection RGPD/CNIL), `datacenter_infra` (zonage, APSAD R7/R13, convergence physique/cyber). Volume modeste (4-6 requirements/vertical) mais qualité correcte, cohérent avec le principe assumé « le référentiel terrain détaillé vit dans Grace, QAtrial porte le suivi CAPA ».

### 2.6 `POST /projects/compose`
Toujours inexistant côté serveur — confirmé inchangé depuis le 07-09. La composition reste 100% client (`composer.ts`).

### Écarts QAtrial priorisés
1. **`COMPLIANCE_PACKS` + overlays pharma** — actif dans le parcours principal, référence des verticals morts. À remplacer par des packs GSMS ou supprimer.
2. **Onglet Dashboard « ISO 13485 »** — à masquer/retirer.
3. **`demoProjects.ts`** — à réécrire avec des cas ERP/IGH/sûreté/datacenter.
4. **`IndustryVertical` (types/index.ts)** — racine structurelle, à corriger en premier pour que le reste devienne une erreur de compilation plutôt qu'un résidu silencieux.
5. **`MODULE_DEFINITIONS` (15 modules)** — le plus gros chantier de réécriture texte (`regulatoryRef` 21 CFR/ICH/GAMP → FR).
6. Prompts IA (`riskClassification.ts`, `qualityCheck.ts`, `generateTests.ts`, `gapAnalysis.ts`, `qmsrGap.ts`) — vocabulaire pharma/GxP.
7. i18n fr/en — chaînes visibles à l'écran (« GxP », « MedDevice Firmware », « Catégorie GAMP »).
8. Module Systems/`gampCategory` — décision produit à prendre.
9. Nettoyage sans risque : modèles Prisma orphelins + `PROJECT_TEMPLATES`.

---

## 3. TENDERAI MCP MAX — `apps/tenderai-mcp-server-max` + `apps/mcp-tenders`

### 3.1 Inventaire réel des tools — écart avec la doc ops

18 tools réels (`grep "@mcp.tool"` = 18), pas 20. `GSMS_STACK_STATUS.md:130` annonce "20 tools (18 stock + `save_proposal_index` + `get_proposal_details`)" — **ces deux tools n'existent nulle part dans le code**. Historique git : ils venaient du commit `4016dae` ("Refactor to data-tool pattern", 22 tools, sans `ANTHROPIC_API_KEY`), **revert intégralement 6 minutes plus tard** par `03a4b93` le même jour. Le HEAD actuel (`772335c`, identique à la version en prod documentée) est donc revenu à la version LLM-dépendante. **`CLAUDE.md:91` confirme `ANTHROPIC_API_KEY` requis** — le "mode data-tool sans clé Anthropic" décrit comme état de prod dans `GSMS_STACK_STATUS.md` ne correspond pas au code versionné. Soit la doc est obsolète, soit le serveur `:8090` a divergé du repo — à vérifier côté ops (hors de portée d'un audit lecture seule).

### 3.2 `generate_compliance_matrix` — le vrai gap métier

```python
# document.py:121-123
async def generate_compliance_matrix(rfp_id: str, output_format: str = "docx") -> str:
```
Aucun paramètre de référentiel. Lit uniquement `rfp["requirements"]`, extrait en vrac par LLM depuis le texte de l'AO (pas de champ article/norme/catégorie structuré). Une resource `standards://{standard_ref}` existe (`knowledge.py:125-142`, lit `data/knowledge_base/standards/{ref}.md`) mais **le dossier est vide** (juste un `.gitkeep`) et **`generate_compliance_matrix` ne l'appelle jamais** — mécanismes déconnectés.

**Découverte critique** : le statut de conformité est **codé en dur** — `"status": "Compliant"` (`document.py:157`) — pour chaque exigence, quel que soit le cas. Le tool génère une narrative justificative, jamais un verdict réel Non-Compliant. Ce n'est donc pas un simple « à vérifier au cas par cas » comme le supposait `CHANTIERS-METIER-INTERCONNEXION.md` — c'est un gap fonctionnel de fond si GSMS veut un vrai contrôle de conformité réglementaire.

### 3.3 Neutralité sectorielle — vraie pour le pipeline document, fausse pour le financier

Pas de branchement conditionnel par secteur (`if sector == ...`), mais vocabulaire trahissant une origine « intégrateur IT/télécom » :
- `sector: str = "telecom"` par défaut (`models.py:68`)
- Prompts système : *« senior proposal writer for a systems integrator »* (`llm.py:18,119`)
- `ingest_vendor_quote`/`build_bom` (`financial.py`) : modèle BOM fournisseurs matériel/logiciel réseau (exemples Cisco, Palo Alto) — **pas** un modèle jours-hommes/TJM typique d'une mission de conseil/audit GSMS. Écart structurel réel à considérer si le module financier doit servir à chiffrer des missions GSMS.

### 3.4 `mcp-tenders` — confirmé neutre
Proxy stdio/SSE pur vers LexSocket (`index.js:1-89`), passthrough sans transformation ni scoring. Aucune logique métier. Incohérence mineure signalée : `package.json` déclare `main: "src/index.js"` (v2.0.0, 23 tools annoncés) mais **ce fichier n'existe pas** — seul `index.js` racine (12 tools TED) est présent.

### 3.5 Eve → TenderAI MCP — toujours zéro client MCP, confirmé inchangé depuis le 05-09
Recherche exhaustive dans `apps/crm/apps/agent` : aucune occurrence de `@modelcontextprotocol`, `StreamableHTTPClientTransport`, `:8090`. `"tenderai"` existe comme valeur de type dans `FindingSource` (`findings-client.ts:6`, `query_findings.ts:10`) mais c'est un **placeholder non implémenté** — `queryFindings()` ne gère que `grace`/`qatrial`, aucun `TENDERAI_API_URL` nulle part. Infra ops (Caddy route + healthcheck probe.sh) confirmée existante mais sans aucun consommateur applicatif.

### Écarts TenderAI priorisés
1. **`generate_compliance_matrix`** — brancher sur `standards://` ou ajouter un paramètre de référentiel, retirer le hardcode `"Compliant"`. C'est le vrai chantier de spécialisation, pas une vérification triviale.
2. **Écart doc/code sur le nombre de tools et le mode data-tool** — à clarifier côté ops (divergence prod vs repo versionné ?).
3. **Module financier (BOM/vendor quotes)** — pensé pour un intégrateur IT, écart avec le modèle de facturation conseil GSMS ; à évaluer si utilisé tel quel.
4. **Eve → MCP TenderAI** — chantier toujours à construire, pas un existant à valider.
5. Incohérence `package.json`/`index.js` sur `mcp-tenders` — sans impact fonctionnel actuel (repo tierce non maintenue par GSMS), à signaler seulement.

---

## 4. Écarts documentaires détectés (docs à corriger)

| Doc | Ligne/section | Erreur |
|---|---|---|
| `CHANTIERS-METIER-INTERCONNEXION.md` §0 | ligne GRACE | Conflate packs seeds Prisma et `server/data/controls/` — deux systèmes distincts |
| `GSMS_STACK_STATUS.md` | §15, l.130 | "20 tools" / mode "data-tool sans clé Anthropic" ne correspond pas au code à `772335c` (18 tools, clé Anthropic requise) |
| `CHANTIERS-METIER-INTERCONNEXION.md` §1 TenderAI | "vérifier au cas par cas" | Sous-estime le gap réel de `generate_compliance_matrix` (statut hardcodé, resource `standards://` vide et déconnectée) |

---

## 5. Ce qui n'a délibérément pas été fait dans cet audit
- Aucun code modifié, aucune suppression, aucun fichier créé dans les 3 apps (rôle Claude sur ce repo = audit lecture seule).
- Pas d'exécution de suites de tests (vitest Grace, pytest TenderAI) — vérifications faites par lecture croisée code/contrat, jugées suffisantes pour les verdicts ci-dessus.
- Pas de vérification live du serveur `:8090` en prod (accès SSH/réseau hors de portée) — l'écart §3.1 reste à trancher côté ops.

**Suite proposée (attend arbitrage Samir/Cursor, rien ne démarre sans GO) :** prioriser QAtrial point 2.2 (résidus pharma actifs dans le wizard/dashboard — le plus visible utilisateur) et Grace point 1.4 (multi-tenant — le plus bloquant structurellement) avant TenderAI point 3.2 qui n'a d'urgence que si un AO sécurité privée arrive à court terme.
