# Patterns récupérés de Comp AI (sans code AGPL)

À réécrire nativement. Source salvage : seed Comp + observation UI/API.  
Catalogues JSON : [`controls/`](./controls/).

## Grace — module cyber

1. Checklist par `control_ref` (ISO/SOC2 depuis `iso27001-2022.json` / `soc2-tsc.json`).
2. Upload preuve documentaire par contrôle → `evidence_ref` sur Finding.
3. Finding sorti : `source: "module-cyber"`, `category: "cyber"`.
4. SSP-01…12 (`ssp-surete.json`) = pack physique + pont SSP-12.
5. Échéance revue → champ date sur Finding (contrat à harmoniser avec consolidée).

## QAtrial

1. Policy gen : titres dans `policy-template-titles.json` = checklist de sections à générer (Ollama), brouillon seulement.
2. CAPA traite tout Finding (y compris cyber).
3. Catégories finding inspo : `finding-template-categories.json`.
4. Calendrier = alertes sur expiration Finding / habilitations.

## CRM

Trust Center = pages publiques alimentées Findings validés — **pas** le portail employé Comp.
