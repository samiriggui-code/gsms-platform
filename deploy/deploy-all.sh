#!/usr/bin/env bash
# Met à jour TOUT sur le VPS : plateforme (Core, portail, DocuLens, messagerie), MCP Appel d'offres, puis
# GRACE, QAtrial et le CRM avec la connexion « Se connecter avec GSMS ».
#
#   cd /opt/gsms-platform && git pull && ./deploy/deploy-all.sh gsms-security.com
#   ./deploy/deploy-all.sh gsms-security.com --bootstrap   # 1re fois : crée les comptes (mots de passe affichés)
#
# Pour chaque application déjà en service, le script retrouve d'où sa stack Docker a été lancée (étiquettes
# Compose des conteneurs gsms-grace-*, gsms-qatrial-*, gsms-crm-*), met son code à jour (copie depuis ce dépôt,
# avec sauvegarde de l'ancien), écrit les variables SSO dans SON .env (secrets jamais affichés), puis reconstruit
# seulement ses services applicatifs. Les bases de données et volumes ne sont pas touchés. Une application qui
# ne tourne pas sur ce serveur est ignorée (message), rien n'est créé à sa place.
set -euo pipefail

DOMAIN="${1:-}"
BOOTSTRAP="${2:-}"
if [[ -z "$DOMAIN" || "$DOMAIN" == -* ]]; then
  echo "Usage : $0 <nom-de-domaine> [--bootstrap]     (ex. $0 gsms-security.com)" >&2
  exit 1
fi
cd "$(dirname "$0")/.."
REPO="$(pwd)"
ISSUER="https://$DOMAIN"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUPS="$REPO/.deploy-backups"
OK=()
WARN=()

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
warn() { echo "Attention : $*" >&2; WARN+=("$*"); }

# ── 1. Plateforme : Core, portail, DocuLens, worker (migrations comprises) ─────────────────────────────
say "1/4 Plateforme GSMS (Core, portail, DocuLens, messagerie)"
./deploy/deploy.sh "$DOMAIN"
OK+=("Plateforme : https://$DOMAIN et https://doculens.$DOMAIN")

if [[ "$BOOTSTRAP" == "--bootstrap" ]]; then
  say "Comptes : super admin, comptes par rôle, client démo (mots de passe affichés UNE fois)"
  docker compose exec -T core python -m gsms_core.cli bootstrap-access
fi

core_cli() { docker compose exec -T core python -m gsms_core.cli "$@"; }

# DocuLens (servi par la plateforme) : « Se connecter avec GSMS », client public sans secret.
if core_cli sso-client doculens --redirect-uri "https://doculens.$DOMAIN/auth/callback" >/dev/null; then
  OK+=("DocuLens : bouton « Se connecter avec GSMS » actif")
else
  warn "DocuLens : déclaration de la connexion GSMS impossible (voir le message ci-dessus)."
fi

# Écrit ou remplace KEY=VALUE dans un fichier .env donné (droits 600), sans rien afficher.
set_env_in() {
  local file="$1" key="$2" value="$3"
  touch "$file"
  chmod 600 "$file"
  if grep -q "^${key}=" "$file"; then
    local tmp
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$value" 'BEGIN{FS=OFS="="} $1==k {print k "=" v; next} {print}' "$file" > "$tmp"
    cat "$tmp" > "$file"
    rm -f "$tmp"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}
get_env_in() { [[ -f "$1" ]] && grep -E "^$2=" "$1" | tail -1 | cut -d= -f2- || true; }

label() { docker inspect "$1" --format "{{ index .Config.Labels \"$2\" }}" 2>/dev/null || true; }

