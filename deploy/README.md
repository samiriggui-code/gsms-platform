# Déployer GSMS Platform sur le VPS

Une commande installe tout en Docker : PostgreSQL, Core (FastAPI) et Web (Next.js). L'application se branche
**sur le Traefik déjà en place** par étiquettes Docker. **Pas de Caddy** ; rien d'existant n'est arrêté ni
modifié. Seul le web est publié ; le Core et la base restent sur le réseau interne du projet.

Méthode reprise de `gsms-qualiopi/deploy` (même principe : `deploy.sh` idempotent, `.env` généré, `COMPOSE_FILE`).

```
Internet ──443──> Traefik (existant) ──> web (Next.js :3000) ──> core (FastAPI :8000) ──> db (PostgreSQL 16 + pgvector)
```

## Installation (VPS, root)

Prérequis :
- **DNS :** enregistrement **A** `gsms-security.com` → IP du VPS (`187.77.166.124`).
- **Traefik :** en marche, avec une entrée `:443` et un résolveur Let's Encrypt.

```bash
curl -fsSLO https://raw.githubusercontent.com/samiriggui-code/gsms-platform/main/deploy/install.sh && bash install.sh
# avec l'organisation de démonstration (ABC Retail, sites Lyon et Paris) :
bash install.sh --demo
```

Ou à la main :

```bash
git clone https://github.com/samiriggui-code/gsms-platform.git /opt/gsms-platform
cd /opt/gsms-platform
./deploy/deploy.sh gsms-security.com          # ou : ./deploy/deploy.sh gsms-security.com --demo
docker compose exec core python -m gsms_core.cli create-admin vous@gsms-security.com "Votre nom"
```

## Ce que fait `deploy.sh`

1. **Vérifie le DNS** : le domaine doit pointer vers ce serveur. Passer outre avec `SKIP_DNS_CHECK=1`.
2. **Crée `.env`** (droits 600, jamais committé) au premier lancement, avec des secrets aléatoires :
   - `POSTGRES_PASSWORD` ;
   - `GSMS_JWT_SECRET` ;
   - `GSMS_WEBHOOK_SECRETS` (HMAC des webhooks GRACE, QAtrial et CRM vers le Core).
3. **Lit la configuration de Traefik** (arguments de lancement, puis `--configFile` ou `traefik.yml`) et en déduit :
   - le **mode réseau**. En **host** (cas du VPS GSMS), Traefik rejoint `gsms-platform_default`, le réseau interne du projet, sans réseau partagé. Sinon, le web rejoint le réseau Docker de Traefik.
   - l'**entrée :443** (`websecure`…), l'**entrée :80** pour la redirection HTTP → HTTPS si elle existe, et le **résolveur de certificats**.
4. **Contrôle les conflits** :
   - un autre conteneur déclarant déjà le routeur `gsms-platform` arrête le script ;
   - des ports locaux déjà pris aussi : `127.0.0.1:8100` (Core) et `127.0.0.1:3100` (Web), distincts de qualiopi (8000 / 3000).
5. **`docker compose up -d --build`**. Les migrations Alembic passent au démarrage du Core.

Si une valeur Traefik ne peut pas être lue, le script s'arrête et indique quoi préciser :

```bash
TRAEFIK_ENTRYPOINT=websecure TRAEFIK_CERTRESOLVER=letsencrypt ./deploy/deploy.sh gsms-security.com
# autres surcharges possibles : TRAEFIK_NETWORK, TRAEFIK_HTTP_ENTRYPOINT
```

## Précautions Traefik

- **Noms préfixés `gsms-platform`** (routeur, service, middleware de redirection) : aucune collision avec qualiopi ni les autres sites.
- **Seul `web` porte des étiquettes `traefik.*`.** Le Core et la base ne sont jamais routés.
- **`traefik.enable=true` est explicite**, donc ça fonctionne avec `exposedByDefault=false`.
- **Le certificat ne couvre que `gsms-security.com`.** Pour `www.gsms-security.com`, créer d'abord son DNS, puis ajouter `|| Host(\`www.${DOMAIN}\`)` à la règle du routeur. Sinon Let's Encrypt échoue pour tout le certificat.
- Le nom de projet est fixé (`name: gsms-platform` dans `docker-compose.yml`) : le réseau s'appelle toujours `gsms-platform_default`, quel que soit le dossier du clone.
- **Healthcheck :** Traefik ne route vers le web qu'une fois son healthcheck vert. Pendant une mise à jour, le site répond 404 environ 10 à 20 secondes, le temps que le nouveau conteneur démarre.
- **`APP_URL=https://$DOMAIN`** est écrit dans `.env` par `deploy.sh` et injecté dans le conteneur `web`. Sans ça, Next (HOSTNAME=0.0.0.0) renvoie des redirects vers `https://0.0.0.0:3000/…` (logout, garde `/app`).
- **Docker 29 et Traefik < 3.6 :** Docker 29 refuse l'ancienne API qu'utilisent les Traefik 3.5 et antérieurs. Le fournisseur Docker de Traefik échoue alors (« client version 1.24 is too old ») et **aucun site** n'est plus routé. Si Docker est mis à jour sur le VPS, passer Traefik en v3.6 ou plus.

## Mettre à jour

```bash
cd /opt/gsms-platform && git pull && ./deploy/deploy.sh gsms-security.com
```

Les données (base, documents) sont dans les volumes Docker `gsms-platform_gsms-postgres` et `gsms-platform_gsms-documents` et survivent aux mises à jour.

## Exploitation

```bash
cd /opt/gsms-platform                      # .env indique à Docker les fichiers à utiliser (COMPOSE_FILE)
docker compose ps                          # état
docker compose logs -f core web            # journaux
docker compose exec db pg_dump -U gsms gsms_core | gzip > sauvegarde-$(date +%F).sql.gz
docker compose exec core python -m gsms_core.cli create-admin autre@gsms-security.com "Nom"
```

Sauvegardez aussi le volume des documents et une copie de `.env`. Sans `GSMS_JWT_SECRET`, les sessions en cours sont invalidées.

## Connecter les services spécialisés (plus tard)

Renseigner dans `.env`, puis relancer `deploy.sh` :
- **Services :** `GSMS_CRM_URL` / `_TOKEN`, `GSMS_GRACE_URL` / `_TOKEN`, `GSMS_QATRIAL_URL` / `_TOKEN` ;
- **MCP AO :** `GSMS_TENDERAI_MCP_URL` / `_TOKEN`.

Les secrets de `GSMS_WEBHOOK_SECRETS` sont à recopier dans chaque application émettrice.
