# shared/ — données et contrats lus par le code

Ce dossier n'est **pas** de la documentation : son contenu est chargé au runtime ou par les tests.
Ne rien renommer sans mettre à jour les applications qui le lisent.

| Dossier | Contenu | Lu par |
|---|---|---|
| `contracts/` | `finding.schema.json` v0.1.0 (constat inter-apps), exemples, `precom-handoff.schema.json` | GRACE `/api/findings` + test, QAtrial `/api/findings` + test, Core (connecteurs) |
| `controls/` | catalogues de contrôles (SSP sûreté, ISO 27001:2022, SOC 2, prompts, arêtes ISO↔SOC2) | GRACE `circuit/controls-catalog.ts`, QAtrial `lib/controls-catalog.ts` (copie runtime dans `src/data/controls`) |
| `rulesets/` | règles d'applicabilité déclaratives (`AUD.PRECOMMISSION.ERP`) + design + références officielles | GRACE `rulesets/compose.ts` |

Le savoir réglementaire source (textes, domaines, statut des sources) est dans [`../docs/domain/`](../docs/domain/).
