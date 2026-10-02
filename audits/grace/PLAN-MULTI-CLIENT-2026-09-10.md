# Plan — Grace multi-client (`workspaceId`)

**Date :** 2026-09-10 · **Auteur :** Claude (plan seul, aucun code touché — demande explicite Samir de rester au stade plan pour ce chantier)
**Point de départ :** [`CARTOGRAPHIE-APPS-SPECIALISATION-DOMAINE-2026-09-10.md`](./CARTOGRAPHIE-APPS-SPECIALISATION-DOMAINE-2026-09-10.md) §1.4 — `client_id` est aujourd'hui `process.env.GSMS_CLIENT_ID` (repli `"grace-local"`), une seule valeur pour toute l'instance.

---

## 1. Ce qu'on modélise réellement

Grace n'est **pas** un SaaS multi-tenant classique (un tenant = un client payant avec ses propres comptes). C'est un outil **interne GSMS** : les utilisateurs (`User` — ADMIN/LEAD_ASSESSOR/ASSESSOR/REVIEWER/STAKEHOLDER) sont des collaborateurs GSMS ou des parties prenantes, qui interviennent sur les dossiers de **plusieurs clients** (les entreprises/sites audités) au fil du temps. Un même assesseur peut travailler sur le site A ce mois-ci et le site B le mois suivant.

→ Le bon modèle n'est donc pas « 1 utilisateur = 1 tenant exclusif » mais **« 1 client GSMS = un périmètre de données isolé, auquel des utilisateurs GSMS sont rattachés (plusieurs clients possibles par utilisateur, plusieurs utilisateurs par client) »**. C'est un modèle d'appartenance (`ClientMembership`), pas un modèle de tenant strict façon Organization/Member classique.

