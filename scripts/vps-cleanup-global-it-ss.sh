#!/usr/bin/env bash
# Retire du VPS des stacks docker compose NOMMÉES EXPLICITEMENT (rien d'automatique).
# À utiliser seulement après l'inventaire (scripts/vps-inventory.sh) et le tri validé.
#
#   bash scripts/vps-cleanup-global-it-ss.sh <projet> [<projet>…]          # montre ce qui serait retiré
#   bash scripts/vps-cleanup-global-it-ss.sh --apply <projet> [<projet>…]  # arrête et supprime ces conteneurs
#
# Garde-fous : refuse Traefik, gsms-platform et toute stack qui sert un *.gsms-security.com.
# Les VOLUMES (bases, fichiers) ne sont JAMAIS supprimés.
set -euo pipefail

APPLY=false
projects=()
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    -*) echo "Option inconnue : $arg" >&2; exit 1 ;;
    *) projects+=("$arg") ;;
  esac
done
if [[ ${#projects[@]} -eq 0 ]]; then
  echo "Usage : $0 [--apply] <projet compose> [<projet>…]   (noms visibles dans scripts/vps-inventory.sh)" >&2
  exit 1
fi

for p in "${projects[@]}"; do
  ids="$(docker ps -a -q --filter "label=com.docker.compose.project=$p")"
  if [[ -z "$ids" ]]; then
    echo "• $p : aucun conteneur, ignoré."
    continue
  fi
  rules="$(docker inspect -f '{{range $k, $v := .Config.Labels}}{{$v}} {{end}}' $ids)"
  images="$(docker inspect -f '{{.Config.Image}}' $ids)"
  if [[ "$p" == "gsms-platform" ]] || grep -qi traefik <<<"$images" || grep -q "gsms-security.com" <<<"$rules"; then
    echo "• $p : REFUSÉ (Traefik, plateforme, ou sert *.gsms-security.com)."
    continue
  fi
  echo "• $p :"
  docker ps -a --filter "label=com.docker.compose.project=$p" --format '    {{.Names}}  {{.Status}}  {{.Image}}'
  grep -oE 'Host\(`[^`]+`\)' <<<"$rules" | sort -u | sed 's/^/    route : /' || true
  if $APPLY; then
    docker stop $ids >/dev/null && docker rm $ids >/dev/null
    docker network ls -q --filter "label=com.docker.compose.project=$p" | xargs -r docker network rm >/dev/null 2>&1 || true
    echo "    → retiré (volumes conservés : $(docker volume ls -q --filter "label=com.docker.compose.project=$p" | tr '\n' ' '))"
  fi
done
$APPLY || echo "Rien n'a été modifié. Ajouter --apply pour retirer ces stacks."
