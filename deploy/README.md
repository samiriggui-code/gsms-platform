# Déployer GSMS Platform sur le VPS

Une commande installe tout en Docker : PostgreSQL, Core (FastAPI, avec Docling), Web (Next.js) et DocuLens
(interface documentaire). L'application se branche **sur le Traefik déjà en place** par étiquettes Docker.
**Pas de Caddy** ; rien d'existant n'est arrêté ni modifié. Seuls le web et DocuLens sont publiés ; le Core et
la base restent sur le réseau interne du projet.

Méthode reprise de `gsms-qualiopi/deploy` (même principe : `deploy.sh` idempotent, `.env` généré, `COMPOSE_FILE`).

```
Internet ──443──> Traefik (existant) ─┬─> gsms-security.com           web (Next.js :3000) ──┐
                                      └─> doculens.gsms-security.com  doculens (nginx :80) ─┴─> core (FastAPI :8000) ──> db
```

DocuLens (`apps/doculens`, image `docker/Dockerfile.gsms`) ne sert que son interface ; nginx relaie
`/api/v1/auth/*` et `/api/v1/workspaces/*` au Core sur le même domaine (pas de CORS). Mêmes comptes que la
plateforme. Le dépôt d'un document lance l'analyse Docling puis le Digest dans le Core.

## Installation (VPS, root)

Prérequis :
- **DNS :** enregistrements **A** `gsms-security.com` et `doculens.gsms-security.com` → IP du VPS (`187.77.166.124`).
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

1. **Vérifie le DNS** : le domaine doit pointer vers ce serveur. Passer outre avec `SKIP_DNS_CHECK=1`. Pour `doculens.<domaine>`, simple avertissement.
2. **Crée `.env`** (droits 600, jamais committé) au premier lancement, avec des secrets aléatoires :
   - `POSTGRES_PASSWORD` ;
   - `GSMS_JWT_SECRET` ;
   - `GSMS_WEBHOOK_SECRETS` (HMAC des webhooks GRACE, QAtrial et CRM vers le Core).
3. **Lit la configuration de Traefik** (arguments de lancement, puis `--configFile` ou `traefik.yml`) et en déduit :
   - le **mode réseau**. En **host** (cas du VPS GSMS), Traefik rejoint `gsms-platform_default`, le réseau interne du projet, sans réseau partagé. Sinon, le web rejoint le réseau Docker de Traefik.
   - l'**entrée :443** (`websecure`…), l'**entrée :80** pour la redirection HTTP → HTTPS si elle existe, et le **résolveur de certificats**.
4. **Contrôle les conflits** :
   - un autre conteneur déclarant déjà le routeur `gsms-platform` arrête le script ;
   - un autre conteneur servant déjà `doculens.<domaine>` (ancienne stack DocuLens) aussi ;
   - des ports locaux déjà pris aussi : `127.0.0.1:8100` (Core), `127.0.0.1:3100` (Web) et `127.0.0.1:3110` (DocuLens), distincts de qualiopi (8000 / 3000).
