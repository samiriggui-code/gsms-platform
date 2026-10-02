# Statut des sources — pack `igh-precommission`

## Réponse courte

**P0 :** checklist opérationnelle pré-commission IGH. **Pas** article-par-article. **Pas** le RS ERP.

## Cadre (piné 2026-09-03)

| Id | Réalité | Note P0 |
|----|---------|---------|
| `SRC.FR.IGH` | [Arrêté 30 décembre 2011](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000025167121) (règlement construction / protection incendie IGH) | Détail classe-par-classe **pas** évalué article-atomique |
| `SRC.FR.CCH` | [R146-3](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819081) définition : **> 50 m habitation / > 28 m autres** ; [R146-4](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819083) classes | Ne pas inverser 28/50 |
| `SRC.FR.COMMISSION` | [R146-28](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819137) occupation · [R146-29](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819141) visite · guides préf. ERP **et** IGH | Même processus visite |
| `SRC.FR.SSI` / `SRC.FR.SSIAP` | [R146-9](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819095) alarme · [R146-23](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819127) service unique | Seuils IGH ≠ MS ERP |

## Gate

1. Relire l’arrêté 2011 avec référent IGH (classes GHW / GHZ / ITGH)  
2. Interdire « conforme réglementairement » tant que `detailed` non atteint  
3. Ne jamais évaluer IGH avec les questions CO 34 du pack ERP
