# AIInvoicePilot — Refactor Matrix

**Date :** 2026-09-03  
**Base :** [`AIINVOICEPILOT_INVENTORY.md`](./AIINVOICEPILOT_INVENTORY.md)  
**Règle :** décisions fondées sur le code ; pas de delete structurel avant validation.

| Capability | Current implementation | Useful GSMS? | CRM already has it? | Decision | Target |
|------------|------------------------|-------------:|--------------------:|----------|--------|
| Landing / marketing pages | `_marketing` + landing components | YES | Partial (`IS_MARKETING` landing CRM) | **KEEP/REBRAND** | Public GSMS |
| Design system / UI kits | shadcn + ReUI + Metronic shell | YES | CRM has own `packages/ui` | **KEEP** (public) · **INVESTIGATE** share tokens | Public |
| Contact form | `ContactMessage` + `fns/contact.ts` | YES | Tracking `FormSubmission` ; pas intake lead public prêt | **CONNECT** | CRM Company/Contact/Deal |
| Lead form audit / AO | Absent | YES | Absent as public intake | **CREATE** on public + **CRM OWNER** | CRM |
| Document upload (intake) | Invoice PDF / storage pipeline | Partial | No Document model CRM | **INVESTIGATE** reuse StorageObject pattern or CRM attachments | Core adapter |
| Clients (`Counterparty`) | Full CRUD | NO for GSMS façade | YES `Company` | **REMOVE DUPLICATE** (façade) · ARCHIVE module | CRM |
| Invoice engine | Core product | TBD later | NO | **ARCHIVE** (hors façade) · keep code | TBD produit |
| Compliance / PA / e-reporting | Core product | NO façade | NO | **ARCHIVE** | TBD |
| Dashboard SaaS | `_app/dashboard` | NO | YES CRM dashboard | **REMOVE** from public product | CRM |
| Team / billing Stripe | SaaS multi-tenant | NO façade | CRM workspace/members | **ARCHIVE** | — |
| Auth (custom) | Cookie + 2FA | YES login entry | NextAuth CRM | **INVESTIGATE** redirect → CRM auth | Platform auth |
| API v1 e-facture | OpenAPI | NO façade | — | **ARCHIVE** | — |
| AI agent invoice | Anthropic extract | NO façade | Eve elsewhere | **ARCHIVE** | — |
| Signup public | `/signup` | Maybe | CRM : no public signup | **REMOVE** or invite-only | CRM users |

### Légende décisions

`KEEP` · `ADAPT` · `CONNECT` · `MOVE` · `REMOVE` · `ARCHIVE` · `INVESTIGATE` · `CREATE`