5. **`docker compose up -d --build`**. Les migrations Alembic passent au démarrage du Core.
   Le premier build du Core est long (PyTorch CPU + modèles Docling, environ 2 Go d'image) ; les suivants
   réutilisent le cache Docker.

Si une valeur Traefik ne peut pas être lue, le script s'arrête et indique quoi préciser :

```bash
TRAEFIK_ENTRYPOINT=websecure TRAEFIK_CERTRESOLVER=letsencrypt ./deploy/deploy.sh gsms-security.com
# autres surcharges possibles : TRAEFIK_NETWORK, TRAEFIK_HTTP_ENTRYPOINT
```

## Précautions Traefik

- **Noms préfixés `gsms-platform`** (routeur, service, middleware de redirection) : aucune collision avec qualiopi ni les autres sites.
- **Seuls `web` et `doculens` portent des étiquettes `traefik.*`.** Le Core et la base ne sont jamais routés.
- **`traefik.enable=true` est explicite**, donc ça fonctionne avec `exposedByDefault=false`.
- **Le certificat ne couvre que `gsms-security.com`.** Pour `www.gsms-security.com`, créer d'abord son DNS, puis ajouter `|| Host(\`www.${DOMAIN}\`)` à la règle du routeur. Sinon Let's Encrypt échoue pour tout le certificat.
- Le nom de projet est fixé (`name: gsms-platform` dans `docker-compose.yml`) : le réseau s'appelle toujours `gsms-platform_default`, quel que soit le dossier du clone.
- **Healthcheck :** Traefik ne route vers le web qu'une fois son healthcheck vert. Pendant une mise à jour, le site répond 404 environ 10 à 20 secondes, le temps que le nouveau conteneur démarre.
- **`APP_URL=https://$DOMAIN`** est écrit dans `.env` par `deploy.sh` et injecté dans le conteneur `web`. Sans ça, Next (HOSTNAME=0.0.0.0) renvoie des redirects vers `https://0.0.0.0:3000/…` (logout, garde `/app`).
- **Docker 29 et Traefik < 3.6 :** Docker 29 refuse l'ancienne API qu'utilisent les Traefik 3.5 et antérieurs. Le fournisseur Docker de Traefik échoue alors (« client version 1.24 is too old ») et **aucun site** n'est plus routé. Si Docker est mis à jour sur le VPS, passer Traefik en v3.6 ou plus.

## Coffre-fort documentaire (stockage chiffré)

Toutes les pièces de toutes les applications sont rangées par le Core dans un coffre-fort unique :
- **Chiffrement :** chaque fichier est chiffré (AES-256-GCM) avec la clé de **sa** prestation (workspace).
  Les clés de prestation sont elles-mêmes chiffrées par la **clé maître** `GSMS_STORAGE_MASTER_KEY`
  (générée par `deploy.sh` dans `.env`).
- **Intégrité :** l'empreinte SHA-256 du contenu est enregistrée. Un fichier modifié, tronqué ou échangé est
  refusé à la lecture. La vérification se lance depuis le portail (bouton « Vérifier l'intégrité »).
- **Classement :** Client → Site → Prestation → dossiers. Les dossiers système sont « Pièces client »,
  « Dossier de consultation », « Travail GSMS » (jamais visible des clients) et « Livrables ».
  Après analyse, une pièce est rangée automatiquement dans le sous-dossier de son type (CCTP, RC, BPU…).
- **Traçabilité :** dépôts, ouvertures, téléchargements, déplacements et vérifications sont inscrits au
  journal d'audit chaîné du Core.
- **Fichiers existants :** `deploy.sh` lance `python -m gsms_core.cli vault-migrate` à chaque déploiement.
  La commande chiffre les fichiers d'avant le coffre-fort et les range. Relancée, elle ne refait rien. Les anciens
  fichiers en clair (`/app/var/blobs/gsms-documents/sha256/…`) ne sont pas effacés automatiquement. Une fois
  vérifié, on peut les supprimer :
  `docker compose exec core sh -c 'rm -rf /app/var/blobs/gsms-documents/sha256'`.

> **Sauvegardez `.env` hors du serveur.** Sans `GSMS_STORAGE_MASTER_KEY`, aucun document ne peut être
> déchiffré, même à partir d'une sauvegarde du volume.

Le support de stockage est le volume Docker `gsms-platform_gsms-documents`, qui ne contient que des fichiers
chiffrés. Le Core sait aussi écrire dans un stockage compatible S3 (`GSMS_STORAGE_BACKEND=s3`, extra `s3`).
MinIO n'est **pas** utilisé : depuis octobre 2025, MinIO ne publie plus d'images Docker maintenues. Si un
stockage S3 devient nécessaire, préférer une solution maintenue comme Garage ou SeaweedFS.

## Accès (équipe et client démo)

Une seule commande crée :
- ton compte super admin ;
- un compte par rôle DocuLens dont les permissions diffèrent : admin, analyste, relecteur, lecteur ;
- le client démo « ABC Retail », avec sa prestation et son coffre-fort.

Les mots de passe sont générés et affichés **une seule fois**. Relancée, la commande ne change pas les comptes existants (`--reset` pour régénérer leurs mots de passe).

```bash
docker compose exec core python -m gsms_core.cli bootstrap-access
```

Un membre supplémentaire de l'équipe :
`docker compose exec core python -m gsms_core.cli create-member prenom@gsms-security.com "Prénom Nom" --role analyst`.

## Équipe et connexion unique (GSMS, GRACE, QAtrial, CRM)

Le Core est la **seule source** des comptes de l'équipe. Chaque application garde sa base ; un membre a le
même e-mail et le même mot de passe partout. Référence : `docs/architecture/IDENTITE-SSO.md`.

**Gérer l'équipe** : portail → **Paramètres → Équipe GSMS** (super admin et administrateurs).
- **Inviter** : nom, e-mail, rôle. Le membre reçoit un e-mail avec un lien personnel (7 jours, usage unique)
  pour choisir son mot de passe. Le lien s'affiche aussi une fois à l'écran si la messagerie n'est pas prête.
- **Rôle** : un seul rôle, traduit pour chaque application (tableau « Rôles et droits par application »).
- **Applications** : par membre, couper l'accès à une application ou y donner un autre rôle.
- **Nouveau mot de passe**, **Désactiver** : un compte désactivé ne se connecte plus nulle part.

**Tout mettre à jour d'un coup** (plateforme, puis GRACE, QAtrial et le CRM avec la connexion GSMS) :

```bash
cd /opt/gsms-platform && git pull && ./deploy/deploy-all.sh gsms-security.com
# première fois seulement, pour créer aussi les comptes : ajouter --bootstrap
```

Le script retrouve d'où tourne chaque application (étiquettes Docker), met son code à jour (ancien code
sauvegardé dans `.deploy-backups/`), écrit les variables SSO dans son `.env` sans afficher le secret, ferme
l'inscription libre de QAtrial, reconstruit seulement les services applicatifs (bases intactes) et vérifie que
chaque application joint le Core. Une application absente du serveur est simplement ignorée.

**Brancher GRACE, QAtrial et le CRM à la main** (si besoin) :

```bash
# 1. Déclarer les trois applications ; les variables à copier s'affichent (secret montré une seule fois)
docker compose exec core python -m gsms_core.cli sso-client all
```

2. Coller les variables dans le `.env` de chaque application, sur le VPS :
   - GRACE : `SSO_ENABLED=true`, `SSO_ISSUER_URL`, `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`, `SSO_CALLBACK_URL` ;
   - QAtrial : les mêmes, plus `SSO_ORG_NAME=GSMS` (et `REGISTRATION_ENABLED=false` pour fermer l'inscription libre) ;
   - CRM : `GSMS_SSO_ISSUER`, `GSMS_SSO_CLIENT_ID`, `GSMS_SSO_CLIENT_SECRET`.
3. Reconstruire chaque application (`docker compose up -d --build` dans son dossier).

Les pages de connexion affichent alors **« Se connecter avec GSMS »**. Déjà connecté au portail, un clic suffit.
Secret perdu ou divulgué : `sso-client <app> --rotate`, ou **Paramètres → Applications connectées → Nouveau
secret**.

## Paramétrage (portail)

**Paramètres → Plateforme**, réservé au super admin et aux administrateurs :
- **Connectivité du Core** : base, coffre-fort chiffré, journal d'audit, Docling, SMTP, IA, connecteurs.
- **Messagerie (SMTP)** : serveur, compte, mot de passe (chiffré, jamais réaffiché), expéditeur, activation, e-mail de test.
  Hostinger : `smtp.hostinger.com`, port 465, SSL.
- **IA — clé API du LLM** : fournisseur (Anthropic, OpenAI ou compatible OpenAI), modèle, clé (chiffrée, seuls ses 4 derniers caractères sont affichés), test de la clé.

Les réglages saisis dans le portail priment sur ceux du `.env`. Les secrets sont chiffrés par la clé maître du coffre-fort.

## Messagerie (relances et e-mails)

Le Core envoie les e-mails de la plateforme. Le module est repris du module Communications de gsms-qualiopi.

- **Calendrier de règles** (`apps/core/gsms_core/communications/rules/standard.yaml`) :
  - relance du client pour les pièces manquantes (tous les 7 jours) ;
  - alerte de l'équipe à J-7 et J-2 de la remise des offres ;
  - alerte à chaque conflit détecté entre pièces ;
  - avis de dépôt de pièces par le client ;
  - synthèse hebdomadaire aux administrateurs, le lundi.
- **Service `worker`** : planificateur et envoi toutes les 10 minutes. Le bouton « Planifier maintenant » de la
  Messagerie lance un passage immédiat. Une même occurrence ne crée jamais deux messages.
- **Validation** : un message destiné à un client attend que l'équipe le valide (réglage « validation avant envoi »).
  Les alertes internes partent sans validation. Juste avant l'envoi, un message devenu sans objet (pièce déposée
  entre-temps, conflit résolu) est annulé avec son motif.
- **Boîte Messagerie** du portail : dossiers par statut (à valider, prévus, envoyés, échecs, sans adresse,
  annulés), liste des messages, lecture du contenu exact (aperçu isolé, empreinte SHA-256), boutons
  « Valider et envoyer », « Réessayer » et « Annuler » (avec motif).
- **Réglages** dans **Paramètres → Plateforme → Relances et alertes** : relances actives, validation avant envoi,
  adresse de réponse, rattrapage, activation de chaque règle.

Vérification en ligne de commande : `docker compose exec core python -m gsms_core.cli mail-test vous@exemple.fr`.
Journal du worker : `docker compose logs -f worker`.

## Mettre à jour

```bash
cd /opt/gsms-platform && git pull && ./deploy/deploy.sh gsms-security.com
```

Les données (base, documents) sont dans les volumes Docker `gsms-platform_gsms-postgres` et `gsms-platform_gsms-documents` et survivent aux mises à jour.

## Exploitation

```bash
cd /opt/gsms-platform                      # .env indique à Docker les fichiers à utiliser (COMPOSE_FILE)
docker compose ps                          # état
docker compose logs -f core web doculens   # journaux
docker compose exec db pg_dump -U gsms gsms_core | gzip > sauvegarde-$(date +%F).sql.gz
docker compose exec core python -m gsms_core.cli create-admin autre@gsms-security.com "Nom"
```

Sauvegardez aussi le volume des documents et une copie de `.env`. Sans `GSMS_JWT_SECRET`, les sessions en cours sont invalidées.

## Connecter les services spécialisés (plus tard)

Renseigner dans `.env`, puis relancer `deploy.sh` :
- **Services :** `GSMS_CRM_URL` / `_TOKEN`, `GSMS_GRACE_URL` / `_TOKEN`, `GSMS_QATRIAL_URL` / `_TOKEN` ;
- **MCP AO :** `GSMS_TENDERAI_MCP_URL` / `_TOKEN`.

Les secrets de `GSMS_WEBHOOK_SECRETS` sont à recopier dans chaque application émettrice.
