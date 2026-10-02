# Sources — Europe

**Statut :** inventaire initial (`listed`)  
**Principe doctrine :** l’Europe **cadre** ; elle **ne remplace pas** le droit national (ERP/IGH FR).  
Pas de ruleset unique `EU_FIRE`.

---

| id | Nom | Nature | Domaines typiques | Notes |
|----|-----|--------|-------------------|-------|
| `SRC.EU.CER` | Directive résilience des entités critiques (CER) | directive | AUDIT_ENTREPRISE, SURETE, AUDIT_SITE | Si site / opérateur dans le champ ; context `critical_infra` |
| `SRC.EU.NIS2` | Directive NIS2 | directive | AUDIT_ENTREPRISE | Pertinente si cybersécurité / entités essentielles — **pas** le cœur audit incendie ERP |
| `SRC.EU.EUROCODES` | Eurocodes (calcul structures / feu selon pertinence) | standards | INCENDIE (ingénierie) | Couche technique — croiser avec droit national, pas substitut RS ERP |
| `SRC.EU.JRC.FSE` | Travaux JRC Fire Safety Engineering in Europe | guidance / study | INCENDIE | Doctrine : diversité des approches nationales — **pas** un ruleset. Ex. JRC131689 (2023), JRC143347 (2025) |
| `SRC.EU.RESILIENCE` | Autres cadres UE résilience / sécurité (à lister) | TBD | AUDIT_ENTREPRISE | Compléter au fil des besoins métier |

## Règle d’usage dans l’Applicability Engine (cible)

```
if country == FR:
  charger RuleSets FR (ERP/IGH/…)
if critical_infra / entité CER:
  ajouter familles CER (organisation, résilience)
# jamais: remplacer FR.ERP par EU.FIRE
```

## Refs à enrichir

- EUR-Lex CER / NIS2 (cotes exactes) — `TBD`
- Publications JRC (ex. JRC131689, JRC143347) — déjà notées dans audits inspiration
