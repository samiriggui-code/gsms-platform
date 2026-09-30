# Vision métier — lab GSMS Platform

> **Doctrine normative :** [`DOCTRINE.md`](./DOCTRINE.md)  
> **Cartographie réglementaire (préalable fork) :** [`cartography/`](./cartography/)

## Domaines ciblés

Sécurité privée · sûreté · sécurité physique · audit de site · société de sécurité · préparation commission de sécurité · incendie · SSIAP · SST · formation professionnelle.

## Cartographie applicative (cible conceptuelle)

| Couche | App lab | Question d’audit |
|--------|---------|------------------|
| UI / terrain | GRACE | Le design system et les écrans assessments/sites/risk UI peuvent-ils guider le futur shell GSMS ? |
| Cabinet / missions | XACTA | Program / Engagement / Scope / Workpapers / Findings — gaps vs process audit GSMS ? |
| Risque | SIMPLERISK | Register / scoring / residual / mitigation — utile pour sites clients & conformité ? |
| Remédiation | QATRIAL | CAPA / root cause / evidence / e-sign / effectiveness — lien formation ? |
| Formation | GSMS | Déjà propriétaire CRM OF / Qualiopi / CNAPS / SSIAP / SST |

## Ce que GSMS garde (non négociable en lab)

CRM métier, formations, sessions, participants, entreprises, formateurs, candidatures, examens, évaluations, émargements, compétences, certifications, Qualiopi, CNAPS, SSIAP, SST, documents, finance, facturation.

## Ce qu’on cherche chez GRACE (double rôle)

1. **Métier** : audit terrain / physical security.  
2. **Produit** : référence visuelle (React, shell, sidebar, dashboards, cards, tables, forms, design system) pour un éventuel front global GSMS — **étudier**, pas remplacer demain.

## Stacks (rappel docs upstream)

| App | Stack annoncée |
|-----|----------------|
| GRACE | React 19 + Vite, Fastify, Prisma, PostgreSQL, TypeScript |
| XACTA | Django / DRF, SvelteKit, TypeScript, PostgreSQL/SQLite |
| SIMPLERISK | (voir README du clone — PHP historique typique) |
| QATRIAL | (voir README du clone) |
| GSMS | Next.js App Router, Prisma, PostgreSQL, monorepo `lms-crm` |

## Hors scope lab (jusqu’à décision explicite)

- Merge de codebases  
- Schéma Prisma unifié  
- SSO / DB partagée  
- Refactor massif GSMS  
- Remplacement immédiat du front GSMS par GRACE
