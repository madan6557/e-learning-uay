#!/usr/bin/env bash
set -euo pipefail
umask 077
if [ "$#" -ne 1 ]; then echo "Usage: $0 backup.dump.gz" >&2; exit 1; fi
ARCHIVE="$(realpath -- "$1")"
test -f "$ARCHIVE" && test -f "${ARCHIVE}.sha256" || { echo 'Archive and SHA-256 sidecar are required.' >&2; exit 1; }
EXPECTED="$(cut -d ' ' -f 1 "${ARCHIVE}.sha256")"
ACTUAL="$(sha256sum "$ARCHIVE" | cut -d ' ' -f 1)"
[[ "$EXPECTED" =~ ^[0-9a-f]{64}$ ]] && [ "$EXPECTED" = "$ACTUAL" ] || { echo 'Checksum verification failed.' >&2; exit 1; }
gzip -t "$ARCHIVE"
printf 'This replaces the database in uay-postgres using %s. Type RESTORE-PROD: ' "$ARCHIVE"
read -r CONFIRM
[ "$CONFIRM" = 'RESTORE-PROD' ] || { echo 'Restoration cancelled.'; exit 1; }
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Capture a recovery backup before stopping writes.
bash "${DEPLOY_DIR}/scripts/backup.sh"
docker stop uay-backend
# Keep the backend stopped if restoration fails. Never report success after a partial restore.
gzip -dc "$ARCHIVE" | docker exec -i uay-postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --single-transaction --exit-on-error --no-owner'
docker exec -i uay-postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' <<'SQL'
SELECT count(*) AS audit_records FROM "AuditLog";
SELECT count(*) AS users FROM "User";
SQL
docker start uay-backend
echo 'Restore transaction and verification completed. Check /api/health before reopening access.'
