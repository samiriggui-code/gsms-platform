#!/usr/bin/env bash
# Inventaire du VPS en LECTURE SEULE : rien n'est arrêté, modifié ni supprimé.
# N'affiche aucun secret (pas de variables d'environnement, pas de contenu de .env).
#
#   bash scripts/vps-inventory.sh > inventaire-vps.txt 2>&1
#
# Ou sans cloner le dépôt :
#   curl -fsSL https://raw.githubusercontent.com/samiriggui-code/gsms-platform/main/scripts/vps-inventory.sh | bash > inventaire-vps.txt 2>&1
set -uo pipefail

section() { printf '\n===== %s =====\n' "$*"; }

section "Machine"
hostname; date -u +%FT%TZ; uptime
free -h
df -h / /var/lib/docker 2>/dev/null | sort -u

section "Docker : conteneurs (tous, y compris arrêtés)"
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Label "com.docker.compose.project"}}\t{{.Ports}}'

section "Docker : projets compose et dossier d'origine"
docker ps -a --format '{{.Label "com.docker.compose.project"}}|{{.Label "com.docker.compose.project.working_dir"}}|{{.Label "com.docker.compose.project.config_files"}}|{{.State}}' \
  | sort | uniq -c | awk '{c=$1; $1=""; print c" conteneur(s) :"$0}'

section "Docker : routes Traefik déclarées (étiquettes Host/PathPrefix)"
for id in $(docker ps -a -q); do
  docker inspect -f '{{.Name}} [{{.State.Status}}]{{range $k, $v := .Config.Labels}}{{if and (ge (len $k) 16) (eq (slice $k 0 16) "traefik.http.rou")}}{{"\n    "}}{{$k}} = {{$v}}{{end}}{{end}}' "$id" \
    | grep -B1 -E 'rule|entrypoints' | grep -vE '^--$'
done

section "Docker : mémoire et CPU des conteneurs en marche"
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}'

section "Docker : réseaux"
docker network ls

section "Docker : volumes (nom, taille non calculée)"
docker volume ls

section "Docker : espace disque"
docker system df

section "Traefik : conteneur, mode réseau et arguments"
for t in $(docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($2) ~ /traefik/ {print $1}'); do
  echo "conteneur : $t  image : $(docker inspect -f '{{.Config.Image}}' "$t")  réseau : $(docker inspect -f '{{.HostConfig.NetworkMode}}' "$t")"
  docker inspect -f '{{join .Args "\n"}}' "$t" | sed 's/^/    /' | grep -viE 'password|secret|token|key='
done

section "Services systemd (hors système) en marche"
systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null \
  | grep -vE 'systemd-|dbus|ssh|cron|rsyslog|getty|polkit|udisks|networkd|resolved|journald|logind|multipathd|snapd|unattended|containerd|docker|qemu-guest|chrony|ntp|irqbalance|ModemManager|packagekit|fwupd|user@' || true

section "Ports en écoute (processus)"
ss -ltnp 2>/dev/null | awk 'NR==1 || /LISTEN/' | sed -E 's/users:\(\("([^"]+)".*/\1/'

section "Dossiers d'applications"
for d in /opt /opt/gsms /root /srv /home; do
  [ -d "$d" ] && { echo "$d :"; ls -1 "$d" 2>/dev/null | sed 's/^/    /'; }
done

section "Fin de l'inventaire (rien n'a été modifié)"
