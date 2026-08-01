#!/usr/bin/env bash
# Remise en service rapide des points d'entrée (blue) + rechargement Caddy.
# À lancer sur la VM si app/api renvoient ERR_INVALID_RESPONSE / 502 après un deploy.
#
# Usage :
#   cd /opt/planwise/deploy
#   ./recover-edge.sh
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

echo "=== Récupération edge (api-gateway-blue + frontend-blue + caddy) ==="
compose up -d --no-deps --pull missing api-gateway-blue frontend-blue
compose up -d --no-deps caddy

echo "État :"
compose ps api-gateway-blue frontend-blue caddy || true

echo "Smoke tests internes :"
api_id="$(compose ps -q api-gateway-blue 2>/dev/null || true)"
fe_id="$(compose ps -q frontend-blue 2>/dev/null || true)"
if [[ -n "$api_id" ]]; then
  docker exec "$api_id" node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>{console.log('api',r.statusCode);process.exit(r.statusCode===200?0:1)}).on('error',e=>{console.error(e);process.exit(1)})" \
    || echo "⚠️  health API KO — voir: docker compose logs api-gateway-blue"
fi
if [[ -n "$fe_id" ]]; then
  docker exec "$fe_id" node -e "require('http').get('http://127.0.0.1:5173/',r=>{console.log('frontend',r.statusCode);process.exit(r.statusCode<500?0:1)}).on('error',e=>{console.error(e);process.exit(1)})" \
    || echo "⚠️  frontend KO — voir: docker compose logs frontend-blue"
fi

echo "Rechargement Caddy…"
docker exec planwise-caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null \
  || compose up -d --force-recreate --no-deps caddy

echo "=== Récupération terminée — tester https://app.planwise.fr ==="
