# Circuit AO — vitrine, veille, Eve, Tender

**Date :** 2026-09-03 (élargi) · **MAJ :** 2026-09-04  
**Verdict :** LexSocket + TenderAI complémentaires · **pas** 2 pages plates · **pas** dans Xacta · orchestration **Eve** · livrables côté CRM / portail selon chantier #5.  
**Canon :** [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md) — Core = Comp CRM, pas InvoicePilot.

---

## 0. Ce qui est déjà traité (docs) vs code

| Couche | Doc | Code |
|--------|-----|------|
| Circuit AO cible | `ARCHITECTURE.md` §5 / §13 Cas A | **non câblé** |
| Entrée vitrine → CRM | `GSMS_INTEGRATION_MAP` `tender_request` · décision §21 `POST /api/public/tender-request` | **manquant** (tracking contact simple = PARTIEL) |
| Eve à la création Deal/Contact | capability map · Claude audit | **existe** (`AgentTriggerService`) |
| Agent Tender → MCP `:8090` | stack status · architecture | MCP **UP** ; agent **pas encore branché** |
| Core Mission AO + livrables | DocType + ce doc | **pas commencé** |
| LexSocket recherche | ce doc | **pas smoke-testé** |

---

## 1. Deux portes d’entrée (même dossier ensuite)

```text
A) CLIENT (vitrine)          B) VEILLE GSMS (interne)
   form AO précis               LexSocket / TED / BOAMP
   + pièces RFP/CCTP            shortlist → sélection
        │                              │
        └──────────┬───────────────────┘
                   ▼
         Deal CRM (tag AO) + Mission Core (kind AO)
                   ▼
         Eve → Agent Tender → TenderAI MCP
                   ▼
         fichiers DOCX/XLSX + statut
                   ▼
         Core page dossier (livrables) + carte Deal CRM
```

- **A — demande client :** le client sait déjà quel AO / envoie un dossier. Pas de LexSocket obligatoire.
- **B — veille proactive :** c’est **nous** qui cherchons ; on sélectionne ; on prépare le dossier ; **ensuite** même pipeline qu’en A.

Ne pas confondre les deux dans une seule page « recherche ».

---

## 2. Structure UI Core (plus que 2 écrans)

Hub **`/ao`** avec onglets / sous-routes — un seul objet métier : le **dossier AO** (`Mission` kind `AO` + `crmDealId`).

| Route | Rôle | Qui |
|-------|------|-----|
| `/ao` | Hub : compteurs inbox / veille / en cours / livrés | interne |
| `/ao/demandes` | Inbox des demandes vitrine (statut Deal, pièces, ouvrir dossier) | interne |
| `/ao/veille` | Recherche LexSocket (filtres CPV, NUTS, montant, deadline) + **panier / shortlist** | interne |
| `/ao/dossiers` | Liste tous les dossiers AO (filtre statut) | interne |
| `/ao/dossiers/$id` | **Cockpit dossier** (voir §3) | interne |
| Vitrine `/services/ao` (ou form) | Demande client → `POST /api/public/tender-request` | public |

La page « livrables » n’est **pas** isolée : c’est un **onglet** du cockpit dossier (avec go/no-go, pièces, statut Eve, fichiers).

---

## 3. Cockpit dossier `/ao/dossiers/$id` (cœur produit)

| Onglet | Contenu |
|--------|---------|
| Synthèse | origine (client \| veille), acheteur, deadline, montant, Deal CRM, deep link |
| Pièces | RFP/CCTP uploadés (client ou téléchargés) — meta + stockage |
| Qualification | go / no-go, notes, matrice conformité (sortie Tender) |
| Exécution | bouton « Lancer Agent Tender » → crée / poke `AgentTask` Eve (pas d’appel MCP depuis le browser) · statut tâche · logs courts |
| Livrables | liste DOCX/XLSX TenderAI + download via BFF Core |
| Commercial | stage Deal, next action Eve (lecture seule + lien CRM) |

---

## 4. Qui appelle qui ? (reco tranchée)

| Question | Réponse |
|----------|---------|
| Qui parle à Tender MCP ? | **Eve → Agent Tender** uniquement (tools MCP Bearer). Jamais React → `:8090`. |
| Qui parle à LexSocket ? | **Core BFF** (service account / proxy) pour la veille UI. Pas le navigateur. |
| Où voir le travail fini ? | **Principalement Core** (onglet livrables) — c’est l’UI manquante de Tender. |
| Rôle CRM / Eve | **Spine commercial + orchestration** : Deal, Activity, AgentTask, rechecks. Carte résumé Deal (statut + lien Core), pas les binaires. |
| Circuit Worker ? | Plus tard si transport lourd (upload multi-fichiers, retries) ; Eve décide, Worker transporte. Pas pour le MVP. |

**Pourquoi pas « tout dans Eve chat » :** Eve orchestre ; l’humain a besoin d’une page dossier stable (fichiers, go/no-go, historique).  
**Pourquoi pas « Core appelle Tender directement » :** contredit `ARCHITECTURE.md` (Eve / agents) et duplique le scheduler déjà là.

Flux cible :

```text
[UI Core] « Lancer » ──► CRM/Eve AgentTask (kind tender)
                              │
                              ▼
                     Agent Tender tools ──► TenderAI MCP
                              │
                              ▼
                     index SQLite + generated_proposals/
                              │
[UI Core] poll / webhook léger ◄── BFF lit fichiers + statut tâche
[Deal CRM] Activity « proposal ready » + lien /ao/dossiers/$id
```

---

## 5. Transit vitrine → apps (état réel)

### Documenté (cible)

```text
Vitrine form AO  →  POST /api/public/tender-request  →  Company + Contact + Deal (AO)
                 →  Eve (déjà sur deal.created)  →  Agent CRM qualification
                 →  (humain ou règle) Mission Core AO + éventuellement Agent Tender
```

Même schéma pour audit : `audit-request` → Deal → mission audit → Eve → **GRACE** → QAtrial…


### Implémenté aujourd’hui

- Tracking simple `POST /api/t/e` → Contact (+ Eve) si domaine allowlisté.
- **Pas** d’adapter enrichi AO/audit + pièces.
- **Pas** de `RecordSource` FORM/API ni `externalId` sur Deal (prérequis migration CRM).
- Tender MCP up ; **pas** d’Agent Tender branché ; dossier `generated_proposals/` vide.

### Retour apps → UI

| Sens | Mécanisme cible |
|------|-----------------|
| Tender → Core | BFF lit index / fichiers (ou AgentTask result payload) |
| Tender → CRM | Activity + stage Deal (résumé), pas les DOCX dans Prisma CRM |
| Apps audit → Core/CRM | snapshots + deep links (déjà doctrine DocType) — **pas encore codé** |

---

## 6. MCP LexSocket / TenderAI (rappel)

| | LexSocket | TenderAI MAX (NUC) |
|--|-----------|---------------------|
| Job | trouver | répondre |
| Host | `mcp.lexsocket.ai` | `:8090` |
| Limite | ~25 req/h free | local |

Complémentarité OK. Smoke BOAMP avant engagement prod.

---

## 7. Décisions

| Question | Réponse |
|----------|---------|
| 2 pages plates ? | **Non** — hub + demandes + veille + cockpit dossier (onglets) |
| Nouvelle app Django / Xacta ? | **Non** |
| Orchestration Tender | **Eve / Agent Tender** |
| Affichage livrables | **Core** (onglet) + lien depuis Deal |
| Next code | 1) migration CRM public fields 2) `tender-request` 3) DocType Mission AO 4) stub `/ao/*` 5) brancher Agent Tender |
