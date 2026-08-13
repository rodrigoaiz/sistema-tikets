#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-helpdesk-sep}"
BACKUP_ROOT="${BACKUP_DIR:-/var/backups/helpdesk-sep}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
VOLUME_ARCHIVER_IMAGE="${BACKUP_VOLUME_ARCHIVER_IMAGE:-caddy:2-alpine}"

umask 077
mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"

exec 9>"$BACKUP_ROOT/.backup.lock"
if ! flock -n 9; then
  printf 'Ya existe otro respaldo en ejecución.\n' >&2
  exit 1
fi

staging_dir="$(mktemp -d "$BACKUP_ROOT/.incomplete-${TIMESTAMP}.XXXXXX")"
final_dir="$BACKUP_ROOT/$TIMESTAMP"

cleanup() {
  rm -rf -- "$staging_dir"
}
trap cleanup EXIT

compose() {
  docker compose \
    --project-directory "$PROJECT_DIR" \
    --project-name "$PROJECT_NAME" \
    -f "$PROJECT_DIR/docker-compose.yml" \
    "$@"
}

archive_volume() {
  local volume_name="$1"
  local archive_name="$2"

  docker run --rm \
    --mount "type=volume,source=${volume_name},destination=/source,readonly" \
    --mount "type=bind,source=${staging_dir},destination=/backup" \
    "$VOLUME_ARCHIVER_IMAGE" \
    sh -c "tar -czf /backup/${archive_name} -C /source ."
}

compose config --quiet
compose ps --status running --services | grep -qx 'db'

printf 'Respaldando PostgreSQL...\n'
compose exec -T db sh -c \
  'pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -9 > "$staging_dir/database.sql.gz"
gzip -t "$staging_dir/database.sql.gz"

printf 'Respaldando adjuntos y estado de Caddy...\n'
archive_volume "${PROJECT_NAME}_uploads_data" uploads.tar.gz
archive_volume "${PROJECT_NAME}_caddy_data" caddy-data.tar.gz
archive_volume "${PROJECT_NAME}_caddy_config" caddy-config.tar.gz

printf 'Respaldando configuración de recuperación...\n'
install -m 600 "$PROJECT_DIR/.env" "$staging_dir/env"
install -m 644 "$PROJECT_DIR/docker-compose.yml" "$staging_dir/docker-compose.yml"
install -m 644 "$PROJECT_DIR/caddy/Caddyfile" "$staging_dir/Caddyfile"
install -m 644 "$PROJECT_DIR/prisma/schema.prisma" "$staging_dir/schema.prisma"
cp -a "$PROJECT_DIR/prisma/migrations" "$staging_dir/migrations"

{
  printf 'created_at_utc=%s\n' "$TIMESTAMP"
  printf 'project_name=%s\n' "$PROJECT_NAME"
  printf 'database=%s\n' "${POSTGRES_DB:-helpdesk}"
  printf 'retention_days=%s\n' "$RETENTION_DAYS"
} > "$staging_dir/manifest.txt"

(
  cd "$staging_dir"
  sha256sum -- \
    database.sql.gz \
    uploads.tar.gz \
    caddy-data.tar.gz \
    caddy-config.tar.gz \
    env \
    docker-compose.yml \
    Caddyfile \
    schema.prisma \
    manifest.txt \
    > SHA256SUMS
)

mv -- "$staging_dir" "$final_dir"
trap - EXIT
ln -sfn -- "$TIMESTAMP" "$BACKUP_ROOT/latest"

find "$BACKUP_ROOT" \
  -mindepth 1 \
  -maxdepth 1 \
  -type d \
  -name '20????????-??????' \
  -mtime "+$RETENTION_DAYS" \
  -exec rm -rf -- {} +

printf 'Respaldo creado: %s\n' "$final_dir"
