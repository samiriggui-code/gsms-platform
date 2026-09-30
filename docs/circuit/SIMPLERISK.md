# SimpleRisk — fiche potentiel (lecture, pas docker)

**Date :** 2026-09-03  
**Clone :** `apps/simplerisk` ← https://github.com/simplerisk/code.git (**miroir read-only** des releases)  
**Licence :** MPL-2.0  
**Installé :** non · pas de `docker-compose` dans le clone

Démo upstream : https://demo.simplerisk.com (user / user, compte restreint)

---

## Rôle GSMS

**Registre de risques** direction : owners, mitigation, revue, résiduel.

Pas le scoring terrain (IRV reste Grace) ni le walkthrough.

---

## Stack / contrainte fork

PHP + MySQL/MariaDB. Installer officiel : [simplerisk.com/download](https://www.simplerisk.com/download).

Le GitHub **écrase** toute PR locale à la release suivante. Adapter GSMS = **fork privé** ou import CSV/API sans patcher ce clone.

---

## Overlap / couper

Garder : submit risk, mitigation, management review, reporting.

**Ne pas :** recalculer IRV « pour coller à l’ERP », checklists portes/CCTV, formulaires de scoring qui remplacent `risk-engine.ts`.

---

## 5 objets à pontifier

| Handoff `risks[]` | SimpleRisk |
|-------------------|------------|
| `threatId` + label | nouveau risque |
| `targetAssetName` | location / asset |
| `irv` / `priority` | scoring **affiché**, source Grace |
| `complianceTags` | tags / category |
| mitigation | lien `ActionPlan` (détail CAPA = QAtrial) |

Résiduel : mise à jour **après** contre-visite Grace, pas un 2e moteur.

---

## Verdict

Utile en **aval**. Installer plus tard (VM PHP ou image SimpleRisk), pas docker cette vague. Pont = JSON handoff, pas merge.
