#!/usr/bin/env bash
# Installe ou met à jour GSMS Platform sur le VPS (Docker, HTTPS par le Traefik déjà en place).
#
#   ./deploy/deploy.sh gsms-security.com            installe ou met à jour
#   ./deploy/deploy.sh gsms-security.com --demo     première installation avec l'organisation de démonstration
#
# À lancer depuis la racine du dépôt cloné. Le premier lancement crée .env avec des secrets tirés au hasard
# (jamais committé) ; les lancements suivants le conservent et ne font que reconstruire et redémarrer.
#
# HTTPS : uniquement par le Traefik existant (pas de Caddy). Le script lit sa configuration (réseau, entrée
# :443, entrée :80, résolveur de certificats) et s'y branche par étiquettes. Rien d'existant n'est arrêté ni
# modifié ; si Traefik est absent ou illisible, le script s'arrête et explique quoi préciser.
set -euo pipefail

DOMAIN="${1:-}"
DEMO="${2:-}"
if [[ -z "$DOMAIN" || "$DOMAIN" == -* ]]; then
  echo "Usage : $0 <nom-de-domaine> [--demo]     (ex. $0 gsms-security.com)" >&2
  exit 1
fi
cd "$(dirname "$0")/.."

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker (avec « docker compose ») est requis : https://docs.docker.com/engine/install/" >&2
  exit 1
fi

# ── DNS : le domaine doit pointer vers ce serveur, sinon Let's Encrypt échoue ─────────────────────────
if [[ "${SKIP_DNS_CHECK:-}" != "1" ]]; then
  server_ip="$(curl -fsS4 https://api.ipify.org 2>/dev/null || true)"
  domain_ip="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1 {print $1}' || true)"
  if [[ -n "$server_ip" && "$domain_ip" != "$server_ip" ]]; then
    echo "Attention : $DOMAIN pointe vers « ${domain_ip:-rien} », ce serveur est $server_ip." >&2
    echo "Créez l'enregistrement DNS A (ou attendez sa propagation) avant de continuer." >&2
    echo "(SKIP_DNS_CHECK=1 pour passer outre, par exemple derrière un proxy DNS.)" >&2
    exit 1
  fi
  # DocuLens sur doculens.DOMAIN : sans DNS, seul son certificat échoue ; on prévient sans bloquer.
  doculens_ip="$(getent ahostsv4 "doculens.$DOMAIN" | awk 'NR==1 {print $1}' || true)"
  if [[ -n "$server_ip" && "$doculens_ip" != "$server_ip" ]]; then
    echo "Attention : doculens.$DOMAIN pointe vers « ${doculens_ip:-rien} » (ce serveur : $server_ip)." >&2
    echo "Créez l'enregistrement DNS A pour que DocuLens obtienne son certificat HTTPS." >&2
  fi
fi

secret() { openssl rand -base64 48 | tr -d '/+=\n' | cut -c1-48; }

# Écrit ou remplace une variable dans .env.
set_env() {
  if grep -q "^$1=" .env; then
    sed -i "s|^$1=.*|$1=$2|" .env
  else
    printf '%s=%s\n' "$1" "$2" >> .env
  fi
}

if [[ ! -f .env ]]; then
  umask 077
  cat > .env <<ENV
# Généré par deploy/deploy.sh le $(date -u +%Y-%m-%d). Ne jamais committer ce fichier.
DOMAIN=$DOMAIN
APP_URL=https://$DOMAIN
POSTGRES_PASSWORD=$(secret)
GSMS_JWT_SECRET=$(secret)
# Coffre-fort documentaire : clé maître (chiffre les clés de chaque workspace). À SAUVEGARDER hors du
# serveur : sans elle, les documents sont définitivement illisibles.
GSMS_STORAGE_MASTER_KEY=$(openssl rand -base64 32)
# Secrets HMAC des webhooks entrants (GRACE, QAtrial, CRM → Core), à recopier dans chaque application.
GSMS_WEBHOOK_SECRETS='{"grace":"$(secret)","qatrial":"$(secret)","crm":"$(secret)"}'
# Connecteurs (URL internes des services spécialisés, jetons de service). Vides = connecteur inactif.
GSMS_CRM_URL=
GSMS_CRM_TOKEN=
GSMS_GRACE_URL=
GSMS_GRACE_TOKEN=
GSMS_QATRIAL_URL=
GSMS_QATRIAL_TOKEN=
GSMS_TENDERAI_MCP_URL=
GSMS_TENDERAI_MCP_TOKEN=
# Ports locaux (127.0.0.1 seulement), distincts de ceux des autres applications du serveur.
CORE_PORT=8100
WEB_PORT=3100
DOCULENS_PORT=3110
ENV
  echo ".env créé (secrets générés, lisible par vous seul)."
