#!/usr/bin/env bash
# Bascule blue/green des points d'entrée (api-gateway + frontend) sans downtime.
#
# Prérequis : images déjà pullées, microservices à jour, Caddyfile avec les deux
# upstreams + health checks. Un seul slot tourne en régime normal.
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
# Monitoring optionnel : présent en prod CD, absent en dépannage minimal.
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

# Pause pour laisser le nouvel upstream accepter des connexions avant d'arrêter l'ancien.
wait_caddy_settle() {
  sleep 5
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
    # Les deux tournent (état anormal) : on recrée green puis on coupe blue.
    echo "⚠️  $base : blue et green sont up — bascule forcée vers green"
    active=blue
    inactive=green
  else
    echo "ℹ️  $base : aucun slot actif — bootstrap sur blue"
    compose up -d --no-deps --pull never "$blue"
    wait_healthy "$blue"
    return 0
  fi

  echo "🔁 $base : actif=$active → déploiement sur $inactive"
  compose up -d --no-deps --force-recreate --pull never "${base}-${inactive}"
  wait_healthy "${base}-${inactive}"
  wait_caddy_settle

  echo "🛑 Arrêt de ${base}-${active}"
  compose stop "${base}-${active}"
  compose rm -f "${base}-${active}" >/dev/null
  echo "✅ $base basculé sur $inactive"
}

echo "=== Rolling edge (api-gateway + frontend) ==="
roll_pair "api-gateway"
roll_pair "frontend"
echo "=== Rolling edge terminé ==="