# ── 2. Applications ─────────────────────────────────────────────────────────────────────────────────────
# deploy_app <app> <conteneur témoin> <services à reconstruire> <adresse de retour>
deploy_app() {
  local app="$1" probe="$2" services="$3" callback="$4"
  say "$app"
  if ! docker inspect "$probe" >/dev/null 2>&1; then
    warn "$app : conteneur $probe introuvable sur ce serveur, application ignorée."
    return 0
  fi
  local project workdir files envfile
  project="$(label "$probe" com.docker.compose.project)"
  workdir="$(label "$probe" com.docker.compose.project.working_dir)"
  files="$(label "$probe" com.docker.compose.project.config_files)"
  envfile="$(label "$probe" com.docker.compose.project.environment_file)"
  if [[ -z "$project" || -z "$workdir" || -z "$files" ]]; then
    warn "$app : impossible de retrouver comment sa stack a été lancée (étiquettes Compose absentes)."
    return 0
  fi
  local first_file="${files%%,*}"
  local app_root
  app_root="$(cd "$(dirname "$first_file")/../.." && pwd)"
  [[ -z "$envfile" ]] && envfile="$workdir/.env"
  echo "Stack « $project » lancée depuis $workdir"
  echo "Code de l'application : $app_root"

  # Code : depuis ce dépôt (si la stack tourne ailleurs, on copie, après sauvegarde de l'ancien code).
  local source="$REPO/apps/$app" backup=""
  if [[ "$app_root" != "$source" ]]; then
    command -v rsync >/dev/null || { warn "$app : rsync absent (apt install rsync), application ignorée."; return 0; }
    mkdir -p "$BACKUPS"
    backup="$BACKUPS/$app-$STAMP.tgz"
    tar -C "$app_root" --exclude=node_modules --exclude=.next --exclude=dist \
      -czf "$backup" . 2>/dev/null || true
    rsync -a \
      --exclude='.env' --exclude='.env.*' \
      --exclude='node_modules/' --exclude='.git/' --exclude='.next/' --exclude='dist/' \
      --exclude='.turbo/' --exclude='*.log' --exclude='.deploy-backups/' \
      "$source/" "$app_root/"
    echo "Code mis à jour (ancien code sauvegardé : $BACKUPS/$app-$STAMP.tgz)"
  fi

  # Connexion GSMS : déclaration auprès du Core et variables dans le .env de l'application.
  local secret_key target_env
  if [[ "$app" == "crm" ]]; then
    secret_key="GSMS_SSO_CLIENT_SECRET"
    target_env="$app_root/.env"   # env_file ../../.env du compose du CRM
  else
    secret_key="SSO_CLIENT_SECRET"
    target_env="$envfile"         # variables interpolées dans le compose
  fi
  local rotate=()
  [[ -z "$(get_env_in "$target_env" "$secret_key")" ]] && rotate=(--rotate)
  local out
  out="$(core_cli sso-client "$app" --redirect-uri "$callback" "${rotate[@]}")"
  # Lignes « KEY=VALUE » affichées par le Core (le secret n'y figure qu'en cas de création ou de --rotate).
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]+([A-Z_]+)=(.*)$ ]] || continue
    set_env_in "$target_env" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
  done <<< "$out"
  if [[ "$app" == "qatrial" ]]; then
    set_env_in "$target_env" REGISTRATION_ENABLED false   # plus d'inscription libre : comptes = Core
  fi
  if [[ "$app" == "crm" ]]; then
    # Pont CRM → Core : l'agent du CRM envoie sociétés, contacts et affaires au Core (via le portail).
    local crm_secret
    crm_secret="$(get_env_in "$REPO/.env" GSMS_WEBHOOK_SECRETS | python3 -c 'import json,sys; print(json.loads(sys.stdin.read().strip().strip(chr(39)) or "{}").get("crm",""))' 2>/dev/null || true)"
    if [[ -n "$crm_secret" ]]; then
      set_env_in "$target_env" GSMS_CORE_URL "$ISSUER"
      set_env_in "$target_env" GSMS_CORE_WEBHOOK_SECRET "$crm_secret"
    else
      warn "crm : secret « crm » absent de GSMS_WEBHOOK_SECRETS (.env de la plateforme), pont CRM → Core inactif."
    fi
  fi
  echo "Connexion GSMS configurée dans $target_env (secret non affiché)"

  # Reconstruction des seuls services applicatifs (bases et volumes intacts).
  local compose=(docker compose -p "$project" --project-directory "$workdir")
  IFS=',' read -r -a cfgs <<< "$files"
  for f in "${cfgs[@]}"; do compose+=(-f "$f"); done
  [[ -f "$envfile" ]] && compose+=(--env-file "$envfile")
  # Construction d'abord : si elle échoue, la version en service continue de tourner et l'ancien code est remis.
  # shellcheck disable=SC2086
  if ! "${compose[@]}" build $services; then
    if [[ -n "$backup" && -s "$backup" ]]; then
      tar -C "$app_root" -xzf "$backup"
    fi
    warn "$app : la construction a échoué ; l'ancienne version continue de tourner (code d'origine remis)."
    return 0
  fi
  # shellcheck disable=SC2086
  "${compose[@]}" up -d --no-deps $services
  OK+=("$app : https://$app.$DOMAIN (bouton « Se connecter avec GSMS »)")
  if [[ "$app" == "crm" ]] && [[ -n "$(get_env_in "$target_env" GSMS_CORE_WEBHOOK_SECRET)" ]]; then
    # Première synchronisation (idempotente) : sociétés, contacts, affaires ; les affaires gagnées ouvrent leur prestation.
    if "${compose[@]}" exec -T agent bun run gsms:sync; then
      OK+=("crm : sociétés, contacts et affaires synchronisés avec le Core")
    else
      warn "crm : synchronisation avec le Core incomplète (voir les lignes « Échec » ci-dessus)."
    fi
  fi
}

