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

keep_ids=" "

add_keep_id() {
  local id="$1"
  [[ -z "$id" ]] && return 0
  case "$keep_ids" in
    *" $id "*) ;;
    *) keep_ids+="$id " ;;
  esac
}

add_keep_ref() {
  local ref="$1"
  local id
  id="$(docker image inspect --format '{{.Id}}' "$ref" 2>/dev/null || true)"
  add_keep_id "$id"
}

is_kept() {
  case "$keep_ids" in
    *" $1 "*) return 0 ;;
    *) return 1 ;;
  esac
}

echo "=== Prune images Planwise (conserve ${IMAGE_TAG}${PREVIOUS_IMAGE_TAG:+ + ${PREVIOUS_IMAGE_TAG}}) ==="

# IDs des tags version courante / précédente (couvre aussi :latest / :sha
# pointant sur la même image).
while IFS= read -r ref; do
  [[ -z "$ref" ]] && continue
  tag="${ref##*:}"
  if [[ "$tag" == "$IMAGE_TAG" ]]; then
    add_keep_ref "$ref"
  elif [[ -n "$PREVIOUS_IMAGE_TAG" && "$tag" == "$PREVIOUS_IMAGE_TAG" ]]; then
    add_keep_ref "$ref"
  fi
done < <(docker images --format '{{.Repository}}:{{.Tag}}' | while IFS= read -r ref; do
  case "$ref" in
    "${REGISTRY}/planwise-"*:*) printf '%s\n' "$ref" ;;
  esac
done)

# Sécurité : ne jamais supprimer une image encore référencée par un conteneur.
while IFS= read -r img; do
  [[ -z "$img" ]] && continue
  add_keep_ref "$img"
done < <(docker ps -a --format '{{.Image}}')

removed=0
while IFS= read -r repo tag id; do
  [[ -z "${repo:-}" || -z "${tag:-}" || -z "${id:-}" ]] && continue
  case "$repo" in
    "${REGISTRY}/planwise-"*) ;;
    *) continue ;;
  esac
  [[ "$tag" == "<none>" ]] && continue
  if is_kept "$id"; then
    continue
  fi
  echo "  rm $repo:$tag"
  if docker rmi "$repo:$tag" >/dev/null 2>&1; then
    removed=$((removed + 1))
  else
    echo "  (ignoré, image encore utilisée ou déjà absente)"
  fi
done < <(docker images --format '{{.Repository}} {{.Tag}} {{.ID}}')

# Couches dangling laissées après untag.
docker image prune -f >/dev/null || true

echo "Prune terminé : ${removed} tag(s) Planwise supprimé(s)."
