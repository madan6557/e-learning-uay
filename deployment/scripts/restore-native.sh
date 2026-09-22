#!/usr/bin/env bash
# ==============================================================================
# Skrip Pemulihan Darurat (Disaster Recovery) PostgreSQL (Native PM2 / Bare-Metal)
# E-Learning Universitas Achmad Yani (UAY)
# ==============================================================================
set -euo pipefail
umask 077

if [ "$#" -lt 1 ]; then 
  echo "Usage: $0 backup.dump.gz [--force]" >&2
  exit 1
fi

ARCHIVE="$(realpath -- "$1")"
FORCE_FLAG="${2:-}"
DB_NAME="${DB_NAME:-elearning_prod}"
DB_USER="${DB_USER:-postgres}"

test -f "$ARCHIVE" && test -f "${ARCHIVE}.sha256" || { echo 'Archive and SHA-256 sidecar are required.' >&2; exit 1; }

EXPECTED="$(cut -d ' ' -f 1 "${ARCHIVE}.sha256")"
ACTUAL="$(sha256sum "$ARCHIVE" | cut -d ' ' -f 1)"
[[ "$EXPECTED" =~ ^[0-9a-f]{64}$ ]] && [ "$EXPECTED" = "$ACTUAL" ] || { echo 'Checksum verification failed.' >&2; exit 1; }
gzip -t "$ARCHIVE"

if [ "${FORCE_FLAG}" != "--force" ]; then
  printf 'This replaces the database %s using %s. Type RESTORE-PROD: ' "$DB_NAME" "$ARCHIVE"
  read -r CONFIRM
  [ "$CONFIRM" = 'RESTORE-PROD' ] || { echo 'Restoration cancelled.'; exit 1; }
fi

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Ambil snapshot cadangan pemulihan sebelum penghentian layanan
bash "${DEPLOY_DIR}/scripts/backup-native.sh"

# Hentikan backend PM2 sementara waktu agar tidak ada transaksi baru
echo "Menghentikan layanan backend di PM2..."
pm2 stop uay-api uay-worker || true

# Putuskan seluruh koneksi aktif ke database
sudo -u "${DB_USER}" psql -d postgres -c "
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();"

# Eksekusi Restore dengan single-transaction
echo "Mengeksekusi pg_restore..."
gzip -dc "$ARCHIVE" | sudo -u "${DB_USER}" pg_restore -d "$DB_NAME" --clean --if-exists --single-transaction --exit-on-error --no-owner

# Verifikasi integritas tabel
sudo -u "${DB_USER}" psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
SELECT count(*) AS audit_records FROM "AuditLog";
SELECT count(*) AS users FROM "User";
SQL

# Nyalakan kembali backend PM2
echo "Menyalakan kembali proses PM2..."
pm2 start ecosystem.config.js --env production

echo 'Restore transaction and verification completed. Check /api/v1/health before reopening access.'
