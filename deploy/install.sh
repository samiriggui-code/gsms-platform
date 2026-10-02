#!/usr/bin/env bash
# Installation complète de GSMS Platform sur le VPS (Ubuntu / Debian), en root.
#
#   curl -fsSLO https://raw.githubusercontent.com/samiriggui-code/gsms-platform/main/deploy/install.sh
#   bash install.sh
#
# Installe Docker et git si besoin, récupère le code dans /opt/gsms-platform, démarre base + Core + Web
# branchés sur le Traefik existant (pas de Caddy), puis crée le compte administrateur.
# Relancer le même script met l'application à jour (les données sont conservées).
set -euo pipefail

DOMAIN="${DOMAIN:-gsms-security.com}"
BRANCH="${BRANCH:-main}"
REPO="https://github.com/samiriggui-code/gsms-platform.git"
DIR="/opt/gsms-platform"

say() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "À lancer en root." >&2
  exit 1
fi

say "Outils système"
if ! command -v git >/dev/null || ! command -v curl >/dev/null || ! command -v openssl >/dev/null; then
  apt-get update -qq && apt-get install -y -qq git curl openssl ca-certificates
fi
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true

say "Code de l'application ($BRANCH)"
if [[ -d "$DIR/.git" ]]; then
  git -C "$DIR" fetch -q origin "$BRANCH"
  git -C "$DIR" checkout -q -B "$BRANCH" "origin/$BRANCH"
else
  git clone -q -b "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR"

first_install=false
[[ -f .gsms-initialise ]] || first_install=true

say "Construction et démarrage (plusieurs minutes la première fois)"
./deploy/deploy.sh "$DOMAIN" "${1:-}"

if $first_install; then
  say "Compte administrateur"
  read -rp "E-mail : " email
  read -rp "Nom affiché : " name
  echo "Mot de passe (12 caractères minimum, rien ne s'affiche pendant la saisie) :"
  docker compose exec core python -m gsms_core.cli create-admin "$email" "$name"
fi

say "Terminé"
echo "Application : https://$DOMAIN"
