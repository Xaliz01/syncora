#!/usr/bin/env bash
# Remise en service rapide : détecte le slot edge up, régénère Caddyfile, recreate Caddy.
#
# Usage :
#   cd /opt/planwise/deploy && ./recover-edge.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILES=(-f docker-compose.prod.yml)
if [[ -f docker-compose.monitoring.yml ]]; then
  COMPOSE_FILES+=(-f docker-compose.monitoring.yml)
fi

compose() {
  if [[ -f docker-compose.monitoring.yml ]]; then
    docker compose "${COMPOSE_FILES[@]}" --env-file .env.production --profile monitoring "$@"
  else
    docker compose "${COMPOSE_FILES[@]}" --env-file .env.production "$@"
  fi
}

service_running() {
  local id
  id="$(compose ps -q --status running "$1" 2>/dev/null || true)"
  [[ -n "$id" ]]
}

slot=""
if service_running frontend-green && service_running api-gateway-green; then
  slot=green
elif service_running frontend-blue && service_running api-gateway-blue; then
  slot=blue
elif service_running frontend-green; then
  slot=green
  compose up -d --no-deps --pull missing api-gateway-green
elif service_running frontend-blue; then
  slot=blue
  compose up -d --no-deps --pull missing api-gateway-blue
else
  echo "ℹ️  Aucun slot — bootstrap blue"
  slot=blue
  compose up -d --no-deps --pull missing api-gateway-blue frontend-blue
fi

echo "=== Récupération edge (slot=$slot) ==="
compose up -d --no-deps --pull missing "api-gateway-${slot}" "frontend-${slot}"

if [[ ! -f Caddyfile.template ]]; then
  echo "❌ Caddyfile.template manquant — scp depuis le repo"
  exit 1
fi

sed \
  -e "s|__FRONTEND_UPSTREAM__|frontend-${slot}:5173|g" \
  -e "s|__API_GATEWAY_UPSTREAM__|api-gateway-${slot}:3000|g" \
  Caddyfile.template >Caddyfile
echo "$slot" >.edge-slot

compose stop caddy || true
compose rm -f caddy || true
compose up -d --no-deps caddy

echo "DNS depuis Caddy :"
docker exec planwise-caddy wget -S -O /dev/null "http://frontend-${slot}:5173/" 2>&1 | head -12 || true
docker exec planwise-caddy wget -S -O /dev/null "http://api-gateway-${slot}:3000/api/health" 2>&1 | head -12 || true

echo "=== Tester https://app.planwise.fr ==="
curl -sI https://app.planwise.fr/ | head -5 || true
