#!/usr/bin/env bash
# ==============================================================================
# Skrip Backup Otomatis Database PostgreSQL (Native PM2 / Bare-Metal Host)
# E-Learning Universitas Achmad Yani (UAY)
# ==============================================================================
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

# Ambil DB_NAME & DB_USER dari environment atau default ke produksi
DB_NAME="${DB_NAME:-elearning_prod}"
DB_USER="${DB_USER:-postgres}"

echo "[$(date)] Memulai proses pencadangan database ${DB_NAME} (Native)..."

# Ekspor database menggunakan native pg_dump dan gzip
sudo -u "${DB_USER}" pg_dump -d "${DB_NAME}" -Fc | gzip > "$TEMP_ARCHIVE"
gzip -t "$TEMP_ARCHIVE"
mv -- "$TEMP_ARCHIVE" "$ARCHIVE"

# Buat SHA-256 Checksum
(cd "$BACKUP_DIR" && sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256")

# Rotasi retensi 7 hari lokal
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'elearning_*.dump.gz*' -mtime +7 -delete

echo "Backup complete: $ARCHIVE ($(du -sh "$ARCHIVE" | cut -f1))"