fi
set_env DOMAIN "$DOMAIN"
set_env APP_URL "https://$DOMAIN"
grep -q "^DOCULENS_PORT=" .env || set_env DOCULENS_PORT 3110  # .env créé avant l'arrivée de DocuLens
if ! grep -q "^GSMS_STORAGE_MASTER_KEY=" .env; then  # .env créé avant le coffre-fort
  set_env GSMS_STORAGE_MASTER_KEY "$(openssl rand -base64 32)"
  echo "Clé maître du coffre-fort créée dans .env : SAUVEGARDEZ ce fichier hors du serveur."
fi

# Les ports locaux ne doivent pas déjà être pris par une autre application (ex. gsms-qualiopi : 3000 / 8000).
env_value() { sed -nE "s/^$1=//p" .env | tail -1; }
for port in "$(env_value CORE_PORT)" "$(env_value WEB_PORT)" "$(env_value DOCULENS_PORT)"; do
  [[ -n "$port" ]] || continue
  if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${port}$" \
     && ! docker compose ps -q 2>/dev/null | grep -q .; then
    echo "Le port local $port est déjà utilisé. Changez CORE_PORT / WEB_PORT / DOCULENS_PORT dans .env puis relancez." >&2
    exit 1
  fi
done

# ── Traefik existant (obligatoire) ────────────────────────────────────────────────────────────────────
traefik="$(docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($2) ~ /traefik/ {print $1; exit}')"
if [[ -z "$traefik" ]]; then
  echo "Aucun conteneur Traefik en marche : ce déploiement se branche uniquement sur Traefik (pas de Caddy)." >&2
  echo "Démarrez Traefik (ports 80/443, résolveur Let's Encrypt), puis relancez." >&2
  exit 1
fi

# Configuration de Traefik : arguments de lancement, puis fichier de configuration (statique) s'il existe.
conf="$(docker inspect -f '{{join .Args "\n"}}' "$traefik")"
config_file="$(printf '%s\n' "$conf" | sed -nE 's/^--configfile=(.*)$/\1/Ip' | head -1)"
conf+=$'\n'"$(docker exec "$traefik" sh -c "cat ${config_file:-/nonexistent} /etc/traefik/traefik.y*ml /traefik.y*ml 2>/dev/null" || true)"

