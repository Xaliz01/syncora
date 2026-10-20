#!/usr/bin/env bash
# Bascule blue/green des points d'entrée (api + frontend) sans downtime.
#
# L'API et le frontend changent de slot ensemble. Caddy n'est rechargé qu'une
# fois les deux conteneurs du slot cible healthy : un seul upstream, et jamais
# vers un slot où l'API ou le frontend est absent.
#
# Au premier déploiement après le renommage api-gateway-* → api-*, aucun
# conteneur api-* ne tourne. Le slot publié reste celui du frontend déjà en
# service (fichier .edge-slot) : les deux partent sur l'autre couleur.
#
# Usage (depuis le répertoire deploy/ sur la VM) :
#   export REGISTRY IMAGE_TAG
#   ./rolling-edge.sh
#
set -euo pipefail

opposite_slot() {
  if [[ "$1" == "blue" ]]; then
    echo green
  else
    echo blue
  fi
}

# Décide le slot cible à partir de l'état observé, sans Docker.
# Arguments : edge api_blue api_green fe_blue fe_green
#   edge : "" | blue | green (contenu de .edge-slot)
#   flags : 1 si le conteneur tourne, sinon 0
# stdout : "bootstrap none blue" | "roll <published> <target>"
resolve_edge_roll() {
  local edge="${1:-}"
  local api_blue="$2"
  local api_green="$3"
  local fe_blue="$4"
  local fe_green="$5"
  local published=""

  if [[ "$edge" == "blue" || "$edge" == "green" ]]; then
    published="$edge"
  fi

  # Fichier périmé : Caddy est censé viser une couleur dont le frontend est arrêté,
  # alors que l'autre frontend tourne encore.
  if [[ -n "$published" ]]; then
    local fe_published=0 fe_other=0
    if [[ "$published" == "blue" ]]; then
      fe_published="$fe_blue"
      fe_other="$fe_green"
    else
      fe_published="$fe_green"
      fe_other="$fe_blue"
    fi
    if [[ "$fe_published" != "1" && "$fe_other" == "1" ]]; then
      published="$(opposite_slot "$published")"
    fi
  fi

  if [[ -z "$published" ]]; then
    if [[ "$fe_blue" == "1" && "$fe_green" != "1" ]]; then
      published=blue
    elif [[ "$fe_green" == "1" && "$fe_blue" != "1" ]]; then
      published=green
    elif [[ "$fe_blue" == "1" && "$fe_green" == "1" ]]; then
      published=blue
    elif [[ "$api_blue" == "1" && "$api_green" != "1" ]]; then
      published=blue
    elif [[ "$api_green" == "1" && "$api_blue" != "1" ]]; then
      published=green
    elif [[ "$api_blue" == "1" && "$api_green" == "1" ]]; then
      published=blue
    else
      echo "bootstrap none blue"
      return 0
    fi
  fi

  echo "roll ${published} $(opposite_slot "$published")"
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
  if [[ "$slot" != "blue" && "$slot" != "green" ]]; then
    echo "❌ Slot invalide : $slot"
    return 1
  fi
  if ! service_running "frontend-${slot}" || ! service_running "api-${slot}"; then
    echo "❌ Refus de basculer Caddy vers ${slot} : api-${slot} et frontend-${slot} doivent tourner"
    return 1
  fi
  local template="${ROOT_DIR}/Caddyfile.template"
  local target="${ROOT_DIR}/Caddyfile"
  if [[ ! -f "$template" ]]; then
    echo "❌ Caddyfile.template manquant"
    return 1
  fi
  local fe="frontend-${slot}:5173"
  local api="api-${slot}:3000"
  sed \
    -e "s|__FRONTEND_UPSTREAM__|${fe}|g" \
    -e "s|__API_UPSTREAM__|${api}|g" \
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

running_flag() {
  if service_running "$1"; then
    echo 1
  else
    echo 0
  fi
}

read_edge_slot() {
  local file="${ROOT_DIR}/.edge-slot"
  if [[ ! -f "$file" ]]; then
    echo ""
    return 0
  fi
  tr '[:upper:]' '[:lower:]' <"$file" | tr -d '[:space:]'
}

retire_slot() {
  local service="$1"
  local id
  id="$(compose ps -aq "$service" 2>/dev/null || true)"
  if [[ -z "$id" ]]; then
    return 0
  fi
  echo "🛑 Arrêt de ${service}"
  compose stop "$service"
  compose rm -f "$service" >/dev/null
}

main() {
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

  local edge decision mode published target retire
  edge="$(read_edge_slot)"
  decision="$(resolve_edge_roll \
    "$edge" \
    "$(running_flag api-blue)" \
    "$(running_flag api-green)" \
    "$(running_flag frontend-blue)" \
    "$(running_flag frontend-green)")"
  read -r mode published target <<<"$decision"
  retire="$(opposite_slot "$target")"

  echo "=== Rolling edge (api + frontend) ==="
  echo "Décision : mode=${mode} publié=${published} cible=${target} (fichier=${edge:-<absent>})"

  # Les deux images du slot cible démarrent avant tout changement de Caddy.
  compose up -d --no-deps --force-recreate --pull never "api-${target}" "frontend-${target}"
  wait_healthy "api-${target}"
  wait_healthy "frontend-${target}"

  apply_caddy_slot "$target"
  sleep 2

  retire_slot "api-${retire}"
  retire_slot "frontend-${retire}"

  if service_running "frontend-${target}" && service_running "api-${target}"; then
    echo "✅ api + frontend sur ${target}"
  else
    echo "❌ Pas de paire frontend+api cohérente"
    compose ps || true
    exit 1
  fi

  echo "=== Rolling edge terminé (slot=$(cat .edge-slot)) ==="
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
