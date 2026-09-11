#!/usr/bin/env bash
set -euo pipefail
umask 077
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${DEPLOY_DIR}/backups"
mkdir -p "$BACKUP_DIR"
exec 9>"${BACKUP_DIR}/.backup.lock"
flock -n 9 || { echo 'A backup is already running.' >&2; exit 1; }
ARCHIVE="${BACKUP_DIR}/elearning_$(TZ=Asia/Jakarta date '+%Y%m%d_%H%M%S').dump.gz"
TEMP_ARCHIVE="$(mktemp "${BACKUP_DIR}/.backup.XXXXXX")"
trap 'rm -f -- "$TEMP_ARCHIVE"' EXIT
# Read credentials inside the database container; never source a .env as shell code.
docker exec uay-postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' | gzip > "$TEMP_ARCHIVE"
gzip -t "$TEMP_ARCHIVE"
mv -- "$TEMP_ARCHIVE" "$ARCHIVE"
(cd "$BACKUP_DIR" && sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256")
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'elearning_*.dump.gz*' -mtime +7 -delete
echo "Backup complete: $ARCHIVE"
