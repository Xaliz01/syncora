#!/usr/bin/env bash
# Bascule blue/green des points d'entrée (api-gateway + frontend) sans downtime.
#
# Génère Caddyfile depuis Caddyfile.template avec UN seul upstream (slot actif).
# Caddy ne sait pas fallback correctement si le 1er hostname n'existe pas en DNS.
#
# Usage (depuis le répertoire deploy/ sur la VM) :
#   export REGISTRY IMAGE_TAG
#   ./rolling-edge.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILES=(-f docker-compose.prod.yml)
ENV_FILE=(--env-file .env.production)
if [[ -f docker-compose.monitoring.yml ]]; then
  COMPOSE_FILES+=(-f docker-compose.monitoring.yml)
fi

compose() {
  if [[ -f docker-compose.monitoring.yml ]]; then
    docker compose "${COMPOSE_FILES[@]}" "${ENV_FILE[@]}" --profile monitoring "$@"
  else
    docker compose "${COMPOSE_FILES[@]}" "${ENV_FILE[@]}" "$@"
  fi
}

service_running() {
  local service="$1"
  local id
  id="$(compose ps -q --status running "$service" 2>/dev/null || true)"
  [[ -n "$id" ]]
}

service_health() {
  local service="$1"
  local id
  id="$(compose ps -q "$service" 2>/dev/null || true)"
  if [[ -z "$id" ]]; then
    echo "missing"
    return
  fi
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" 2>/dev/null || echo "unknown"
}

wait_healthy() {
  local service="$1"
  local timeout_s="${2:-180}"
  local elapsed=0
  echo "⏳ Attente healthy : $service (max ${timeout_s}s)"
  while (( elapsed < timeout_s )); do
    local health
    health="$(service_health "$service")"
    if [[ "$health" == "healthy" ]]; then
      echo "✅ $service healthy"
      return 0
    fi
    if [[ "$health" == "unhealthy" ]]; then
      echo "❌ $service unhealthy"
      compose logs --tail 80 "$service" || true
      return 1
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done
  echo "❌ Timeout healthy : $service (dernier état=$(service_health "$service"))"
  compose logs --tail 80 "$service" || true
  return 1
}

apply_caddy_slot() {
  local slot="$1" # blue | green
  local template="${ROOT_DIR}/Caddyfile.template"
  local target="${ROOT_DIR}/Caddyfile"
  if [[ ! -f "$template" ]]; then
    echo "❌ Caddyfile.template manquant"
    return 1
  fi
  local fe="frontend-${slot}:5173"
  local api="api-gateway-${slot}:3000"
  sed \
    -e "s|__FRONTEND_UPSTREAM__|${fe}|g" \
    -e "s|__API_GATEWAY_UPSTREAM__|${api}|g" \
    "$template" >"$target"
  echo "$slot" >"${ROOT_DIR}/.edge-slot"
  echo "📝 Caddyfile → frontend=${fe} api=${api}"

  if [[ -n "$(compose ps -q --status running caddy 2>/dev/null || true)" ]]; then
    docker exec planwise-caddy caddy reload --config /etc/caddy/Caddyfile \
      || compose up -d --force-recreate --no-deps caddy
  else
    compose up -d --no-deps caddy
  fi
}

roll_pair() {
  local base="$1" # api-gateway | frontend
  local blue="${base}-blue"
  local green="${base}-green"
  local active="" inactive=""

  local blue_up=false green_up=false
  service_running "$blue" && blue_up=true
  service_running "$green" && green_up=true

  if $blue_up && ! $green_up; then
    active=blue
    inactive=green
  elif $green_up && ! $blue_up; then
    active=green
    inactive=blue
  elif $blue_up && $green_up; then
    echo "⚠️  $base : blue et green sont up — bascule forcée vers green"
    active=blue
    inactive=green
  else
    echo "ℹ️  $base : aucun slot actif — bootstrap sur blue"
    compose up -d --no-deps --pull never "$blue"
    wait_healthy "$blue"
    LAST_SLOT=blue
    return 0
  fi

  echo "🔁 $base : actif=$active → déploiement sur $inactive"
  compose up -d --no-deps --force-recreate --pull never "${base}-${inactive}"
  wait_healthy "${base}-${inactive}"

  # Les deux tournent : basculer Caddy vers le nouveau avant d'arrêter l'ancien.
  apply_caddy_slot "$inactive"
  sleep 2

  echo "🛑 Arrêt de ${base}-${active}"
  compose stop "${base}-${active}"
  compose rm -f "${base}-${active}" >/dev/null
  echo "✅ $base basculé sur $inactive"
  LAST_SLOT=$inactive
}

echo "=== Rolling edge (api-gateway + frontend) ==="
LAST_SLOT=blue
roll_pair "api-gateway"
roll_pair "frontend"

# Garantit Caddy aligné sur un slot où frontend ET gateway tournent.
if service_running frontend-green && service_running api-gateway-green; then
  apply_caddy_slot green
elif service_running frontend-blue && service_running api-gateway-blue; then
  apply_caddy_slot blue
else
  echo "❌ Pas de paire frontend+gateway cohérente"
  compose ps || true
  exit 1
fi

echo "=== Rolling edge terminé (slot=$(cat .edge-slot)) ==="
