#!/usr/bin/env bash
# Décision de slot de deploy/rolling-edge.sh, sans Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${ROOT}/rolling-edge.sh"

failures=0

expect() {
  local name="$1"
  local expected="$2"
  shift 2
  local actual
  actual="$(resolve_edge_roll "$@")"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL ${name}"
    echo "  attendu : ${expected}"
    echo "  obtenu  : ${actual}"
    failures=$((failures + 1))
  else
    echo "ok   ${name}"
  fi
}

# Premier déploiement : rien en ligne → blue pour les deux.
expect "install fraîche" "bootstrap none blue" "" 0 0 0 0

# Incident v1.0.0 : api-gateway renommé en api, frontend encore sur blue.
# L'API ne doit pas booter seule sur blue pendant que le frontend part sur green.
expect "migration frontend blue, sans api" "roll blue green" "blue" 0 0 1 0
expect "migration sans fichier .edge-slot" "roll blue green" "" 0 0 1 0
expect "migration frontend green, sans api" "roll green blue" "green" 0 0 0 1

# Déploiements suivants : les deux suivent le slot publié.
expect "slot publié blue" "roll blue green" "blue" 1 0 1 0
expect "slot publié green" "roll green blue" "green" 0 1 0 1

# Échec CD du 2026-10-20 : Caddy écrit sur green, frontend green, api seulement blue.
expect "split api blue / frontend green" "roll green blue" "green" 1 0 0 1
expect "split sans fichier" "roll green blue" "" 1 0 0 1

# Fichier périmé : le frontend vivant prime sur .edge-slot.
expect "fichier green mais frontend blue vivant" "roll blue green" "green" 1 0 1 0

# Les deux couleurs du frontend tournent : on sort du slot publié.
expect "deux frontends, fichier blue" "roll blue green" "blue" 1 1 1 1
expect "deux frontends, sans fichier" "roll blue green" "" 1 1 1 1

# API seule (frontend arrêté) : on déploie l'autre couleur, on ne coupe pas avant.
expect "api blue seule" "roll blue green" "" 1 0 0 0
expect "api green seule" "roll green blue" "" 0 1 0 0

if [[ "$failures" -ne 0 ]]; then
  echo "${failures} échec(s)"
  exit 1
fi

# Déroulement : Caddy ne change qu'après le healthy des deux conteneurs du slot cible.
integration_failures=0

assert_integration() {
  local name="$1"
  shift
  if "$@"; then
    echo "ok   ${name}"
  else
    echo "FAIL ${name}"
    integration_failures=$((integration_failures + 1))
  fi
}

run_with_stub() {
  local tmp="$1"
  PATH="${tmp}/bin:${PATH}" STATE="${tmp}/state" DOCKER_LOG="${tmp}/docker.log" \
    "${tmp}/deploy/rolling-edge.sh" >"${tmp}/out" 2>"${tmp}/err"
}

setup_stub_deploy() {
  local tmp="$1"
  mkdir -p "${tmp}/bin" "${tmp}/deploy" "${tmp}/state/running" "${tmp}/state/health"
  cp "${ROOT}/rolling-edge.sh" "${tmp}/deploy/rolling-edge.sh"
  chmod +x "${tmp}/deploy/rolling-edge.sh"
  printf '%s\n' 'front __FRONTEND_UPSTREAM__' 'api __API_UPSTREAM__' \
    >"${tmp}/deploy/Caddyfile.template"
  : >"${tmp}/deploy/docker-compose.prod.yml"
  : >"${tmp}/deploy/docker-compose.monitoring.yml"
  printf '%s\n' 'OLD' >"${tmp}/deploy/Caddyfile"
  cat >"${tmp}/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
echo "$*" >> "${DOCKER_LOG}"
if [[ "${1:-}" == "inspect" ]]; then
  id="${*: -1}"
  if [[ -f "${STATE}/health/${id}" ]]; then
    cat "${STATE}/health/${id}"
  else
    echo missing
  fi
  exit 0
fi
if [[ "${1:-}" == "exec" ]]; then
  exit 0
fi
if [[ "${1:-}" != "compose" ]]; then
  exit 0
fi
args=("$@")
i=1
cmd=""
while (( i < ${#args[@]} )); do
  a="${args[$i]}"
  case "$a" in
    -f|--env-file|--profile)
      i=$((i + 2))
      ;;
    ps|up|stop|rm|logs)
      cmd="$a"
      i=$((i + 1))
      break
      ;;
    *)
      i=$((i + 1))
      ;;
  esac
done
rest=()
if (( i < ${#args[@]} )); then
  rest=("${args[@]:$i}")
fi
service=""
if (( ${#rest[@]} > 0 )); then
  service="${rest[-1]}"
fi
case "$cmd" in
  ps)
    status_filter=0
    for word in "${rest[@]}"; do
      if [[ "$word" == "--status" ]]; then
        status_filter=1
      fi
    done
    if [[ -n "$service" && -f "${STATE}/running/${service}" ]]; then
      if [[ "$status_filter" == "0" || -f "${STATE}/running/${service}" ]]; then
        echo "$service"
      fi
    fi
    ;;
  up)
    for word in "${rest[@]}"; do
      case "$word" in
        -*|never) ;;
        *)
          touch "${STATE}/running/${word}"
          if [[ "${UNHEALTHY_ON_UP:-}" == "$word" ]]; then
            echo unhealthy >"${STATE}/health/${word}"
          else
            echo healthy >"${STATE}/health/${word}"
          fi
          ;;
      esac
    done
    ;;
  stop|rm)
    if [[ -n "$service" ]]; then
      rm -f "${STATE}/running/${service}" "${STATE}/health/${service}"
    fi
    ;;
  logs)
    ;;
esac
exit 0
EOF
  chmod +x "${tmp}/bin/docker"
}

