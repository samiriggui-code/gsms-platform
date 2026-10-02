# Sources officielles — France

**Statut :** inventaire initial (`listed`) — références Légifrance à préciser progressivement  
**Nature :** source de vérité réglementaire pour RuleSets FR (≠ GitHub)  
**Honnêteté pack P0 :** voir [`SOURCES-STATUS-ERP-PRECOM.md`](./SOURCES-STATUS-ERP-PRECOM.md) — checklist opérationnelle, **pas** article-level.

---

## Construction / ERP / IGH / incendie bâtiment

| id | Nom | Nature | Domaines | Notes / refs |
|----|-----|--------|----------|--------------|
| `SRC.FR.CCH` | Code de la construction et de l’habitation | law | ERP, IGH, INCENDIE, PRECOMMISSION | Socle ; articles à cartographier par famille |
| `SRC.FR.ERP.RS` | Règlement de sécurité contre les risques d’incendie et de panique dans les ERP | order / regulation | ERP, INCENDIE, PRECOMMISSION | Approuvé par **arrêté du 25 juin 1980** (modifs JO successives). Ex. [JORF 01/12/2025](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053020948). Hist. [23/03/1965](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000441635/) |
| `SRC.FR.ERP.DG` | Dispositions générales ERP (livre / titres du RS) | part of RS | ERP, INCENDIE | Familles : construction, désenfumage, évacuation, SSI, moyens de secours… |
| `SRC.FR.ERP.DP` | Dispositions particulières par type ERP | part of RS | ERP | **scoped** types R/N (`mod-dp-r`/`mod-dp-n`) ; autres types `listed` |
| `SRC.FR.IGH` | Réglementation immeubles de grande hauteur | law / orders | IGH, INCENDIE, PRECOMMISSION | Distinct ERP ; context `site_kind=IGH` |
| `SRC.FR.SSI` | Cadre systèmes de sécurité incendie | standards + RS | INCENDIE, ERP, IGH | SSI / alarme / compartimentage — préciser arrêtés & normes NF |
| `SRC.FR.COMMISSION` | Commissions de sécurité (organisation, avis, prescriptions) | law / circulars / pref. guidance | PRECOMMISSION, ERP, IGH | Processus pré-commission / périodique — ex. guides [94](https://www.val-de-marne.gouv.fr/Actions-de-l-Etat/Securite/Securite-civile-et-defense/La-commission-de-securite-les-ERP-et-les-IGH), [13](https://www.bouches-du-rhone.gouv.fr/Actions-de-l-Etat/Securite/Securite-civile/Securite-dans-les-etablissements-recevant-du-public-ERP2/ERP-LES-COMMISSIONS-DE-SECURITE) |

## Travail / évacuation / prévention

| id | Nom | Nature | Domaines | Notes |
|----|-----|--------|----------|-------|
| `SRC.FR.CT` | Code du travail | law | INCENDIE, AUDIT_ENTREPRISE, AUDIT_SITE | Évacuation, consignes, formation incendie employeur… |
| `SRC.FR.EVACUATION` | Obligations d’évacuation / exercices (CT + textes liés) | law / guidance | INCENDIE, AUDIT_ENTREPRISE | Croiser CT et ERP selon public / salariés |
| `SRC.FR.PREVENTION_RISQUES` | Prévention des risques (employeur, DUERP, etc.) | law | AUDIT_ENTREPRISE | Pont organisationnel — pas le cœur ERP |

## Sécurité privée / intérieure / vidéoprotection / SSIAP

| id | Nom | Nature | Domaines | Notes |
|----|-----|--------|----------|-------|
| `SRC.FR.CSI` | Code de la sécurité intérieure | law | SEC_PRIVEE, SURETE, VIDEOPROTECTION | Titres sécurité privée, vidéoprotection… |
| `SRC.FR.CNAPS` | Cadre agrément / autorisation / carte pro (CNAPS) | law / decrees | SEC_PRIVEE, AUDIT_ENTREPRISE | Activité surveillance, gardiennage, etc. |
| `SRC.FR.SEC_PRIVEE` | Textes d’application sécurité privée | decrees / orders | SEC_PRIVEE | À lister article par article en phase `scoped` |
| `SRC.FR.VIDEOPROTECTION` | Vidéoprotection (autorisation, finalités, affichage…) | law / CSI | SURETE, SEC_PHYSIQUE, SEC_PRIVEE | ≠ « CCTV checklist » Physsec seule |
| `SRC.FR.SSIAP` | Cadre agents SSIAP / service de sécurité incendie | law / decrees | INCENDIE, SEC_PRIVEE, AUDIT_ENTREPRISE | **scoped** : MS 45–52 + arrêté 2/05/2005 · `mod-ssiap` |

## À préciser (TBD — ne pas inventer)

- Arrêtés types ERP (L, M, N, O, P, R, S, T, U, V, W, X, Y, PA, CTS, SG, PS, OA…) — rattacher à `SRC.FR.ERP.DP`
- Normes NF SSI / désenfumage / extincteurs — couche `standard` liée `SRC.FR.SSI`
- Guides DGSCGC / préfecture — `guidance` (non substitut au RS)

## Inspiration ≠ source (rappel)

Physsec, OpenFire, ISRA, tags ISO GRACE → **pas** dans ce fichier comme obligation FR.
