# Chantier 01 — Vitrine GSMS (InvoicePilot) — brief pour Claude

**Pour :** Claude (front / copy / pages marketing)  
**Date :** 2026-09-04  
**Repo :** `apps/InvoicePilot-AI`  
**Canon plateforme :** [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md)  
**Règle design :** `.cursor/rules/invoicepilot-marketing-pattern.mdc`

---

## Mission

Adapter le **site vitrine InvoicePilot** pour présenter **GSMS / Global IT Soft Services** comme société de **prestations métier** (sécurité, sûreté, prévention) — **pas** comme éditeur de logiciel.

Les apps de la plateforme (CRM, Eve, GRACE, TenderAI, LexSocket, QAtrial, Comp AI, gsms-school…) sont des **outils internes**. Le site ne les vend pas, ne les nomme pas (sauf besoin légal), n’affiche pas d’essai gratuit SaaS, cockpit, API, Factur-X, etc.

**Objectif :** une présentation soignée, crédible, métier — établissements d’abord, sociétés de sécurité privée ensuite.

---

## Positionnement (à respecter strictement)

### On vend / on fait
- Audits de sécurité (établissements, organisations, dispositifs / « séries » de sécurité d’une structure)
- Préparation et accompagnement **avant / pendant / après** commission de sécurité
- Visites, pré-commission, prévention incendie, conformité réglementaire
- Accompagnement des **sociétés de sécurité privée** :
  - réponses aux **appels d’offres**
  - **après attribution (win)** : audit / structuration, inventaire, plan de sécurité, accompagnement de l’entrée en fonction et de la prestation selon le CCTP / cahier des charges du client
  - évaluation du service / des agents, préconisations de remise à niveau

### On ne fait PAS (sur ce site)
- Vendre un logiciel, une licence, un essai 14 jours, une API
- Se présenter comme formateur / organisme de formation
- **La formation du personnel** → **gsms-school** (autre entité / autre parcours). GSMS peut **orienter** ou constater un besoin de formation, **sans** proposer « je forme » comme offre principale

### Publics (ordre)
1. Établissements (ERP, IGH, écoles, commerces, entrepôts, tertiaire, santé…)
2. Sociétés de sécurité privée (AO + post-marché + audits organisation)

---

## Design — non négociable

- **Garder** la structure / composants existants : Hero, HowItWorks, Features, Connectors (environnements), Pricing (offres), Cta, Header, Footer, shell marketing des pages.
- **Adapter** textes, liens, SEO, labels — **pas** reinventer la landing.
- Pages marketing : `@/components/marketing/shell` (comme contact / services).
- Interdit dans le copy public : cockpit, Deal, Eve, DocType, moteurs, PA/Factur-X, essai gratuit produit.

Beaucoup de copy Option B / pages ressources a déjà été poussé (hero, offres, guide, FAQ, légal…). **Reprendre, unifier, peaufiner** — ne pas tout casser pour « refaire ».

---

## Où travailler (chemins)

| Zone | Path |
|------|------|
| Home | `src/routes/_marketing/index.tsx` + `src/components/landing/*` |
| Services | `src/routes/_marketing/services*.tsx` |
| Pages slug | `src/components/marketing/pages/*` + `src/lib/marketing-registry.tsx` |
| Logo actuel (InvoicePilot) | `public/media/app/logo-full.svg`, `logo-full-dark.svg` · composant `AppLogo` |
| Règle | `.cursor/rules/invoicepilot-marketing-pattern.mdc` |

**Hors chantier :** `_app` portail, CRM, Eve, config `GSMS_PUBLIC_API_*` (autre chantier).

---

## Capacités plateforme (vue d’ensemble — usage INTERNE seulement)

Claude peut s’en servir pour **comprendre ce que GSMS peut réellement livrer** (crédibilité du copy), **sans** les exposer comme produits.

| Capacité métier (ce que le client comprend) | Outil interne (ne pas vendre / ne pas jargonner) |
|---------------------------------------------|--------------------------------------------------|
| Demande → suivi commercial | Comp CRM + Eve |
| Veille / trouver un AO | LexSocket |
| Répondre à un AO (mémoire, dossier) | TenderAI MCP |
| Audit terrain / physical security | GRACE |
| CAPA / suivi actions | QAtrial |
| Cyber / conformité (si besoin) | Comp AI |
| Formation agents / personnel | **gsms-school** (pas GSMS prestations) |

Sur le site : parler **missions, livrables, commissions, AO, audits** — jamais « LexSocket », « Eve », « DocType ».

---

## À DEMANDER EXPLICITEMENT à Samir avant d’inventer

1. **Logo GSMS** (SVG / PNG clair + sombre) — aujourd’hui les assets sont encore InvoicePilot. **Ne pas inventer un logo.** Demander les fichiers et les brancher (`AppLogo`, favicon, og).
2. **Photos / screenshots métier réels** pour illustrer (visite, dossier, restitution…) — pas des mockups SaaS e-facture. Demander ce qu’il a ; placeholders sobres en attendant.
3. **Identité légale** encore en placeholders (SIREN, siège, hébergeur) sur mentions — ne pas inventer ; demander ou laisser « à compléter ».
4. **Coordonnées / e-mail** publics si différents de `contact@…`.

Si Samir n’a pas encore le logo : proposer une **structure** (emplacement, tailles) et bloquer le swap jusqu’à réception des fichiers.

---

## Livrables attendus

1. Tour de cohérence **home + services + contact + à propos + ressources (FAQ / guide / blog) + footer** — ton prestations, français soigné, titres élégants (pas de jargon réglementaire brut dans les H2).
2. Hero / CTA : Demander un audit · Répondre à un AO · Contact — liens `/services/audit`, `/services/ao`, `/contact`.
3. Logo : plan d’intégration + **demande** des assets à Samir.
4. Liste courte des pages encore « InvoicePilot » ou SaaS si trouvées.
5. Note fin de chantier dans `docs/HANDOFF-CURSOR.md` (ce que Cursor doit vérifier / merger).

---

## Hors scope (ne pas faire)

- Redesign complet / nouveaux composants landing
- Brancher CRM / Eve / MCP
- Vendre formation comme offre GSMS
- Modifier `apps/crm`, Grace, Comp, School
- Contenu réglementaire inventé (périodicités : déjà calées GE4/GH4 dans le guide — peaufiner le ton, pas inventer des délais)

---

## Critère de succès

Un visiteur établissement ou société de sécu lit le site et comprend **des prestations humaines de terrain**, veut demander un audit ou un appui AO — **sans** croire qu’on lui vend un logiciel.
