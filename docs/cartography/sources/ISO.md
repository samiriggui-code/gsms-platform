# Sources — ISO / méthodologies

**Statut :** inventaire initial  
**Rôle :** méthodes de management du risque / continuité / sûreté de la chaîne — **complément**, pas droit ERP français.

| id | Nom | Nature | Usage GSMS |
|----|-----|--------|------------|
| `SRC.ISO.31000` | Management du risque — principes | standard | Alignement vocabulaire risque (avec SimpleRisk / moteur GRACE) |
| `SRC.ISO.31010` | Techniques d’appréciation du risque | standard | Choix méthodes (pas obligation légale site) |
| `SRC.ISO.22301` | Continuité d’activité | standard | Audit entreprise / résilience |
| `SRC.ISO.28000` | Management de la sûreté de la chaîne logistique | standard | Sûreté / sites logistiques si pertinent |
| `SRC.ISO.27005` | Risk management infosec | standard | Inspiration modèle ISRA — **pas** cœur physique ERP |
| `SRC.METH.PHYSSEC` | Physsec Methodology | methodology (public domain) | Pack Grace `site-surete` (surveys) — **inspiration**, pas droit FR |
| `SRC.METH.OPENFIRE` | OpenFire FSE methods | methodology / lib | Calculs ingénierie incendie — **≠** RS ERP |
| `SRC.METH.ISRA` | Thales ISRA patterns | methodology / OSS | Idées modèle Asset→Threat→Vuln→Treatment |

## Séparation

| Type | Exemple | Dans RuleSet réglementaire FR ? |
|------|---------|----------------------------------|
| Obligation légale | Disposition ERP | Oui (`SRC.FR.*`) |
| Norme citée par le droit | NF SSI si le RS renvoie | Oui **si** le texte FR l’impose |
| ISO volontariste | ISO 31000 | Familles « management » optionnelles / audit entreprise |
| Méthodo OSS | Physsec CSV | Inspiration familles SÛRETÉ uniquement |
