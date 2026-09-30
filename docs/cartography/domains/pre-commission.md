# Domaine `DOM.PRECOMMISSION` — Pré-commission / commission de sécurité

| Champ | Valeur |
|-------|--------|
| id | `DOM.PRECOMMISSION` |
| name | Pré-commission / commission de sécurité |
| maturity | `draft` |
| description | Processus et preuves pour préparation / passage / suivi de commission de sécurité (avis, prescriptions, dossiers). **Orchestre** le package ; les contrôles techniques restent dans ERP/IGH/INCENDIE. |

## Sources primaires

| id | Rôle |
|----|------|
| `SRC.FR.COMMISSION` | Organisation, avis, prescriptions |
| `SRC.FR.CCH` | Cadre construction / procédures |
| `SRC.FR.ERP.RS` / `SRC.FR.IGH` | Contenu technique porté par les autres domaines |

Guidance locale / préfectorale = `guidance` (à lister site par site — ne pas figer comme droit national).

## Site context keys

| Key | Valeurs / notes |
|-----|-----------------|
| `commission_phase` | `pre_commission` \| `periodique` \| `apres_prescription` \| `ouverture` |
| `dossier_depose` | bool (optionnel) |
| `date_cible_commission` | date (optionnel) |
| `prescriptions_ouvertes` | bool / count (optionnel) |

Toujours avec `country`, `site_kind` (ERP ou IGH).

## Familles de contrôle

| family_id | Label | Intent | Evidence | Levier Grace (P0) |
|-----------|-------|--------|----------|-------------------|
| `DOM.PRECOMMISSION.FAM.DOSSIER` | Complétude dossier | Pièces attendues présentes | Checklist dossier | **Survey** `survey-fr-erp-precom-dossier` |
| `DOM.PRECOMMISSION.FAM.PLANS` | Plans / notices | Cohérence plans vs site | Plans tamponnés, visite | Survey + asset INFORMATION |
| `DOM.PRECOMMISSION.FAM.ESSAIS` | Essais / PV | Preuves de fonctionnement | PV SSI, désenfumage… | **Survey** essais + Evidence |
| `DOM.PRECOMMISSION.FAM.PRESCRIPTIONS` | Suivi prescriptions | Levée / reste à faire | Courriers, photos | Action plans (step 7) — P1 module |
| `DOM.PRECOMMISSION.FAM.REGISTRE` | Registre & visites | Traçabilité | Registre de sécurité | Partagé avec `DOM.ERP.FAM.REGISTRE` |

## Types d’audit

`AUD.PRECOMMISSION.ERP` · `AUD.PRECOMMISSION.IGH`

## Flux produit (rappel)

```
PRECOMMISSION = package + surveys + evidence
ERP / IGH / INCENDIE = familles techniques filtrées par contexte
GRACE 7 steps = HOW (scope → treatment)
```

Voir mapping détaillé : [`../audit-types/AUD.PRECOMMISSION.ERP.mapping.md`](../audit-types/AUD.PRECOMMISSION.ERP.mapping.md)

## Hors scope

- Décision préfectorale automatisée  
- Remplacer la commission humaine  
- Coder le calendrier réglementaire dans TypeScript assessment