# Entrée « address: :PORT » d'un fichier traefik.yml (bloc entryPoints).
yaml_entrypoint() {
  printf '%s\n' "$conf" | awk -v port="$1" '
    /^entryPoints:/ {f=1; next}
    f && /^[^ \t#]/ {f=0}
    f && /^[ \t]+[A-Za-z0-9_-]+:[ \t]*$/ {n=$1; sub(":","",n)}
    f && $0 ~ ("address:.*:" port "([^0-9]|$)") {print n; exit}'
}

entrypoint="${TRAEFIK_ENTRYPOINT:-$(printf '%s\n' "$conf" | sed -nE 's/.*--entrypoints\.([^.=]+)\.address=[^:]*:443.*/\1/Ip' | head -1)}"
[[ -n "$entrypoint" ]] || entrypoint="$(yaml_entrypoint 443)"
http_entrypoint="${TRAEFIK_HTTP_ENTRYPOINT:-$(printf '%s\n' "$conf" | sed -nE 's/.*--entrypoints\.([^.=]+)\.address=[^:]*:80([^0-9].*)?$/\1/Ip' | head -1)}"
[[ -n "$http_entrypoint" ]] || http_entrypoint="$(yaml_entrypoint 80)"
resolver="${TRAEFIK_CERTRESOLVER:-$(printf '%s\n' "$conf" | sed -nE 's/.*--certificatesresolvers\.([^.=]+)\..*/\1/Ip' | head -1)}"
if [[ -z "$resolver" ]]; then  # traefik.yml : « certificatesResolvers: <nom>: »
  resolver="$(printf '%s\n' "$conf" | awk '/^certificatesResolvers:/ {f=1; next} f && /^[ \t]+[A-Za-z0-9_-]+:/ {sub(":","",$1); print $1; exit}')"
fi

mode="$(docker inspect -f '{{.HostConfig.NetworkMode}}' "$traefik")"
if [[ "$mode" == "host" ]]; then
  # Traefik en mode host : il joint le réseau interne du projet, sans réseau partagé.
  network="${TRAEFIK_NETWORK:-gsms-platform_default}"
  traefik_file=deploy/docker-compose.traefik-host.yml
else
  network="${TRAEFIK_NETWORK:-$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' "$traefik" \
    | grep -vxE 'bridge|host|none' | head -1)}"
  traefik_file=deploy/docker-compose.traefik.yml
fi

if [[ -z "$network" || -z "$entrypoint" || -z "$resolver" ]]; then
  echo "Traefik ($traefik, mode $mode) détecté, mais sa configuration n'a pas pu être lue entièrement :" >&2
  echo "  réseau=${network:-?} entrée 443=${entrypoint:-?} résolveur de certificats=${resolver:-?}" >&2
  echo "Relancez en précisant les valeurs manquantes, par exemple :" >&2
  echo "  TRAEFIK_ENTRYPOINT=websecure TRAEFIK_CERTRESOLVER=letsencrypt $0 $DOMAIN" >&2
  exit 1
fi

compose_files="docker-compose.yml:deploy/docker-compose.prod.yml:$traefik_file"
if [[ -n "$http_entrypoint" ]]; then
  compose_files+=":deploy/docker-compose.traefik-redirect.yml"
  set_env TRAEFIK_HTTP_ENTRYPOINT "$http_entrypoint"
fi
echo "HTTPS par le Traefik existant ($traefik, mode $mode) : réseau $network, entrée $entrypoint" \
     "${http_entrypoint:+(+ redirection depuis $http_entrypoint)}, certificats $resolver."
set_env TRAEFIK_NETWORK "$network"
set_env TRAEFIK_ENTRYPOINT "$entrypoint"
set_env TRAEFIK_CERTRESOLVER "$resolver"
set_env COMPOSE_FILE "$compose_files"

# Un routeur « gsms-platform » d'un autre projet sur ce Traefik provoquerait un conflit silencieux.
others="$(docker ps --filter 'label=traefik.http.routers.gsms-platform.rule' --format '{{.Names}} {{.Label "com.docker.compose.project"}}' \
  | awk '$2 != "gsms-platform" {print $1}')"
if [[ -n "$others" ]]; then
  echo "Un autre conteneur déclare déjà le routeur Traefik « gsms-platform » : $others" >&2
  echo "Rien n'a été modifié. Arrêtez-le ou renommez son routeur, puis relancez." >&2
  exit 1
fi

# Un autre site qui sert déjà doculens.DOMAIN sur ce Traefik se disputerait l'adresse avec DocuLens.
doculens_host="doculens.$DOMAIN"
taken="$(docker ps --format '{{.Names}} {{.Label "com.docker.compose.project"}}' | while read -r name project; do
  [[ "$project" == "gsms-platform" ]] && continue
  docker inspect -f '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' "$name" \
    | grep -qiE "^traefik\.http\.routers\.[^.]+\.rule=.*\`${doculens_host//./\\.}\`" && echo "$name"
done || true)"
if [[ -n "$taken" ]]; then
  echo "doculens.$DOMAIN est déjà servi par un autre conteneur : $taken" >&2
  echo "Rien n'a été modifié. Arrêtez-le (ou changez son adresse), puis relancez." >&2
  exit 1
fi

docker compose up -d --build --remove-orphans

echo "Attente du Core (migrations)…"
for _ in $(seq 1 60); do
  if docker compose exec -T core python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health')" 2>/dev/null; then
    break
  fi
  sleep 2
done

# Coffre-fort : chiffre et range les fichiers d'avant le coffre-fort (ne refait rien s'il n'y en a plus).
docker compose exec -T core python -m gsms_core.cli vault-migrate || \
  echo "Attention : migration du coffre-fort incomplète, voir le message ci-dessus." >&2

# Première mise en service (une seule fois).
if [[ ! -f .gsms-initialise ]]; then
  if [[ "$DEMO" == "--demo" ]]; then
    docker compose exec -T core python -m gsms_core.cli seed-demo
  fi
  date -u +%FT%TZ > .gsms-initialise
  echo
  echo "Créez maintenant le compte administrateur (mot de passe demandé, 12 caractères minimum) :"
  echo "  docker compose exec core python -m gsms_core.cli create-admin vous@gsms-security.com \"Votre nom\""
fi

echo
echo "GSMS Platform : https://$DOMAIN (le certificat HTTPS peut prendre une minute la première fois)."
echo "DocuLens      : https://doculens.$DOMAIN (mêmes comptes que la plateforme)."
