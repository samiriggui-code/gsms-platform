# Harmonisation Finding — circuit métier GSMS

**Date :** 2026-09-05
**Statut :** contrat de données figé (v0.1.0) — implémentation `/findings` par app non commencée
**Contrat :** [`contracts/finding.schema.json`](./contracts/finding.schema.json) · exemples : [`contracts/finding.examples.json`](./contracts/finding.examples.json)

---

## Pourquoi ce doc

Le lab GSMS assemble plusieurs apps qui couvrent chacune un métier précis dans un même
circuit client (audit sécurité privée, appel d'offre, accompagnement jusqu'à
l'installation). Sans langage commun, Eve (CRM) doit connaître la structure interne de
chaque app pour faire une synthèse cross-domaine. Ce doc fixe le principe une fois pour
toutes pour éviter de repartir dans 15 directions à chaque nouvelle conversation.

## Le circuit (rôles, pas fusion)

```
Site vitrine (formulaires devis)
  → CRM (apps/crm, agent Eve)          — capte le lead, oriente vers l'app métier
       → GRACE                          audit sécurité physique/incendie sur site
                                         (structure, accès, agents, pré-commission)
       → QAtrial                        CAPA/qualité — suivi des écarts après audit
       → Comp AI (apps/comp)            conformité cyber (ISO/SOC2...) — branché
                                         seulement si besoin cyber confirmé (ex: datacenter
                                         où sécurité physique et cyber coexistent)
       → mcp-tenders (LexSocket)        veille/recherche d'AO — TROUVE, ne produit pas
                                         de constat
       → TenderAI MCP Max               répond à un AO déjà trouvé, accompagne jusqu'à
                                         l'installation
```

**Chaque app garde son code, sa base de données et son IA métier propres.** Aucune
fusion de codebase, aucune base partagée (cf. interdits déjà posés dans
[`INSPIRATION-SOURCES.md`](../INSPIRATION-SOURCES.md) et
[`PROGRAMME-ATTAQUE.md`](../PROGRAMME-ATTAQUE.md)).

## Le principe d'harmonisation : Finding

Chaque app qui **produit un constat** (GRACE, QAtrial, Comp AI, TenderAI — pas
mcp-tenders, qui ne fait que chercher) expose ses constats via un endpoint `/findings`
au format [`finding.schema.json`](./contracts/finding.schema.json). Eve consulte ce
format partout, jamais la structure interne d'une app.

Le champ `control_ref` permet le crosswalk : un même contrôle validé côté audit GRACE
peut être réutilisé tel quel dans un dossier TenderAI, sans ressaisie (voir l'exemple
`tenderai-ao-77` qui référence `grace-4f2a`).

### Rapport avec `precom-handoff.schema.json`

Deux contrats distincts, deux niveaux :

| | `finding.schema.json` | `precom-handoff.schema.json` |
|---|---|---|
| Granularité | un constat unitaire | un export agrégé par assessment |
| Sources | grace, qatrial, comp, tenderai | Grace uniquement |
| Portée | tout le circuit | audit précommission ERP uniquement |
| Statut | contrat v0.1.0, pas encore implémenté | déjà en place (`GET /assessments/:id/circuit-handoff`) |

Pas de fusion prévue entre les deux pour l'instant : `precom-handoff` reste l'export
métier détaillé de Grace pour l'ERP, `finding` est la couche de synthèse cross-app pour
Eve. Une révision future pourrait faire de `precom-handoff.risks[]`/`capas[]` des
`Finding` filtrés `source=grace`, mais ce n'est pas fait — décision explicite requise
avant de toucher au circuit ERP existant.

## Ce que ça n'est pas

- Pas un moteur de conformité — `Finding` transporte un statut, il ne le calcule pas.
- Pas une synchronisation de bases — chaque app reste la source de vérité de son propre
  domaine, `/findings` est un export en lecture seule.
- Pas une raison de cloner des apps supplémentaires — les dépôts Vanta (finding.schema,
  crosswalk control-set, architecture MCP) ne servent que de patron de format/archi à
  étudier en lecture seule, jamais de code à réutiliser tel quel (méthodologie cyber
  sans valeur directe pour un métier sécurité physique/incendie).

## Prochaines étapes

1. ~~Endpoint `/findings` réel sur GRACE~~ — **Fait 2026-09-05** : `GET /api/findings`
   (`apps/grace/server/src/modules/circuit/findings.ts`) + test de conformité au
   contrat (`findings.test.ts`, 8 tests). Limites P0 : `client_id` via env
   `GSMS_CLIENT_ID`, `control_ref` synthétique en attendant le crosswalk.
2. Idem QAtrial, Comp AI, TenderAI MCP Max — après décision sur l'adaptation métier
   de QAtrial et Comp AI (cf. `../CHANTIERS-METIER-INTERCONNEXION.md` §1).
3. Agrégateur côté CRM/Eve qui interroge les 4 endpoints.
4. Crosswalk référentiel dédié (`controls/*.json`) si le nombre de `control_ref`
   partagés le justifie — pas avant.
