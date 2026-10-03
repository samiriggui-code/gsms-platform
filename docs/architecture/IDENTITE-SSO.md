# Identité unique : le Core gère les comptes de l'équipe, les apps s'y connectent (OIDC)

Chaque application garde **sa propre base**. Le Core est la **seule source** des comptes de l'équipe GSMS et de
leurs rôles : on crée, modifie ou désactive un membre une fois, dans **Paramètres → Équipe** du portail.

- **DocuLens** : « Se connecter avec GSMS » (client OIDC **public**, PKCE obligatoire, sans secret) ; le code
  s'échange contre une session du Core (`POST /api/v1/auth/oidc-session`). Le formulaire e-mail + mot de passe
  GSMS reste disponible. Déclaration : `cli sso-client doculens` (fait par `deploy/deploy-all.sh`).
- **GRACE, CRM, QAtrial** : bouton « Se connecter avec GSMS » (OpenID Connect, flux *authorization code*).
  À la connexion, l'app crée ou met à jour l'utilisateur **dans sa propre base** à partir de l'e-mail, avec le
  rôle que le Core lui transmet. Un compte désactivé dans le Core ne peut plus se connecter nulle part.

## Fournisseur OIDC (le Core, publié par le portail)

Émetteur (`issuer`) : l'URL publique du portail, `GSMS_APP_URL` (ex. `https://gsms-security.com`).

| Point d'accès | URL |
|---|---|
| Découverte | `{issuer}/.well-known/openid-configuration` |
| Autorisation | `{issuer}/oidc/authorize` (page du portail : connexion si besoin, puis redirection) |
| Jeton | `{issuer}/oidc/token` (POST, `client_secret_post` ou `client_secret_basic`) |
| Clés publiques | `{issuer}/oidc/jwks` |
| Profil | `{issuer}/oidc/userinfo` (Bearer = access_token) |
| Déconnexion | `{issuer}/oidc/logout?post_logout_redirect_uri=…` |

- Réponse `code` uniquement ; code à usage unique, valable 60 s, lié au client, au `redirect_uri`, au `nonce`
  et au défi PKCE (`S256`, facultatif mais recommandé).
- Signature **RS256** ; la clé privée est générée par le Core et stockée chiffrée (clé maître du coffre-fort).
- `redirect_uri` comparé **à l'identique** aux adresses enregistrées pour le client.
- Refus (`error=access_denied` renvoyé au `redirect_uri`) : compte inactif, compte client (non-équipe) ou accès à
  cette application désactivé pour ce membre.

### Jetons

`id_token` (et `userinfo`) :

| Claim | Contenu |
|---|---|
| `iss`, `aud`, `sub`, `exp`, `iat`, `auth_time`, `nonce` | standard ; `sub` = identifiant Core du membre |
| `email`, `email_verified` (`true`), `name`, `given_name`, `family_name`, `locale` | profil |
| `gsms_role` | **rôle dans l'application cliente**, déjà traduit (voir le tableau) |
| `gsms_core_role` | rôle Core (`owner`, `admin`, `manager`, `consultant`, `auditor`, `member`, `viewer`) |

`access_token` : JWT RS256 (`aud` = client), valable 1 h, accepté par `userinfo`.

## Rôles : un rôle Core, traduit pour chaque application

Le rôle de base se choisit dans le portail ; chaque membre peut avoir une **dérogation par application** (autre
rôle, ou accès coupé).

| Rôle Core (portail) | DocuLens | GRACE | QAtrial | CRM |
|---|---|---|---|---|
| `owner` — super admin | owner | `ADMIN` | `admin` | `owner` |
| `admin` — administrateur | admin | `ADMIN` | `admin` | `admin` |
| `manager` — responsable | manager | `LEAD_ASSESSOR` | `qa_manager` | `member` |
| `consultant` — analyste | analyst | `ASSESSOR` | `qa_engineer` | `member` |
| `member` — membre | analyst | `ASSESSOR` | `qa_engineer` | `member` |
| `auditor` — relecteur | reviewer | `REVIEWER` | `reviewer` | `member` |
| `viewer` — lecteur | viewer | `STAKEHOLDER` | `auditor` | *pas d'accès* |

## Clients OIDC

Un client par application (`grace`, `crm`, `qatrial`), avec son secret (haché dans le Core, affiché une seule
fois) et ses adresses de retour :

```bash
docker compose exec core python -m gsms_core.cli sso-client grace \
  --redirect-uri https://grace.gsms-security.com/api/auth/sso/callback
```

Le secret se régénère aussi dans **Paramètres → Applications connectées**.

### Variables côté applications

| App | Variables |
|---|---|
| GRACE (`apps/grace/server`) | `SSO_ENABLED=true`, `SSO_ISSUER_URL`, `SSO_CLIENT_ID=grace`, `SSO_CLIENT_SECRET`, `SSO_CALLBACK_URL`, `SSO_ROLE_CLAIM=gsms_role` |
| QAtrial (`apps/qatrial`) | `SSO_ENABLED=true`, `SSO_ISSUER_URL`, `SSO_CLIENT_ID=qatrial`, `SSO_CLIENT_SECRET`, `SSO_CALLBACK_URL`, `SSO_ROLE_CLAIM=gsms_role`, `SSO_ORG_NAME=GSMS` |
| CRM (`apps/crm`) | `GSMS_SSO_ISSUER`, `GSMS_SSO_CLIENT_ID=crm`, `GSMS_SSO_CLIENT_SECRET` (retour : `{NEXTAUTH_URL}/api/auth/callback/gsms`) |

Les connexions locales (mot de passe propre à chaque app) restent possibles pour les comptes déjà créés ; un
compte local et un compte GSMS de même e-mail sont **le même utilisateur**.
