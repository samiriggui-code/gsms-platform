# Circuit plateforme — Audit pré-commission ERP

Fiches lecture (2026-09-03, pas docker) : [`XACTA.md`](./XACTA.md) · [`QATRIAL.md`](./QATRIAL.md) · [`SIMPLERISK.md`](./SIMPLERISK.md)

Honnêteté contenu terrain : [`../cartography/SOURCES-STATUS-ERP-PRECOM.md`](../cartography/SOURCES-STATUS-ERP-PRECOM.md)  
RuleSets : [`../rulesets/DESIGN.md`](../rulesets/DESIGN.md)  
Contrat machine : [`contracts/precom-handoff.schema.json`](./contracts/precom-handoff.schema.json)  
Prochaine étape : [`RELECTURE-SOURCES.md`](./RELECTURE-SOURCES.md)

---

## 1. Flux métier (cible)

```
CLIENT / EXPLOITANT ERP
  → XACTA          Mission cabinet (programme, engagement, planning commission)
  → GRACE fork     Terrain : assets, surveys, threats, evidence, report PDF
  → SIMPLERISK     Register risque (IRV / priorité / résiduel)
  → QATRIAL        Findings / prescriptions / CAPA / efficacité
  → GSMS SCHOOL    Action « former » (SSIAP, consignes, évacuation…)
  → QATRIAL        Preuve formation + retest efficacité
  → GRACE          Contre-visite / survey de vérification
  → SIMPLERISK     Mise à jour risque résiduel
  → XACTA          Clôture mission / livrable client
```

**Interdit en phase 7 :** brancher les Postgres entre elles, merger les codebases, inventer des APIs propriétaires des apps upstream.

---

## 2. Rôles (rappel)

| App | Rôle circuit | Action phase 7 |
|-----|--------------|----------------|
| **Xacta** | Mission / engagement cabinet | Mapper objets Grace → Program / Engagement / Findings |
| **Grace** | Terrain + contenu FR | Source des objets métier précom (déjà livré phases 1–6) |
| **SimpleRisk** | Pilotage risque | Pont conceptuel threat → risk entry |
| **QAtrial** | CAPA / anomalies | Pont action plan / gap → CAPA |
| **GSMS School** | Formation / preuves | Lien action « former » → session / compétence |

---

## 3. Mapping objets (précom ERP)

### 3.1 Xacta ← contexte mission

| Concept Xacta (cible) | Source Grace / GSMS | Notes |
|----------------------|---------------------|-------|
| Program / client | Org / client CRM (School) ou metadata mission | Pas encore d’objet « Mission » dans Grace |
| Engagement / audit | `Assessment` (`title`, `period`, `status`) | 1 assessment ≈ 1 engagement terrain |
| Scope | `Assessment.scopeDescription` + `metadata.customFields.erp-precommission` | SiteContext FR |
| Site / facility | `Asset` SITE/BUILDING ou `AssetCluster` | |
| Workpapers / checklists | `SurveyResponse` + scopes AAA | Surveys précom |
| Findings (cabinet) | Agrégat threats HIGH+ + open gaps | Xacta observe ; détail terrain reste Grace |
| Report package | PDF Grace + handoff JSON | |

### 3.2 Grace (terrain) — objets déjà là

| Objet Grace | Usage précom |
|-------------|--------------|
| `TemplatePackage` `erp-precommission` | WHAT inventaire |
| `SurveyTemplate` précom | Checklists |
| `Assessment` + `metadata.customFields` | SiteContext |
| `Threat` + `complianceTags` FR_* | Scénarios / tags |
| `ActionPlan` | Traitements / prescriptions |
| `CountermeasureGap` | Écarts contrôles |
| Applicability composition | Modules/surveys recommandés |

### 3.3 SimpleRisk ← findings risque

| Concept SimpleRisk | Source Grace | Mapping |
|--------------------|--------------|---------|
| Risk | `Threat` scorée (likelihood × impact → IRV, priority) | 1 threat → 1 risk candidate |
| Asset / location | `Threat.targetAsset` | |
| Category / tags | `complianceTags` (`FR_ERP`, `FR_SSI`…) + `complianceRefs` pack | Labels, pas moteur |
| Mitigation | `ActionPlan` + CM assignées | |
| Residual | Post-treatment (revisit Grace) | Manuel P0 |
| Comments / evidence | Survey answers, PDF, notes | Liens / refs, pas blob sync |

**Ne pas :** recalculer IRV dans SimpleRisk pour « coller » à l’ERP — le HOW reste Grace.

### 3.4 QAtrial ← CAPA

| Concept QAtrial | Source Grace | Mapping |
|-----------------|--------------|---------|
| Finding / anomaly | Threat `HIGHEST`/`HIGH` **ou** `CountermeasureGap` open | Préférer gaps pour CAPA « contrôle manquant » |
| Root cause (saisie) | — | Saisi dans QAtrial |
| Corrective action | `ActionPlan.actionRequired` | |
| Owner / due | `responsiblePerson` / `targetDate` | |
| Evidence | Survey / PV / registre | Refs URLs ou IDs Grace |
| Effectiveness check | Retest survey Grace + flag | Boucle retour |
| Training need | Flag `needsTraining` (contrat) | → School |

### 3.5 GSMS School ← formation

| Concept School | Déclencheur circuit | Mapping |
|----------------|---------------------|---------|
| Besoin formation | Action plan taguée formation / note SSIAP / consignes | |
| Session / parcours | Module CRM existant (SSIAP, évacuation…) | **Pas** de création auto en P0 |
| Preuve Qualiopi | Émargement / attestation | Remonte vers QAtrial efficacité |
| Tags métier | `FR_SSI`, `FR_CNAPS`, domaines School | Cohérence labels |

---

## 4. Contrat d’échange (P0)

Fichier JSON versionné émis **en lecture seule** par Grace :

`GET /api/assessments/:id/circuit-handoff`

Payload conforme à [`contracts/precom-handoff.schema.json`](./contracts/precom-handoff.schema.json).

Contient :
- en-tête mission (assessment id, auditType, packageSlug, SiteContext)
- liste `risks[]` (threats scorées)
- liste `capas[]` (action plans + gaps ouverts)
- liste `trainingHints[]` (heuristique P0)
- `disclaimer` sources / maturité checklist

**Consommateurs :** humains / scripts d’import futurs — **pas** d’API Xacta/SimpleRisk/QAtrial appelées.

---

## 5. Heuristique `trainingHints` (P0, explicite)

Un hint formation est proposé si :
- action plan texte contient (insensible casse) : `formation`, `former`, `SSIAP`, `exercice`, `évacuation`, `consigne`
- **ou** tag `FR_SSI` / `FR_CNAPS` sur threat liée
- **ou** SiteContext `ssiap_required === true`

Ce n’est **pas** un moteur pédagogique — simple pont pour l’opérateur School.

---

## 6. Done when (phase 7)

- [x] Doc circuit précom avec mapping objet par app  
- [x] Contrat JSON versionné  
- [x] Endpoint Grace lecture seule `circuit-handoff`  
- [x] Backlog relecture sources séparé  
- [ ] Imports réels dans Xacta / SimpleRisk / QAtrial (plus tard, décision explicite)  
- [ ] Création session School auto (plus tard)

---

## 7. Hors scope

- Fusion codebases  
- Shared database  
- Nouvelles apps ISRA / OpenFire / Physsec  
- Patch `risk-engine.ts`  
- Affirmer conformité réglementaire via le circuit
