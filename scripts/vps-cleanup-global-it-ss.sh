#!/usr/bin/env bash
# Repère et retire du VPS les anciennes stacks Docker de l'époque *.global-it-ss.com.
#
#   bash scripts/vps-cleanup-global-it-ss.sh            # INVENTAIRE SEUL (rien n'est modifié)
#   bash scripts/vps-cleanup-global-it-ss.sh --apply    # arrête et supprime les conteneurs des stacks repérées
#   bash scripts/vps-cleanup-global-it-ss.sh --apply --prune-images   # + images Docker inutilisées
#
# Une stack (projet docker compose) est candidate au retrait si :
#   - un de ses conteneurs déclare encore un routeur Traefik sur global-it-ss.com, ET aucun sur gsms-security.com ;
#   - ou c'est un projet retiré de la plateforme (Comp AI GRC, Xacta, SimpleRisk/RiskManager, TenderAI legacy) ;
#   - ou tous ses conteneurs sont arrêtés et aucun ne sert gsms-security.com.
# Jamais touchés : Traefik, le projet gsms-platform, et toute stack qui sert un *.gsms-security.com.
# Les VOLUMES (bases de données, fichiers) ne sont JAMAIS supprimés : « docker compose down » sans -v.
set -euo pipefail

APPLY=false
PRUNE_IMAGES=false
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    --prune-images) PRUNE_IMAGES=true ;;
    *) echo "Option inconnue : $arg" >&2; exit 1 ;;
  esac
done

OLD_DOMAIN="global-it-ss.com"
NEW_DOMAIN="gsms-security.com"
RETIRED_RE='^(comp|comp-ai|gsms-comp|xacta|riskmanager|simplerisk|gsms-simplerisk|tenderai-legacy|gsms-tenderai-legacy)$'
PROTECTED_RE='^(gsms-platform)$'

if ! docker info >/dev/null 2>&1; then
  echo "Docker injoignable (lancer en root sur le VPS)." >&2
  exit 1
fi

say() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }

# Une ligne par conteneur : projet|nom|état|image|règles traefik (concaténées)
inventory() {
  docker ps -a -q | while read -r id; do
    docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}|{{.Name}}|{{.State.Status}}|{{.Config.Image}}|{{range $k, $v := .Config.Labels}}{{if and (ge (len $k) 8) (eq (slice $k 0 8) "traefik.")}}{{$v}} {{end}}{{end}}' "$id"
  done | sed 's#|/#|#'
}

say "Conteneurs présents (projet | nom | état | image)"
inv="$(inventory)"
printf '%s\n' "$inv" | awk -F'|' '{printf "  %-28s %-34s %-10s %s\n", ($1==""?"(hors compose)":$1), $2, $3, $4}' | sort

say "Mémoire des conteneurs en marche"
docker stats --no-stream --format '  {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' | sort -k2 -h -r || true

say "Analyse par projet"
candidates=()
projects="$(printf '%s\n' "$inv" | awk -F'|' '$1!="" {print $1}' | sort -u)"
for p in $projects; do
  lines="$(printf '%s\n' "$inv" | awk -F'|' -v p="$p" '$1==p')"
  rules="$(printf '%s\n' "$lines" | awk -F'|' '{print $5}')"
  running="$(printf '%s\n' "$lines" | awk -F'|' '$3=="running"' | wc -l)"
  total="$(printf '%s\n' "$lines" | wc -l)"
  workdir="$(docker ps -a --filter "label=com.docker.compose.project=$p" --format '{{.Label "com.docker.compose.project.working_dir"}}' | head -1)"
  serves_new=false; serves_old=false; is_traefik=false
  grep -q "$NEW_DOMAIN" <<<"$rules" && serves_new=true
  grep -q "$OLD_DOMAIN" <<<"$rules" && serves_old=true
  printf '%s\n' "$lines" | awk -F'|' '{print $4}' | grep -qi traefik && is_traefik=true

  reason=""
  if [[ "$p" =~ $PROTECTED_RE ]] || $is_traefik || $serves_new; then
    reason=""
  elif $serves_old; then
    reason="routeur Traefik encore sur $OLD_DOMAIN (aucun sur $NEW_DOMAIN)"
  elif [[ "$p" =~ $RETIRED_RE ]]; then
    reason="projet retiré de la plateforme"
  elif [[ "$running" -eq 0 ]]; then
    reason="tous les conteneurs arrêtés, ne sert pas $NEW_DOMAIN"
  fi

  if [[ -n "$reason" ]]; then
    printf '  \033[1;31m✗ %-24s\033[0m %s/%s en marche — %s\n      dossier : %s\n' "$p" "$running" "$total" "$reason" "${workdir:-?}"
    candidates+=("$p")
  elif [[ -z "${rules// /}" ]]; then
    printf '  \033[1;33m? %-24s\033[0m %s/%s en marche — ne sert aucun domaine (base, worker… ou doublon ?) : vérifier à la main\n      dossier : %s\n' "$p" "$running" "$total" "${workdir:-?}"
  else
    state="garde"
    $serves_new && state="garde (sert $NEW_DOMAIN)"
    $is_traefik && state="garde (Traefik)"
    printf '  \033[1;32m✓ %-24s\033[0m %s/%s en marche — %s\n      dossier : %s\n' "$p" "$running" "$total" "$state" "${workdir:-?}"
  fi
done

orphans="$(printf '%s\n' "$inv" | awk -F'|' '$1=="" && $4 !~ /traefik/ {print $2" ("$3")"}')"
if [[ -n "$orphans" ]]; then
  say "Conteneurs hors docker compose (à vérifier à la main, non traités)"
  printf '  %s\n' $orphans
fi

if [[ ${#candidates[@]} -eq 0 ]]; then
  say "Aucune ancienne stack à retirer"
  exit 0
fi

if ! $APPLY; then
  say "Inventaire seul — rien n'a été modifié"
  echo "Pour retirer : bash $0 --apply   (volumes conservés)"
  exit 0
fi

say "Retrait des stacks repérées (volumes conservés)"
for p in "${candidates[@]}"; do
  echo "  → $p"
  ids="$(docker ps -a -q --filter "label=com.docker.compose.project=$p")"
  # Arrêt puis suppression des conteneurs et du réseau du projet ; volumes intacts.
  [[ -n "$ids" ]] && docker stop $ids >/dev/null && docker rm $ids >/dev/null
  docker network ls -q --filter "label=com.docker.compose.project=$p" | xargs -r docker network rm >/dev/null 2>&1 || true
done

if $PRUNE_IMAGES; then
  say "Images Docker inutilisées"
  docker image prune -a -f | tail -1
fi

say "Terminé"
echo "Volumes conservés (à supprimer à la main seulement si les données ne servent plus) :"
for p in "${candidates[@]}"; do
  docker volume ls -q --filter "label=com.docker.compose.project=$p" | sed 's/^/  /'
done
