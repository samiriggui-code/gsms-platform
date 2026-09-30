# Relecture sources — backlog (après phase 7)

**Objectif :** rattacher le contenu P0 à des **refs officielles** (Légifrance / CCH / guides), sans touch risk-engine.

**État session 2026-09-03 :** familles **F1–F8 → `scoped`** (autres types DP hors R/N encore `listed`).  
Catalogue cotes : [`../rulesets/OFFICIAL-REFS.md`](../rulesets/OFFICIAL-REFS.md)  
Ruleset : **v0.3.0**

---

## Principes

1. **Une famille = des `official_refs`** (cote JO / article / guide).  
2. Maturity : `listed → scoped → detailed`.  
3. Interdit « conforme réglementairement » tant que `detailed` n’est pas atteint.  
4. Physsec / OpenFire = inspiration seulement.

---

## Ordre

| # | Famille | État | Cotes clés |
|---|---------|------|------------|
| 1 | Classement | ✅ scoped | **GN 1–3** · **CCH R143-19** |
| 2 | Dégagements | ✅ scoped | **CO 34–60** |
| 3 | Moyens de secours | ✅ scoped | **MS 1–75** |
| 4 | SSI / essais | ✅ scoped | **MS 53–69** (53, 58, 68) |
| 5 | Registre | ✅ scoped | **CCH R.123-51** · MS 58/68 |
| 6 | Dossier commission | ✅ scoped* | Guides préf. + R.123-51 (*pas de liste nationale unique*) |
| 7 | DP par type | ✅ scoped (R, N) | Titre II · **R 1–33** · **N 1–20** · autres types `listed` |
| 8 | SSIAP | ✅ scoped | **MS 45–52** · arrêté **2/05/2005** |

---

## Refs pinées

| Id | Lien |
|----|------|
| RS consolidé | https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020303815/ |
| Titre II DP | https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020334570/ |
| Chapitre R | https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020334983/ |
| Chapitre N | https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020334913/ |
| MS 45–52 | https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020317627/ |
| Arrêté SSIAP | https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000448223 |
| GN 1 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045143487 |
| CCH R143-19 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818977 |
| CO 34–60 | https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020303939/ |
| MS 53 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317726 |
| CCH R.123-51 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039040918/ |

---

## Journal

| Date | Famille | Cotes | Qui |
|------|---------|-------|-----|
| 2026-09-03 | F1 Classement | GN 1–3 · R143-19 · types GN1 ajoutés (J,GA,EF,REF) | Cursor |
| 2026-09-03 | F2 Dégagements | CO 34–60 / CO 34–42 | Cursor |
| 2026-09-03 | F3 Moyens | MS 1–75 | Cursor |
| 2026-09-03 | F4 SSI | MS 53, 58, 68 | Cursor |
| 2026-09-03 | F5 Registre | R.123-51 · MS 58/68 | Cursor |
| 2026-09-03 | F6 Dossier | Guides 94/13 + R.123-51 (pratique) | Cursor |
| 2026-09-03 | Compléments Q | CO 45 · EC 8 · DF 3/4 · MS 67/69 (rassemblement) | Cursor |
| 2026-09-03 | **F7 DP** | Titre II · R 1–33 · N 1–20 · modules/surveys R+N | Cursor |
| 2026-09-03 | **F8 SSIAP** | MS 45–52 · arrêté 2/05/2005 · mod-ssiap | Cursor |

**Livrables maj :** F1–F8 scoped · ruleset **v0.3.0** · pack **0.2.0** · `mod-dp-r`/`mod-dp-n`/`mod-ssiap` · 3 surveys DP/SSIAP · compose `erp_type_in` / `erp_type_not_in`.

**Prochaine session :** autres chapitres DP (L, M, U…) ou relecture métier → `detailed`.
