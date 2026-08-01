#!/usr/bin/env bash
# Sauvegarde MongoDB Planwise → Object Storage S3 (OVH).
#
# Prérequis : Docker, réseau compose `planwise`, conteneur `planwise-mongodb` up.
# Usage :
#   ./backup/mongo-backup.sh
#   DEPLOY_DIR=/opt/planwise/deploy ./backup/mongo-backup.sh
#
# Variables (.env.production) :
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_ENDPOINT, AWS_REGION
#   MONGO_BACKUP_S3_BUCKET      (défaut: S3_BUCKET, sinon planwise-backups)
#   MONGO_BACKUP_S3_PREFIX      (défaut: mongo/)
#   MONGO_BACKUP_RETENTION_DAYS (défaut: 14)
#   MONGO_BACKUP_ENCRYPT_PASSPHRASE (optionnel — chiffrement AES-256)
#   MONGO_BACKUP_WORKDIR (optionnel — chemin hôte partagé, requis si lancé via Ofelia)
#
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${DEPLOY_DIR}/.env.production"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ -n "${MONGO_BACKUP_WORKDIR:-}" ]]; then
  mkdir -p "$MONGO_BACKUP_WORKDIR"
  WORKDIR="${MONGO_BACKUP_WORKDIR}/run-${STAMP}-$$"
  mkdir -p "$WORKDIR"
else
  WORKDIR="$(mktemp -d /tmp/planwise-mongo-backup.XXXXXX)"
fi

ARCHIVE_NAME="planwise-mongo-${STAMP}.archive.gz"
ARCHIVE_PATH="${WORKDIR}/${ARCHIVE_NAME}"

cleanup() {
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

die() {
  log "ERROR: $*"
  exit 1
}

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1091
  source "$(dirname "${BASH_SOURCE[0]}")/load-env.sh"
  load_dotenv "$ENV_FILE"
fi

: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID requis}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY requis}"

S3_ENDPOINT="${S3_ENDPOINT:-https://s3.eu-west-par.io.cloud.ovh.net}"
AWS_REGION="${AWS_REGION:-eu-west-par}"
BUCKET="${MONGO_BACKUP_S3_BUCKET:-${S3_BUCKET:-planwise-backups}}"
PREFIX="${MONGO_BACKUP_S3_PREFIX:-mongo/}"
PREFIX="${PREFIX#/}"
[[ "$PREFIX" == */ ]] || PREFIX="${PREFIX}/"
RETENTION_DAYS="${MONGO_BACKUP_RETENTION_DAYS:-14}"
MONGO_HOST="${MONGO_BACKUP_HOST:-mongodb}"
MONGO_NETWORK="${MONGO_BACKUP_NETWORK:-planwise}"
MONGO_IMAGE="${MONGO_BACKUP_MONGO_IMAGE:-mongo:7}"
AWS_CLI_IMAGE="${MONGO_BACKUP_AWS_CLI_IMAGE:-amazon/aws-cli:2.15.0}"

if ! docker ps --format '{{.Names}}' | grep -qx 'planwise-mongodb'; then
  die "Conteneur planwise-mongodb introuvable / non demarre"
fi

log "Dump Mongo (${MONGO_HOST})…"
# Écriture via stdout hôte : l'image mongo:7 tourne en user non-root et ne
# peut pas écrire dans un bind-mount /tmp créé par ubuntu/root.
docker run --rm \
  --network "$MONGO_NETWORK" \
  "$MONGO_IMAGE" \
  mongodump --uri="mongodb://${MONGO_HOST}:27017" --archive --gzip \
  >"$ARCHIVE_PATH" \
  || die "mongodump a echoue"

[[ -s "$ARCHIVE_PATH" ]] || die "archive vide apres mongodump"

UPLOAD_FILE="$ARCHIVE_PATH"
UPLOAD_NAME="$ARCHIVE_NAME"
CONTENT_TYPE="application/gzip"

if [[ -n "${MONGO_BACKUP_ENCRYPT_PASSPHRASE:-}" ]]; then
  command -v openssl >/dev/null 2>&1 || die "openssl requis pour MONGO_BACKUP_ENCRYPT_PASSPHRASE"
  log "Chiffrement AES-256…"
  UPLOAD_FILE="${ARCHIVE_PATH}.enc"
  UPLOAD_NAME="${ARCHIVE_NAME}.enc"
  openssl enc -aes-256-cbc -pbkdf2 -salt \
    -in "$ARCHIVE_PATH" \
    -out "$UPLOAD_FILE" \
    -pass "pass:${MONGO_BACKUP_ENCRYPT_PASSPHRASE}" \
    || die "chiffrement openssl a echoue"
  CONTENT_TYPE="application/octet-stream"
fi

SIZE="$(du -h "$UPLOAD_FILE" | awk '{print $1}')"
S3_URI="s3://${BUCKET}/${PREFIX}${UPLOAD_NAME}"
log "Upload ${SIZE} → ${S3_URI}"

docker run --rm \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION="$AWS_REGION" \
  -v "${UPLOAD_FILE}:/data/$(basename "$UPLOAD_FILE"):ro" \
  "$AWS_CLI_IMAGE" \
  s3 cp "/data/$(basename "$UPLOAD_FILE")" "$S3_URI" \
  --endpoint-url "$S3_ENDPOINT" \
  --content-type "$CONTENT_TYPE" \
  || die "upload S3 a echoue"

CUTOFF="$(docker run --rm "$MONGO_IMAGE" bash -c \
  "date -u -d '-${RETENTION_DAYS} days' +%Y-%m-%dT%H:%M:%SZ")"
log "Retention : suppression des objets < ${CUTOFF} sous s3://${BUCKET}/${PREFIX}"

OLD_KEYS="$(
  docker run --rm \
    -e AWS_ACCESS_KEY_ID \
    -e AWS_SECRET_ACCESS_KEY \
    -e AWS_DEFAULT_REGION="$AWS_REGION" \
    "$AWS_CLI_IMAGE" \
    s3api list-objects-v2 \
    --bucket "$BUCKET" \
    --prefix "$PREFIX" \
    --endpoint-url "$S3_ENDPOINT" \
    --query "Contents[?LastModified<\`${CUTOFF}\`].Key" \
    --output text 2>/dev/null || true
)"

if [[ -n "${OLD_KEYS}" && "${OLD_KEYS}" != "None" ]]; then
  echo "$OLD_KEYS" | tr '\t' '\n' | while IFS= read -r key; do
    [[ -z "$key" || "$key" == "None" ]] && continue
    log "Suppression : s3://${BUCKET}/${key}"
    docker run --rm \
      -e AWS_ACCESS_KEY_ID \
      -e AWS_SECRET_ACCESS_KEY \
      -e AWS_DEFAULT_REGION="$AWS_REGION" \
      "$AWS_CLI_IMAGE" \
      s3 rm "s3://${BUCKET}/${key}" \
      --endpoint-url "$S3_ENDPOINT" || true
  done
fi

log "OK Backup termine : ${S3_URI}"
