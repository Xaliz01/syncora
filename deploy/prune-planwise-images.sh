#!/usr/bin/env bash
# Conserve uniquement les images applicatives Planwise de la MEP courante et
# de la précédente (rollback). Les images monitoring / Mongo / base ne sont
# pas touchées.
#
# Usage (depuis deploy/ sur la VM, après un pull/up réussi) :
#   export REGISTRY IMAGE_TAG
#   # optionnel : PREVIOUS_IMAGE_TAG=v0.54.0
#   # sinon lit .previous-image-tag s'il existe
#   ./prune-planwise-images.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

REGISTRY="${REGISTRY:?REGISTRY est requis}"
IMAGE_TAG="${IMAGE_TAG:?IMAGE_TAG est requis}"
PREVIOUS_IMAGE_TAG="${PREVIOUS_IMAGE_TAG:-}"
PREVIOUS_FILE="$ROOT_DIR/.previous-image-tag"

if [[ -z "$PREVIOUS_IMAGE_TAG" && -f "$PREVIOUS_FILE" ]]; then
  PREVIOUS_IMAGE_TAG="$(tr -d '[:space:]' <"$PREVIOUS_FILE" || true)"
fi

if [[ -n "$PREVIOUS_IMAGE_TAG" && "$PREVIOUS_IMAGE_TAG" == "$IMAGE_TAG" ]]; then
  PREVIOUS_IMAGE_TAG=""
fi

is_planwise_repo() {
  case "$1" in
    "${REGISTRY}/planwise-"*) return 0 ;;
    *) return 1 ;;
  esac
}

is_keep_tag() {
  local tag="$1"
  [[ "$tag" == "$IMAGE_TAG" ]] && return 0
  [[ -n "$PREVIOUS_IMAGE_TAG" && "$tag" == "$PREVIOUS_IMAGE_TAG" ]] && return 0
  return 1
}

echo "=== Prune images Planwise (conserve ${IMAGE_TAG}${PREVIOUS_IMAGE_TAG:+ + ${PREVIOUS_IMAGE_TAG}}) ==="
echo "Registry : ${REGISTRY}"

# Conteneurs stoppés qui référencent encore une image Planwise : ils empêchent
# `docker rmi` même si le tag n'est plus celui de la MEP. Les slots edge inactifs
# sont déjà `compose rm` par rolling-edge ; on nettoie les orphelins restants.
removed_containers=0
while IFS=$'\t' read -r cid image; do
  [[ -z "${cid:-}" || -z "${image:-}" ]] && continue
  repo="${image%:*}"
  # Image peut être un ID court (pas repo:tag) — on inspecte le repo si besoin.
  planwise_hit=0
  if is_planwise_repo "$repo" || [[ "$image" == "${REGISTRY}/planwise-"* ]]; then
    planwise_hit=1
  else
    while IFS= read -r tagged; do
      [[ -z "$tagged" ]] && continue
      if is_planwise_repo "${tagged%:*}"; then
        planwise_hit=1
        break
      fi
    done < <(docker image inspect --format '{{range .RepoTags}}{{println .}}{{end}}' "$image" 2>/dev/null || true)
  fi
  if [[ "$planwise_hit" -eq 1 ]]; then
    echo "  rm container stoppé $cid ($image)"
    if docker rm "$cid" >/dev/null 2>&1; then
      removed_containers=$((removed_containers + 1))
    fi
  fi
done < <(
  docker ps -a --filter status=exited --filter status=created --filter status=dead \
    --format '{{.ID}}\t{{.Image}}'
)
if [[ "$removed_containers" -gt 0 ]]; then
  echo "Conteneurs stoppés Planwise retirés : ${removed_containers}"
fi

# Suppression par tag : on ne garde que IMAGE_TAG (+ PREVIOUS). Les tags satellites
# (:latest, :sha) sur la même image sont détachés s'ils ne sont pas dans la liste ;
# les couches restent tant qu'un tag conservé pointe dessus.
removed=0
kept=0
skipped=0
while IFS=$'\t' read -r repo tag; do
  [[ -z "${repo:-}" || -z "${tag:-}" ]] && continue
  is_planwise_repo "$repo" || continue
  [[ "$tag" == "<none>" ]] && continue

  ref="${repo}:${tag}"
  if is_keep_tag "$tag"; then
    echo "  keep $ref"
    kept=$((kept + 1))
    continue
  fi

  echo "  rm $ref"
  if docker rmi "$ref" >/dev/null 2>&1; then
    removed=$((removed + 1))
  else
    echo "  (ignoré, image encore utilisée ou déjà absente)"
    skipped=$((skipped + 1))
  fi
done < <(docker images --format '{{.Repository}}\t{{.Tag}}')

# Couches dangling laissées après untag.
docker image prune -f >/dev/null || true

echo "Prune terminé : ${removed} tag(s) supprimé(s), ${kept} conservé(s), ${skipped} ignoré(s)."
echo "Images Planwise restantes :"
docker images --format '{{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}' \
  | awk -v p="${REGISTRY}/planwise-" 'index($0, p) == 1 { print "  " $0 }' \
  || true