Terme retenu pour la suite du document : **`Client`** (l'entreprise/site auditée), pas `Workspace` — cohérent avec le vocabulaire déjà utilisé ailleurs dans la stack (`GSMS_CLIENT_ID`, `finding.schema.json` champ `client_id`, `CRM` qui a déjà la notion de `Company` cliente).

---

## 2. État actuel vérifié (racine du problème)

- `schema.prisma:1-3` : *« single-tenant instance. Organization is a singleton row »*. Un seul `Organization` en base, jamais utilisé pour filtrer quoi que ce soit.
- `Asset` (`schema.prisma:98-146`) est **l'entité racine hiérarchique** (`SITE > BUILDING > FLOOR > ROOM > ZONE > EQUIPMENT...`, `parentId` auto-référencé, `@@index([path])`). Tout le reste du modèle métier en dépend directement ou indirectement :
  - `Assessment` ↔ `Asset` via la relation `AssessmentAsset` (`Asset.assessments`)
  - `Threat.assets` — relation directe à `Asset`
  - `Countermeasure.assets` — relation directe à `Asset` (`CountermeasureAsset`)
  - `Incident.assets`, `ClusterSurveyScopeItem.assets`, `SurveyResponseAaaScore.assets` — idem
  - `CountermeasureGap` ne porte que `assessmentId` (pas de lien direct à `Asset`, mais accessible via `Assessment → Asset`)
- `User` (`schema.prisma:41-82`) n'a **aucune** colonne d'appartenance à un client — `email` est `@unique` globalement.
- JWT (`lib/jwt.ts:3-7`) : `{ sub, role, email }` — aucune notion de périmètre client dans le token.
- `rbac.ts:85` : `req.user as { role?: Role }` — la vérification de permission est purement basée sur le rôle global, jamais sur un périmètre de données.
- `findings.ts:118-120` : `clientId()` lit `GSMS_CLIENT_ID` en variable d'env — donc un seul « client » possible par déploiement entier de Grace.

**Conséquence concrète du problème** : si GSMS gère aujourd'hui 3 clients sur une seule instance Grace, les 3 dossiers d'audit sont mélangés dans la même base sans cloison, et l'API `/api/findings` renvoie la même valeur `client_id` fixe pour tout, peu importe le site réel concerné — ce qui casse tout agrégateur avalé côté CRM/Eve qui voudrait distinguer les clients.

---

## 3. Modèle cible

### 3.1 Nouveau modèle `Client`

```prisma
model Client {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   @db.VarChar(255)
  slug      String   @unique @db.VarChar(100)   // → devient le client_id stable exposé dans /findings
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  memberships ClientMembership[]
  assets      Asset[]

  @@map("clients")
}

model ClientMembership {
  id        String       @id @default(uuid()) @db.Uuid
  clientId  String       @map("client_id") @db.Uuid
  userId    String       @map("user_id") @db.Uuid
  role      ClientRole   @default(ASSESSOR)   // rôle *dans ce client* — peut différer du User.role global (ex: un LEAD_ASSESSOR globalement peut être simple REVIEWER sur un client donné)
  createdAt DateTime     @default(now()) @map("created_at")

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([clientId, userId])
  @@map("client_memberships")
}
```

- `Organization` (l'actuel singleton) **reste** — il redevient ce qu'il prétend déjà être dans son commentaire d'en-tête : les métadonnées de l'**instance Grace elle-même** (marque blanche, thème, tier d'abonnement), pas un client. Pas de renommage, pas de migration de données dessus — juste un changement de doctrine documentée (« Organization = l'instance Grace, Client = qui est audité »).
- `slug` de `Client` devient le `client_id` stable renvoyé par `/api/findings` — remplace `GSMS_CLIENT_ID` env var.

### 3.2 Propagation de `clientId`

**Source de vérité : `Asset` racine (`assetType: SITE`, `parentId: null`).** Chaque site audité appartient à un client. Ajout :

```prisma
model Asset {
  ...
  clientId String  @map("client_id") @db.Uuid
  client   Client  @relation(fields: [clientId], references: [id])
  ...
  @@index([clientId])
}
```

Contrainte applicative (pas exprimable proprement en Prisma seul) : un `Asset` enfant doit hériter le `clientId` de son parent — à faire respecter dans le service de création/déplacement d'asset (`assets` module), pas seulement en base. Alternative plus robuste si le temps le permet : trigger Postgres qui recopie `clientId` du parent à l'insertion, pour empêcher une incohérence même via un accès direct à la base.

**Dénormalisation ciblée** (pour éviter un `JOIN` systématique sur chaque requête de filtrage, et pour que Postgres RLS — §3.4 — reste simple) : ajouter aussi `clientId` (non-nullable, FK vers `Client`) sur :
- `Assessment` (déjà lié à un `Asset` unique via la relation — `clientId` recopié à la création)
- `Threat` — recopié depuis l'asset ciblé
- `Countermeasure` — idem
- `Incident` — idem
- `CountermeasureGap` — recopié depuis `Assessment.clientId` (pas de lien direct à `Asset` aujourd'hui)

Chacune de ces tables gagne `@@index([clientId])`.

**Table à NE PAS toucher** : `TemplatePackage`/`TemplateModule`/`AssetTemplate`/`ThreatTemplate`/`CountermeasureTemplate` (catalogue de référentiels — `erp-precommission`, `site-surete`, etc.) et les catalogues `server/data/controls/*.json` (`SSP`, ISO, SOC2) restent **globaux, partagés entre tous les clients** — ce sont des référentiels, pas des données d'audit. Aucun `clientId` à y ajouter.

### 3.3 `User`

Pas de `organizationId`/`clientId` direct sur `User` (un utilisateur peut appartenir à plusieurs clients). L'appartenance passe uniquement par `ClientMembership`. `email` reste `@unique` globalement (ce sont des comptes GSMS internes, pas des comptes par client — pas de raison de permettre le même email sur deux clients).

### 3.4 Isolation au niveau requête — deux options, à trancher avec Samir

| Option | Description | Avantage | Coût |
|---|---|---|---|
| **A. Filtrage applicatif** | Chaque route Fastify ajoute `where: { clientId: { in: userClientIds } }` (ou `clientId: activeClientId` si sélection explicite d'un client actif en session) | Simple, pas de dépendance Postgres avancée, cohérent avec le style de code actuel (`findings.ts` fait déjà du filtrage manuel) | Risque d'oubli : une route non auditée = fuite de données. Nécessite une revue systématique de **toutes** les routes lisant `Assessment`/`Threat`/`Countermeasure`/`Incident`/`CountermeasureGap`/`Asset` |
| **B. Row-Level Security Postgres** | Policy RLS sur les tables ci-dessus, activée via `SET app.current_client_ids = '...'` en début de transaction (middleware Fastify → hook `onRequest`) | Isolation garantie même en cas d'oubli applicatif — filet de sécurité au niveau base | Prisma ne gère pas nativement RLS (nécessite `$executeRaw SET LOCAL` par requête + connexion en mode transaction, ou un rôle Postgres dédié) ; plus complexe à mettre en place et à débugger |

**Recommandation** : commencer par **A** (livrable plus vite, cohérent avec l'existant), documenter explicitement la liste des routes à filtrer (§4), et envisager **B** seulement si le volume de routes/développeurs grandit au point que l'oubli devient un risque réel. Ne pas sur-ingénierer dès le départ — décision à confirmer avec Samir avant de coder.

---

## 4. Surface API à toucher (inventaire, pour chiffrer l'effort)

Toute route qui lit/écrit `Asset`, `Assessment`, `Threat`, `Countermeasure`, `CountermeasureGap`, `Incident`, `ClusterSurveyScope*`, `SurveyResponse*`, `Notification` (côté lecture liée à un asset) doit :
1. Résoudre le/les `clientId` accessibles à l'utilisateur courant (depuis `ClientMembership`, pas depuis le JWT seul — l'appartenance peut changer sans réémettre le token).
2. Filtrer la requête Prisma en conséquence, ou refuser (403) si l'entité demandée par `id` n'appartient à aucun client accessible.

Modules concernés (à recenser précisément en phase de chiffrage, liste de départ d'après la structure `server/src/modules/`) : `assets`, `assessments`, `surveys`, `circuit` (findings + controls-catalog + cyber), `notifications` (filtrage déjà partiel par `userId`, à croiser avec `clientId`), `incidents` si le module existe séparément.

**Cas particulier `findings.ts`** : `clientId()` (l.118-120) est remplacé par une résolution réelle — le `client_id` du payload de sortie devient `asset.client.slug` (ou `assessment.client.slug`) au lieu d'une constante globale. Le filtre `assessmentId` optionnel actuel (l.151-193) doit devenir : filtrer par les `clientId` accessibles à l'appelant **avant** tout filtre optionnel supplémentaire.

**Cas particulier `controls-catalog.ts`** : pas de changement — reste un catalogue global (§3.2).

---

## 5. JWT / session

Deux approches, à trancher :

- **5a. Token léger + résolution à chaque requête** — le JWT garde `{ sub, role, email }` tel quel ; chaque requête interroge `ClientMembership` pour connaître le périmètre. Simple, toujours à jour (retrait d'accès immédiat), mais un aller-retour DB de plus par requête (acceptable au volume actuel de Grace).
- **5b. Token enrichi** — le JWT porte `clientIds: string[]` en plus, régénéré à chaque login/refresh. Moins d'aller-retours DB, mais un accès retiré à un client reste valide jusqu'à expiration du token (risque de sécurité si retrait urgent nécessaire) — nécessiterait une révocation de token, non implémentée aujourd'hui.

**Recommandation : 5a**, plus sûr, et Grace n'a pas de volumétrie qui justifie l'optimisation de 5b pour l'instant.

En plus : un utilisateur avec accès à plusieurs clients a besoin d'un **client actif** en session côté front (sélecteur, comme `useProjectStore` chez QAtrial mais à l'échelle client plutôt que dossier) — à stocker côté client (pas dans le JWT), transmis en header ou query param (`X-Client-Id`) validé côté serveur contre `ClientMembership` à chaque requête (jamais faire confiance à une valeur front non revalidée).

---

## 6. Migration — séquence proposée

1. **Migration additive pure** : créer `Client`, `ClientMembership`, ajouter les colonnes `clientId` en **nullable** sur `Asset`/`Assessment`/`Threat`/`Countermeasure`/`Incident`/`CountermeasureGap`. Zéro régression, l'app continue de tourner sans filtrage (comportement actuel inchangé).
2. **Backfill** : créer un `Client` unique correspondant à la valeur actuelle de `GSMS_CLIENT_ID` (`"grace-local"` ou la valeur réelle utilisée en prod), y rattacher tous les `Asset` racine existants et propager `clientId` aux tables dénormalisées. Rattacher tous les `User` actifs à ce client via `ClientMembership` (rôle = leur `User.role` global, point de départ raisonnable).
3. **Passage en `NOT NULL`** une fois le backfill vérifié (colonnes ne peuvent plus être nulles — migration séparée, après confirmation qu'aucune ligne orpheline ne subsiste).
4. **Filtrage applicatif** (option A, §3.4) route par route, avec tests d'intégration par route (créer 2 clients de test, vérifier l'étanchéité — un utilisateur du client A ne voit rien du client B).
5. **Retrait de `GSMS_CLIENT_ID`** de `findings.ts` et de la config d'environnement une fois le filtrage réel en place.
6. **Front** : sélecteur de client actif (nouveau composant, à l'échelle app — au-dessus du niveau assessment), propagation du `clientId`/`X-Client-Id` dans le client HTTP.

Chaque étape est déployable indépendamment sans casser la prod (additif → backfill → contrainte → filtrage → nettoyage). Pas d'étape « big bang ».

---

## 7. Risques identifiés

- **Oubli de filtrage sur une route** = fuite de données entre clients — c'est le risque numéro 1 de l'option A (§3.4). Nécessite une checklist explicite de toutes les routes concernées avant de considérer le chantier « fini », pas une revue au fil de l'eau.
- **Hiérarchie `Asset.parentId` auto-référencée** : rien n'empêche aujourd'hui en base qu'un enfant ait un `clientId` différent de son parent si la contrainte n'est appliquée qu'en applicatif (§3.2) — à surveiller particulièrement lors d'un déplacement d'asset entre branches (`parentId` réassigné).
- **`CountermeasureGap`** n'a pas de lien direct à `Asset` — son `clientId` dénormalisé dépend entièrement de la fiabilité de la recopie depuis `Assessment` à la création ; un bug de recopie y serait silencieux (pas de contrainte FK naturelle vers `Asset` qui le détecterait).
- **Templates/catalogues globaux (§3.2)** : si un jour un client demande un référentiel *personnalisé* non partagé avec les autres clients, ce plan ne le couvre pas — hors périmètre volontaire ici, à ouvrir séparément si le besoin apparaît.

---

## 8. Ce que ce document n'est pas

Un plan, pas une implémentation. Aucune migration Prisma écrite, aucune route modifiée. Prochaine étape si GO : chiffrer précisément le nombre de routes à toucher (§4) module par module, puis démarrer à l'étape 1 de la séquence (§6) — migration additive, zéro risque de régression.