mark_running() {
  local tmp="$1" service="$2"
  touch "${tmp}/state/running/${service}"
  echo healthy >"${tmp}/state/health/${service}"
}

tmp_migration="$(mktemp -d)"
setup_stub_deploy "$tmp_migration"
printf '%s\n' blue >"${tmp_migration}/deploy/.edge-slot"
mark_running "$tmp_migration" frontend-blue
mark_running "$tmp_migration" caddy
if run_with_stub "$tmp_migration"; then
  echo "ok   migration: script exit 0"
else
  echo "FAIL migration: script exit 0"
  cat "${tmp_migration}/out" "${tmp_migration}/err" || true
  integration_failures=$((integration_failures + 1))
fi
caddy_body="$(cat "${tmp_migration}/deploy/Caddyfile")"
edge_body="$(cat "${tmp_migration}/deploy/.edge-slot")"
up_line="$(grep -n ' up -d ' "${tmp_migration}/docker.log" | head -1 | cut -d: -f1 || true)"
reload_line="$(grep -n '^exec ' "${tmp_migration}/docker.log" | head -1 | cut -d: -f1 || true)"
assert_integration "migration: un seul up api-green + frontend-green" \
  bash -c "[[ '$caddy_body' == *'frontend-green:5173'* && '$caddy_body' == *'api-green:3000'* && '$caddy_body' != *'api-blue'* ]]"
assert_integration "migration: Caddy après le up" \
  bash -c "[[ -n '$up_line' && -n '$reload_line' && '$up_line' -lt '$reload_line' ]]"
assert_integration "migration: slot green, ancien frontend arrêté" \
  bash -c "[[ '$edge_body' == green && ! -f '${tmp_migration}/state/running/frontend-blue' && -f '${tmp_migration}/state/running/api-green' && -f '${tmp_migration}/state/running/frontend-green' ]]"

tmp_split="$(mktemp -d)"
setup_stub_deploy "$tmp_split"
printf '%s\n' green >"${tmp_split}/deploy/.edge-slot"
mark_running "$tmp_split" frontend-green
mark_running "$tmp_split" api-blue
mark_running "$tmp_split" caddy
if run_with_stub "$tmp_split"; then
  echo "ok   split: script exit 0"
else
  echo "FAIL split: script exit 0"
  cat "${tmp_split}/out" "${tmp_split}/err" || true
  integration_failures=$((integration_failures + 1))
fi
split_caddy="$(cat "${tmp_split}/deploy/Caddyfile")"
assert_integration "split: paire ramenée sur blue" \
  bash -c "[[ '$split_caddy' == *'frontend-blue:5173'* && '$split_caddy' == *'api-blue:3000'* && '$(cat "${tmp_split}/deploy/.edge-slot")' == blue && ! -f '${tmp_split}/state/running/frontend-green' && -f '${tmp_split}/state/running/api-blue' && -f '${tmp_split}/state/running/frontend-blue' ]]"

tmp_unhealthy="$(mktemp -d)"
setup_stub_deploy "$tmp_unhealthy"
printf '%s\n' blue >"${tmp_unhealthy}/deploy/.edge-slot"
mark_running "$tmp_unhealthy" frontend-blue
mark_running "$tmp_unhealthy" caddy
set +e
PATH="${tmp_unhealthy}/bin:${PATH}" STATE="${tmp_unhealthy}/state" \
  DOCKER_LOG="${tmp_unhealthy}/docker.log" UNHEALTHY_ON_UP=api-green \
  "${tmp_unhealthy}/deploy/rolling-edge.sh" >"${tmp_unhealthy}/out" 2>"${tmp_unhealthy}/err"
unhealthy_code=$?
set -e
assert_integration "api unhealthy: échec avant de toucher Caddy" \
  bash -c "[[ '$unhealthy_code' -ne 0 && '$(cat "${tmp_unhealthy}/deploy/Caddyfile")' == OLD && '$(cat "${tmp_unhealthy}/deploy/.edge-slot")' == blue && -f '${tmp_unhealthy}/state/running/frontend-blue' ]]"

rm -rf "$tmp_migration" "$tmp_split" "$tmp_unhealthy"

if [[ "$integration_failures" -ne 0 ]]; then
  echo "${integration_failures} échec(s) d'intégration"
  exit 1
fi

echo "rolling-edge slot: ok"
