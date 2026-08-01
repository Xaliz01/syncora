#!/usr/bin/env bash
# Restauration MongoDB Planwise depuis un archive S3 (OVH).
#
# ATTENTION : écrase les données du Mongo cible. À utiliser hors prod ou après accord.
#
# Usage :
#   ./backup/mongo-restore.sh s3://bucket/mongo/planwise-mongo-YYYYMMDD….archive.gz
#   ./backup/mongo-restore.sh s3://bucket/mongo/planwise-mongo-….archive.gz.enc
#
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="${DEPLOY_DIR}/.env.production"
S3_URI="${1:-}"

die() {
  echo "❌ $*" >&2
  exit 1
}

[[ -n "$S3_URI" ]] || die "Usage: $0 s3://bucket/prefix/fichier.archive.gz[.enc]"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID requis}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY requis}"

S3_ENDPOINT="${S3_ENDPOINT:-https://s3.eu-west-par.io.cloud.ovh.net}"
AWS_REGION="${AWS_REGION:-eu-west-par}"
MONGO_HOST="${MONGO_BACKUP_HOST:-mongodb}"
MONGO_NETWORK="${MONGO_BACKUP_NETWORK:-planwise}"
MONGO_IMAGE="${MONGO_BACKUP_MONGO_IMAGE:-mongo:7}"

WORKDIR="$(mktemp -d /tmp/planwise-mongo-restore.XXXXXX)"
trap 'rm -rf "$WORKDIR"' EXIT

BASENAME="$(basename "$S3_URI")"
LOCAL_PATH="${WORKDIR}/${BASENAME}"

echo "Téléchargement ${S3_URI}…"
docker run --rm \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION="$AWS_REGION" \
  -v "${WORKDIR}:/data" \
  amazon/aws-cli:2.15.0 \
  s3 cp "$S3_URI" "/data/${BASENAME}" \
  --endpoint-url "$S3_ENDPOINT"

ARCHIVE="$LOCAL_PATH"
if [[ "$BASENAME" == *.enc ]]; then
  [[ -n "${MONGO_BACKUP_ENCRYPT_PASSPHRASE:-}" ]] || die "MONGO_BACKUP_ENCRYPT_PASSPHRASE requis pour .enc"
  ARCHIVE="${WORKDIR}/dump.archive.gz"
  openssl enc -aes-256-cbc -pbkdf2 -d \
    -in "$LOCAL_PATH" \
    -out "$ARCHIVE" \
    -pass "pass:${MONGO_BACKUP_ENCRYPT_PASSPHRASE}"
fi

echo "⚠️  Restauration vers mongodb://${MONGO_HOST}:27017 (drop) dans 5s — Ctrl+C pour annuler"
sleep 5

docker run --rm \
  --network "$MONGO_NETWORK" \
  -v "${ARCHIVE}:/backup/dump.archive.gz:ro" \
  "$MONGO_IMAGE" \
  mongorestore --uri="mongodb://${MONGO_HOST}:27017" --archive=/backup/dump.archive.gz --gzip --drop

echo "✅ Restauration terminée"
