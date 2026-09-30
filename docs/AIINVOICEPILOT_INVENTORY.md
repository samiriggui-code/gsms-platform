# AIInvoicePilot — Inventory (discovery)

**Date :** 2026-09-03  
**Path :** `apps/InvoicePilot-AI`  
**Package :** `invoicepilot-ai`  
**Méthode :** lecture code (pas de modification)

---

## 1. Stack

| Item | Fait |
|------|------|
| Frontend | **Vite 8** + **React 19** + **TanStack Start** (file routes) |
| Backend | Nitro / server functions `src/fns/*` + `src/server.ts` |
| DB | PostgreSQL + **Prisma 6** (`prisma/schema.prisma`) |
| Auth | Custom cookie sessions + scrypt + email OTP 2FA (**pas** NextAuth) |
| UI | Tailwind 4, shadcn/Radix, ReUI, shell type Metronic |
| Port lab | ~8081 |

**Incompatible stack avec Comp CRM** (Next.js App Router + NestJS/tRPC).

---

## 2. Routes / pages

### Marketing (`_marketing`)
`/` · registry slugs : `/fonctionnalites`, `/connecteurs`, `/changelog`, `/analyse-ia`, `/faq`, `/guide-reforme-2026`, `/blog`, `/webinaires`, `/status`, `/a-propos`, `/cabinets-comptables`, `/licences-api`, `/partenaires`, `/contact`, légals…

### Auth
`/login` · `/signup` · `/2fa` · `/forgot-password` · `/reset-password` · `/invite/$token` · `/session-locked`

### Back-office SaaS (`_app`)
`/dashboard` · `/compliance` · `/clients` · `/establishments` · `/platforms` · `/integrations` · `/agent` · `/invoices*` · `/e-reporting` · `/inbox*` · `/team*` · `/billing*` · `/settings` · `/profile` · `/notifications`

---

## 3. Layouts / design

- `src/routes/__root.tsx`, `_marketing.tsx`, `_app.tsx` → `AppShell.tsx`
- `src/components/ui/`, `reui/`, `metronic/`, `landing/` (Hero, etc.)
- Docs Mintlify : `apps/docs/` (port 3004)

---

## 4. Backend API

| Endpoint | Rôle |
|----------|------|
| `POST /api/stripe/webhook` | Billing SaaS |
| `/api/v1/*` | Health, sources import, invoices validate/emit, inbox, compliance, webhooks PA |
| `src/fns/*` | Backend app (auth, clients, invoices, contact, AI, team…) |

Jobs = `PipelineJob` Prisma (pas de worker séparé).

---

## 5. Business domains

| Domain | Existe ? |
|--------|----------|
| Leads / opportunities | **NON** |
| Clients | **OUI** — `Counterparty` |
| Documents / factures | **OUI** — cœur produit e-facture |
| Contact marketing | **OUI** — `ContactMessage` + `fns/contact.ts` |
| Accounting ledger | Non (compliance / e-reporting) |
| AI extraction | Anthropic PDF |

---

## 6. Modèles Prisma (principaux)

Auth/tenancy : `User`, `AuthSession`, `Organization`, `OrganizationMember`, …  
Produit : `Counterparty`, `Invoice*`, `PaInboxDocument`, `Compliance*`, `MerchantIntegration`, `AiConversation`, `ContactMessage`, `WebhookEndpoint`, `PipelineJob`, `StorageObject`, …

---

## 7. Auth

Signup + org + trial · login scrypt · 2FA email · cookie session · API keys Bearer · multi-org cookie.

---

## 8. Intégrations

SMTP/Mailpit · Stripe · Anthropic · data.gouv SIREN · Shopify/Woo/… · PA sandbox · Mintlify.

---

## 9. Public vs back-office

| Zone | Rôle GSMS potentiel |
|------|---------------------|
| Marketing + landing | **KEEP / REBRAND** façade GSMS |
| Auth pages | ADAPT / unify avec CRM |
| `_app` facturation | **ARCHIVE / hors scope** façade (produit e-facture historique) |
| `ContactMessage` | **CONNECT** → CRM Lead/Contact |

---

## 10. Overlap CRM

Pas de Lead/Deal. Overlap lexical : clients (`Counterparty`), org/team, notifications.  
**Ce n’est pas un CRM commercial** — c’est un SaaS e-facture FR 2026.