# ── MCP Appel d'offres ────────────────────────────────────────────────────────────────────────────────────
# Stack à part (apps/tenderai-mcp-server-max/deploy/vps), branchée sur le réseau interne de la plateforme :
# le Core le joint sur http://gsms-tenderai-mcp:8090/mcp. Jeton obligatoire, saisi par l'exploitant :
# MCP_API_KEY dans le .env du MCP = GSMS_TENDERAI_MCP_TOKEN dans le .env de la plateforme (jamais affiché).
deploy_mcp() {
  say "MCP Appel d'offres"
  local source="$REPO/apps/tenderai-mcp-server-max" app_root project backup=""
  app_root="$source"
  project="gsms-mcp"
  if docker inspect gsms-tenderai-mcp >/dev/null 2>&1; then
    local files
    files="$(label gsms-tenderai-mcp com.docker.compose.project.config_files)"
    project="$(label gsms-tenderai-mcp com.docker.compose.project)"
    [[ -z "$project" ]] && project="gsms-mcp"
    if [[ -n "$files" ]]; then
      app_root="$(cd "$(dirname "${files%%,*}")/../.." && pwd)"
    fi
  fi
  echo "Code du MCP : $app_root"
  if [[ "$app_root" != "$source" ]]; then
    command -v rsync >/dev/null || { warn "MCP AO : rsync absent (apt install rsync), MCP ignoré."; return 0; }
    mkdir -p "$BACKUPS"
    backup="$BACKUPS/tenderai-mcp-$STAMP.tgz"
    tar -C "$app_root" --exclude=.venv --exclude=db --exclude=data -czf "$backup" . 2>/dev/null || true
    rsync -a --exclude='.env' --exclude='.env.*' --exclude='.venv/' --exclude='db/' --exclude='data/' \
      --exclude='__pycache__/' --exclude='.git/' "$source/" "$app_root/"
    echo "Code mis à jour (ancien code sauvegardé : $backup)"
  fi

  local envfile="$app_root/.env" key token
  key="$(get_env_in "$envfile" MCP_API_KEY)"
  token="$(get_env_in "$REPO/.env" GSMS_TENDERAI_MCP_TOKEN)"
  if [[ -z "$key" ]]; then
    warn "MCP AO : MCP_API_KEY absent de $envfile. Sans jeton le serveur refuse de démarrer : ajoutez-le" \
         "(openssl rand -hex 32), mettez la même valeur dans GSMS_TENDERAI_MCP_TOKEN de $REPO/.env, puis relancez."
    return 0
  fi
  if [[ -z "$token" ]]; then
    warn "MCP AO : GSMS_TENDERAI_MCP_TOKEN vide dans $REPO/.env : le Core n'appellera pas le moteur AO."
  elif [[ "$token" != "$key" ]]; then
    warn "MCP AO : GSMS_TENDERAI_MCP_TOKEN (plateforme) et MCP_API_KEY (MCP) diffèrent : le Core sera refusé."
  fi

  local compose=(docker compose -p "$project" -f "$app_root/deploy/vps/docker-compose.vps.yml")
  if ! "${compose[@]}" build mcp; then
    if [[ -n "$backup" && -s "$backup" ]]; then
      tar -C "$app_root" -xzf "$backup"
    fi
    warn "MCP AO : la construction a échoué ; l'ancienne version continue de tourner."
    return 0
  fi
  "${compose[@]}" up -d mcp
  OK+=("MCP AO : https://mcp.$DOMAIN/mcp (et http://gsms-tenderai-mcp:8090/mcp pour le Core)")
}
deploy_mcp

