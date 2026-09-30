# GSMS PLATFORM — DOCTRINE

**Statut :** figée — 2026-09-02 · **stack plateforme :** 2026-09-04  
**Portée :** lab `gsms-platform` + futur fork GRACE → GSMS Audit FR/UE  
**Gate :** **aucune modification du moteur GRACE** tant que la cartographie domaines/référentiels n’est pas stable.

> **Stack canonique :** [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md)  
> **Architecture (résumé) :** [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> SimpleRisk **hors circuit**. School **hors circuit audit** (recommandation rapport seulement).  
> Travail : **une brique** sur le laptop → smoke → NUC. Pas toute la stack en local.

---

## 1. Interdits (non négociables)

| ❌ | Règle |
|----|--------|
| Thales ISRA | **Pas** une nouvelle application lab |
| OpenFire | **Pas** une nouvelle application lab |
| Physsec Methodology | **Pas** une nouvelle application lab |
| Autres logiciels | **Pas** d’empilement tant que la cartographie n’est pas faite |

Ces projets ne sont que :

- sources d’inspiration  
- méthodologies  
- modèles de données  
- bonnes idées  
- workflows  
- méthodes de scoring  
- UX d’audit  
- structuration des contrôles  

Détail : [`INSPIRATION-SOURCES.md`](./INSPIRATION-SOURCES.md)

---

## 2. Circuit plateforme (canonique 2026-09-04)

Voir [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md). Résumé :

| Rôle | Composant |
|------|-----------|
| Entrée / vitrine + portail | **InvoicePilot** (pas un CRM) |
| Cockpit / Core | **Comp AI CRM** + **Eve** |
| AO — trouver | **LexSocket** |
| AO — répondre | **TenderAI MCP Max** |
| Audit physique | **GRACE** |
| CAPA | **QAtrial** |
| Cyber GRC (optionnel) | **Comp AI** (`apps/comp`) |
| n8n / Circuit Worker | **Hors core** tant qu’Eve suffit |
| SimpleRisk / School audit auto | **Hors circuit** |

**Obsolète :** circuit « Xacta = GRC unique + Circuit Worker dans le core » (versions antérieures).

```
CLIENT → InvoicePilot → Comp CRM + Eve
              ├─ LexSocket → TenderAI (AO)
              └─ GRACE → QAtrial (audit / CAPA)
```

**Hors circuit :** SimpleRisk · School auto (besoin formation = rapport client seulement).

Pas de fusion des codebases.

---

## 3. Ce qu’on inspire de GRACE (HOW)

```
GRACE ORIGINAL
  architecture · UI · assessment wizard · surveys
  assets/sites · evidence · review · reports · risk engine
        ↓
  GRACE FORK GSMS
        ↑
  ISRA / Physsec / OpenFire  → idées seulement (pas d’apps)
```

**Objectif produit :**  
pas « GRACE traduit en français », mais :

```
GRACE → FORK MÉTIER → GSMS AUDIT ENGINE FRANCE / EUROPE
```

Domaines cibles : Sûreté · Sécurité physique · Sécurité privée · Incendie · ERP · IGH · Pré-commission · Audit de site · Audit entreprise · Formation corrective.

---

## 4. Source de vérité réglementaire ≠ GitHub

La couche **QUOI contrôler** vient des **sources officielles** (et ISO réellement pertinentes), pas des repos d’inspiration.

**France (indicatif) :** Code de la construction et de l’habitation · règlement de sécurité ERP (DG + DP) · IGH · Code du travail · sécurité incendie · évacuation · SSI · commissions de sécurité · SSIAP · CNAPS · Code de la sécurité intérieure · sécurité privée · vidéoprotection · prévention des risques · arrêtés applicables.

**Europe (indicatif) :** CER · NIS2 (si pertinente) · normes/référentiels UE · Eurocodes (si pertinents) · cadres résilience/sécurité · doctrine JRC FSE (lecture, pas ruleset unique).

**ISO / méthodos (si pertinentes) :** ISO 31000 · 31010 · 22301 · 28000 · …

Inventaire vivant : [`cartography/sources/`](./cartography/sources/)

---

## 5. Principe fondamental — HOW vs WHAT

| Couche | Contenu | Propriétaire conceptuel |
|--------|---------|-------------------------|
| **MOTEUR GRACE** | **COMMENT** réaliser un assessment, scorer, collecter preuves, produire findings/reports | Fork technique (risk engine, surveys, UI…) |
| **RÈGLES GSMS FR/EU** | **QUOI** contrôler, **POURQUOI**, **sur quel site**, **selon quel texte**, **dans quelle situation** | RuleSets versionnés + Applicability Engine |

**Interdit :** remplacer `risk-engine.ts` par un monstre `if (ERP) if (IGH)`.  
**Interdit :** un ruleset unique `EU_FIRE` qui écrase le droit national.

---

## 6. Flux cible (exemple)

```
AUDITEUR ouvre « AUDIT PRÉ-COMMISSION ERP »
  → contexte site (FR, type ERP, catégorie, activité, effectif, bâtiment…)
  → APPLICABILITY ENGINE
  → règles applicables sélectionnées
  → GRACE construit l’assessment terrain
  → observation / photo / document / preuve / commentaire / mesure
  → PASS | FAIL | WARNING | N/A | NOT_VERIFIABLE
  → FINDING → RISQUE → ACTION
  → si « formation du personnel » → GSMS SCHOOL
```

---

## 7. Ordre de travail (gate)

```
⓪ i18n FR UI Grace (toi)                         ← EN COURS
① DOCTRINE                                        ✅
② CARTOGRAPHIE domaines / textes / applicabilité  ← skeleton fait ; approfondir en P1
②bis LOCALISATION packs/surveys/tags              ✅
③ Packs / surveys FR (seeds additifs)             ← après i18n
④ Tags + custom fields contexte site
⑤ RuleSets / Applicability
⑥ Toucher moteur GRACE                            ← seulement si trou prouvé
```

**Programme détaillé (ajouter / créer / modifier) :** [`PROGRAMME-ATTAQUE.md`](./PROGRAMME-ATTAQUE.md)

**Étape ② = pas 5 000 règles codées.**  
**Étape ②bis :** spécialiste FR = packages + templates + surveys + tags — 7 steps intacts.

Voir [`cartography/README.md`](./cartography/README.md) · [`../audits/grace/LOCALISATION-FR-DANS-GRACE.md`](../audits/grace/LOCALISATION-FR-DANS-GRACE.md)

---

## 8. Liens

| Doc | Rôle |
|-----|------|
| [`VISION.md`](./VISION.md) | Vision lab / stacks |
| [`INSPIRATION-SOURCES.md`](./INSPIRATION-SOURCES.md) | ISRA · Physsec · OpenFire · JRC |
| [`cartography/`](./cartography/) | Cartographie FR/UE (pré-requis moteur) |
| `audits/inspiration/` | Fiches d’audit des sources |
