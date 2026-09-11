# Panduan Backup Otomatis & Disaster Recovery (E-Learning UAY)

Berkas ini adalah panduan teknis operasional bagi **Tim Server / Sysadmin / DevOps** Universitas Achmad Yani (UAY) untuk mengelola pencadangan berkas (*backup*) dan pemulihan darurat (*disaster recovery*) basis data E-Learning.

---

## 1. Ikhtisar Arsitektur Backup

- **Kontainer Database**: `uay-postgres` (PostgreSQL 16)
- **Nama Basis Data**: `elearning_uay_db`
- **Format Cadangan**: PostgreSQL Custom Archive Format (`pg_dump -Fc`) dipadatkan dengan `gzip` (`.dump.gz`).
- **Pemeriksaan Integritas**: Hash SHA-256 dihasilkan otomatis (`.dump.gz.sha256`).
- **Lokasi Simpan**: `deployment/backups/` pada VPS host.
- **Retensi Lokal**: Otomatis membersihkan berkas yang berumur lebih dari **7 hari**.

---

## 2. Hak Akses & Persiapan Awal

Sebelum menjalankan skrip untuk pertama kali, berikan hak eksekusi pada VPS host:

```bash
cd /opt/uay-elearning/deployment/scripts
chmod +x backup.sh restore.sh
```

Pastikan berkas `.env` pada folder `deployment/.env` telah terisi kredensial database yang benar (`DB_USER`, `DB_PASS`, `DB_NAME`).

---

## 3. Menjalankan Backup Manual

Untuk melakukan pencadangan segera (misal: sebelum *deployment* rilis versi baru atau migrasi skema):

```bash
./backup.sh
```

**Hasil yang diharapkan**:
- Berkas cadangan tercipta di `../backups/elearning_uay_db_YYYYMMDD_HHMMSS.dump.gz`
- Berkas checksum tercipta di `../backups/elearning_uay_db_YYYYMMDD_HHMMSS.dump.gz.sha256`
- Log tercatat rapi di `../backups/backup.log`
- Skrip mengeluarkan kode status `0` (Success).

---

## 4. Konfigurasi Jadwal Otomatis (Cron Job)

Pasang jadwal pencadangan otomatis setiap malam pukul **02.00 WIB**:

1. Buka konfigurasi crontab:
   ```bash
   sudo crontab -e
   ```
2. Tambahkan baris berikut:
   ```cron
   0 2 * * * /opt/uay-elearning/deployment/scripts/backup.sh >> /var/log/elearning_backup_cron.log 2>&1
   ```
3. Simpan dan keluar.

---

## 5. Prosedur Pemulihan Darurat (Disaster Recovery Runbook)

Jika terjadi insiden data (misal: server crash, galat manusia, atau uji coba restore ke server staging baru):

### Skenario A: Restore Interaktif (Dengan Konfirmasi Keamanan)
```bash
./restore.sh ../backups/elearning_uay_db_20260905_020000.dump.gz
```
Sistem akan meminta konfirmasi pengetikan: `RESTORE-PROD` sebelum mengeksekusi penimpaan data.

### Skenario B: Restore Otomatis / CI-CD Staging (Mode Force)
```bash
./restore.sh ../backups/elearning_uay_db_20260905_020000.dump.gz --force
```

### Alur yang Dijalankan oleh `restore.sh`:
1. Memverifikasi integritas berkas via **SHA-256 Checksum**.
2. Memutuskan seluruh koneksi aktif ke database (`pg_terminate_backend`).
3. Menjalankan `pg_restore` dengan opsi `--clean --if-exists`.
4. Memvalidasi jumlah tabel aktif pada skema `public`.
5. Me-restart kontainer `uay-backend` agar koneksi Prisma ORM kembali bersih dan sinkron.

---

## 6. Target Keandalan (Service Level Agreement)

| Metrik Pemulihan | Target Resmi UAY | Keterangan |
| :--- | :---: | :--- |
| **Recovery Point Objective (RPO)** | **< 24 Jam** | Kehilangan data maksimal 1 hari via jadwal nightly backup 02.00 WIB. |
| **Recovery Time Objective (RTO)** | **< 30 Menit** | Waktu pemulihan hingga sistem aktif kembali menggunakan Docker Compose + restore.sh. |

---

## 7. Rekomendasi Offsite Storage (Penyimpanan Luar Server)

Untuk memenuhi standar *3-2-1 Backup Rule* (3 salinan, 2 media berbeda, 1 di luar lokasi):
1. **NAS Kampus**: Pasang *cron job* rsync berkala dari VPS ke server penyimpanan internal IT Kampus.
2. **Cloud Object Storage (S3 / Wasabi / MinIO Backup Pool)**: Buka baris komentar *rclone hook* pada `backup.sh` untuk otomatis menduplikasi berkas `.dump.gz` ke bucket cloud terisolasi.