say "2/4 Applications (GRACE, QAtrial, CRM)"
deploy_app grace gsms-grace-api "api web" "https://grace.$DOMAIN/api/auth/sso/callback"
deploy_app qatrial gsms-qatrial-app "app" "https://qatrial.$DOMAIN/api/auth/sso/callback"
deploy_app crm gsms-crm-app "app agent" "https://crm.$DOMAIN/api/auth/callback/gsms"

# ── 3. Vérifications ────────────────────────────────────────────────────────────────────────────────────
say "3/4 Vérifications"
sleep 15
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$1" || echo 000; }
c="$(code "$ISSUER/.well-known/openid-configuration")"
if [[ "$c" == "200" ]]; then echo "Fournisseur GSMS (OIDC) : OK"; else warn "découverte OIDC $ISSUER : HTTP $c"; fi
for app in grace qatrial crm; do
  c="$(code "https://$app.$DOMAIN/")"
  if [[ "$c" =~ ^(200|30[0-9])$ ]]; then echo "https://$app.$DOMAIN : OK ($c)"; else warn "https://$app.$DOMAIN : HTTP $c"; fi
done
# Chaque application doit joindre le Core par l'adresse publique (échange du code, clés publiques).
for probe in gsms-grace-api gsms-qatrial-app gsms-crm-app; do
  docker inspect "$probe" >/dev/null 2>&1 || continue
  if docker exec "$probe" node -e "fetch('$ISSUER/oidc/jwks').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "$probe joint $ISSUER : OK"
  else
    warn "$probe ne joint pas $ISSUER (réseau sortant du conteneur ou DNS) : la connexion GSMS échouera."
  fi
done
# Le Core doit joindre le MCP AO par le réseau interne ; sans jeton, le MCP répond 401 (authentification active).
if docker inspect gsms-tenderai-mcp >/dev/null 2>&1; then
  mcp_code="$(docker compose exec -T core python -c "
import urllib.request, urllib.error
try:
    urllib.request.urlopen(urllib.request.Request('http://gsms-tenderai-mcp:8090/mcp', method='POST'), timeout=10)
    print(200)
except urllib.error.HTTPError as e:
    print(e.code)
except Exception:
    print(0)
" 2>/dev/null || echo 0)"
  if [[ "$mcp_code" == "401" ]]; then
    echo "Core → MCP AO : joignable, authentification active"
  else
    warn "Core → MCP AO : réponse « $mcp_code » au lieu de 401 (réseau gsms-platform_default ou MCP arrêté)."
  fi
fi

# ── 4. Résumé ───────────────────────────────────────────────────────────────────────────────────────────
say "4/4 Résumé"
for line in "${OK[@]}"; do echo "  ✔ $line"; done
for line in "${WARN[@]}"; do echo "  ⚠ $line"; done
cat <<TXT

Ensuite, dans le portail https://$DOMAIN :
  1. Paramètres → Messagerie (SMTP) : smtp.hostinger.com, port 465, SSL, admin@gsms-security.com,
     votre mot de passe, cocher « Envoi actif », puis « Tester l'envoi ».
  2. Paramètres → IA : clé API du LLM, puis « Tester la clé ».
  3. Paramètres → Connectivité du Core : « Lancer le test ».
  4. Paramètres → Équipe GSMS : inviter les membres (ils reçoivent leur lien par e-mail).
Sauvegardez /opt/gsms-platform/.env (clé maître du coffre-fort) hors du serveur.
TXT
