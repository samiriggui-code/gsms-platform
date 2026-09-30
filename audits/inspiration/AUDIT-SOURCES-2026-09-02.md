# Audit sources — Thales ISRA · Physsec · OpenFire · JRC

**Date :** 2026-09-02  
**Mode :** lecture / cartographie — **aucun clone** dans `apps/` pour l’instant  
**Doc parent :** `docs/INSPIRATION-SOURCES.md`

---

## Verdict court

| Source | Utile pour | Intégrer comme app ? | Priorité extract |
|--------|------------|----------------------|------------------|
| **Thales ISRA** | Enrichir / confronter le **risk model** GSMS (ISO 27005) | **Non** | Haute |
| **Physsec Methodology** | Domaines & checklists **sûreté physique** → RuleSets | **Non** (doc) | Haute |
| **OpenFire** | Calculs **FSE** (incendie ingénierie) | **Non** (lib optionnelle plus tard) | Moyenne |
| **JRC FSE** | Doctrine UE — pas de ruleset EU unique | **Non** | Référence |

---

## 1. Thales ISRA

**Repo :** https://github.com/ThalesGroup/security-risk-assessment-tool  
**Stack :** Electron · `app/` + `lib/` · Node 20/22  
**Licence :** BSD-4-Clause  
**Périmètre :** risk assessment **ingénierie / cyber-tech** (Thales DIS), pas ERP/incendie site.

### Modèle métier (aligné ISO 27005)

1. Scope + assumptions + trusted boundaries  
2. **TLoT** (Targeted Level of Trust — ISO 27034)  
3. **Business assets** (primaires) + conséquences sur sous-caractéristiques sécurité (ISO 25010)  
4. **Supporting assets** (techniques : OS, crypto, réseau, stockage…) liés aux business assets  
5. **Threat agents** + scénarios  
6. **Vulnerabilities** (score 0–10) liées aux supporting assets  
7. **Attack path** AND/OR → incident scenarios → risk level  
8. Acceptation / traitement : Mitigate · Retain · Avoid · Share  

### vs GRACE (CSMP physique)

| Concept | GRACE | Thales ISRA |
|---------|-------|-------------|
| Actif | Site → … → Equipment (physique) | Business + Supporting (souvent IT) |
| Menace | 3-A (Adversary × Action × Asset) | Threat agent + scénario + path |
| Vulnérabilité | Strong → Inadequate (4 bandes) | Score 0–10 |
| Risque inhérent | IRV 5×5 Likelihood × Impact | Risk level via attack path |
| Traitement | TEAR + ALARP | Mitigate / Retain / Avoid / Share |
| Preuve terrain | Surveys YES/PARTIAL/NO | Moins « walkthrough site » |
| Conformité tags | ISO 31000, NIS2, CER, ASIS… | ISO 27005 / 27034 / 25010 |

### Idées à importer conceptuellement dans GSMS

- Distinction **actif métier** vs **actif support** (utile aussi hors IT : « flux personnes » vs « porte / ACS »)  
- Chemins d’attaque structurés (si on étend la sûreté au-delà du scoring IRV simple)  
- Vocabulaire traitements ISO 27005 pour aligner TEAR ↔ normes FR/UE  
- JSON Schema configurable (`json-schema.js`) — pattern proche RuleSet versionné  

### Hors scope ISRA pour GSMS

Pas de modèle ERP/IGH, pas de commission de sécurité, pas de CNAPS.

---

## 2. Physsec Methodology

**Repo :** https://github.com/evildaemond/physsec-methodology  
**Nature :** méthodologie open source d’audit de **sécurité physique** — **Unlicense / public domain**  
**Livrable :** CSV (`CSV/Physsec-Methodlogy-ALL.csv`) importable Excel/Word — **pas** une app  
**Public :** consultants, red teams, pentest physique, blue teams

### Taxonomie « Where the issue is found » (mapping RuleSet SÛRETÉ)

| Catégorie Physsec | Domaine GSMS cible |
|-------------------|--------------------|
| Building or Facility Design | Périmètre / conception site |
| Doors · Locks · Keys and Key Systems | Accès physiques |
| RFID Access Control Systems (PACS/EACS) | Contrôle d’accès |
| CCTV Monitoring/Recording | Vidéoprotection |
| BMS/SMS Configuration and Implementation | GTB / supervision sûreté |
| Backup and Redundancy | Continuité des mesures |
| Surveillance Detection and Response | Détection · réaction |
| Security Training and Hygiene | Personnel · procédures |
| Documentation | Preuves / consignes |
| Occupational Health and Safety | Pont HSE (séparé du droit incendie FR) |

### Autres axes utiles

- **Type of Issue** : Improper Installation · Logic Faults · Logging · Out of Specification · Security Enhancement…  
- **Evidence of Exploitation** : Covert / Overt / Surreptitious  
- **Potential damage during testing** : échelle No damage → Completely Out of Operation  
- **Security Level 1–4** : maturité adversaire (proche idée 3-A / capability GRACE)

### Usage GSMS

```
rulesets/FR/surete/
  perimeter · access-control · cctv · intrusion ·
  doors-locks · keys · rfid-pacs · bms-sms ·
  detection-response · personnel · documentation · ...
```

### Action suivante

Cloner **en lecture seule** sous `gsms-platform/refs/physsec-methodology` (dossier `refs/`, pas `apps/`) **ou** parser le CSV ALL → inventaire items RuleSet — sans runtime.

---

## 3. OpenFire

**Repo :** https://github.com/emberon-tech/openfire  
**PyPI :** `ofire` · **Licence :** MIT  
**Stack :** Rust (crates par norme) + bindings Python (PyO3)

### Modules (ex.)

BR 187 · PD 7974 · CIBSE Guide E · SFPE Handbook · BS 9999 · TR 17…

### Philosophie

Blocs d’équations composables — **pas** un workflow réglementaire monolithique. Aligné avec « Rule Engine ≠ Risk Engine ».

### Usage GSMS

| Faire | Ne pas faire |
|-------|----------------|
| Optionnel : service calcul FSE pour scénarios techniques | Remplacer RuleSets ERP/IGH |
| Documenter mapping « méthode FSE ↔ finding » | Présenter BR 187 comme droit français |

---

## 4. JRC / Commission européenne

**Exemples :**  
- https://publications.jrc.ec.europa.eu/repository/handle/JRC131689  
- https://publications.jrc.ec.europa.eu/repository/handle/JRC143347  

**Leçon architecture (confirmée) :** les approches FSE / réglementaires **diffèrent selon les États membres** → pas de super-ruleset `EU_FIRE` qui écrase le national.

Europe = **cadre** (CER, NIS2, Eurocodes, doctrine FSE)  
France = **RuleSets** ERP / IGH / Code du travail / etc.

---

## 5. Décision lab

| Décision | Statut |
|----------|--------|
| Pas de nouvelles apps dans `apps/` pour ISRA / OpenFire / Physsec | **Confirmé** |
| Documenter sources dans `docs/INSPIRATION-SOURCES.md` | **Fait** |
| Prochaine étude profonde | Comparaison détaillée GRACE risk-engine ↔ ISRA `lib/` |
| Clones refs optionnels | `refs/` seulement si besoin d’extraire checklists Physsec |

**Aucune modification de `gsms-school` production.**
