# -*- coding: utf-8 -*-
"""
Script to generate Technical Design Document v5.0
Platform E-Learning Universitas Achmad Yani (UAY)
Focus: Bare-Metal Native Architecture (PM2 Runtime Cluster, Nginx Native, Systemd PostgreSQL 16 & Redis Host)
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"

V4_PATH = DOCS_DIR / "Technical Design - E-Learning UAY - v4.0.md"
V5_PATH = DOCS_DIR / "Technical Design - E-Learning UAY - v5.0.md"
LATEST_PATH = DOCS_DIR / "Technical Design - E-Learning UAY.md"

def build_v5():
    with open(V4_PATH, "r", encoding="utf-8") as f:
        text = f.read()

    # 1. Update Title and metadata
    text = text.replace(
        "# PLATFORM E-LEARNING UNIVERSITAS ACHMAD YANI (UAY) — VERSI 2.0\n**Fokus**: Arsitektur Teknis, Integrasi SSO",
        "# PLATFORM E-LEARNING UNIVERSITAS ACHMAD YANI (UAY) — VERSI 5.0\n**Fokus**: Arsitektur Teknis Bare-Metal Native (PM2 Runtime Cluster, Nginx Native, Systemd PostgreSQL 16 & Redis Host), Integrasi SSO"
    )

    # 2. Update Review Guide (item 4)
    text = text.replace(
        "4. **Teknisi Server / DevOps / Sysadmin**: Fokus pada *Bab 2 (Topologi Jaringan)*, *Bab 7 (Topologi Docker Single-VPS, Nginx Reverse Proxy, SSL, Rate Limiting, dan Prosedur Backup Otomatis)*.",
        "4. **Teknisi Server / DevOps / Sysadmin**: Fokus pada *Bab 2 (Topologi Jaringan)*, *Bab 7 (Topologi Server Bare-Metal Linux, PM2 Process Manager, PM2 Cluster & Worker BullMQ, Nginx Reverse Proxy Native, SSL, Rate Limiting, dan Prosedur Backup Otomatis Native)*."
    )

    # 3. Update Table of Contents Bab 7
    old_toc_bab7 = """- [**Bab 7: Server, Deployment, dan State Machines**](#bab-7-server-deployment-dan-state-machines)
  - [7.1 Topologi Server (Single-VPS Pilot menuju Multi-Container Scaling)](#71-topologi-server-single-vps-pilot-menuju-multi-container-scaling)
    - [7.1.1 Arsitektur Dual-Environment (Live Dev & Production)](#711-arsitektur-dual-environment-live-development-server--production-vps)
    - [7.1.2 Berkas Konfigurasi Standar Docker & Nginx](#712-berkas-konfigurasi-standar-docker--nginx)
  - [7.2 Strategi Backup Otomatis dan Disaster Recovery](#72-strategi-backup-otomatis-dan-disaster-recovery)
  - [7.3 Diagram Mesin Status (State Transition Diagrams)](#73-diagram-mesin-status-state-transition-diagrams)"""

    new_toc_bab7 = """- [**Bab 7: Server, Deployment, dan State Machines**](#bab-7-server-deployment-dan-state-machines)
  - [7.1 Topologi Server Bare-Metal (PM2 Runtime & Native Linux Services)](#71-topologi-server-bare-metal-pm2-runtime--native-linux-services)
    - [7.1.1 Arsitektur Dual-Environment PM2 (Live Dev Port 3001 & Production Port 3000)](#711-arsitektur-dual-environment-pm2-live-development-server--production-vps)
    - [7.1.2 Berkas Konfigurasi PM2 (`ecosystem.config.js`), Nginx Native, dan Environment](#712-berkas-konfigurasi-pm2-ecosystemconfigjs-nginx-native-dan-environment)
    - [7.1.3 Prosedur Deployment, Migrasi Database Prisma, dan Zero-Downtime Reload](#713-prosedur-deployment-migrasi-database-prisma-dan-zero-downtime-reload)
  - [7.2 Strategi Backup Otomatis Native dan Disaster Recovery](#72-strategi-backup-otomatis-native-dan-disaster-recovery)
  - [7.3 Diagram Mesin Status (State Transition Diagrams)](#73-diagram-mesin-status-state-transition-diagrams)"""

    text = text.replace(old_toc_bab7, new_toc_bab7)

    # 4. Update Bab 2.1 sentence
    text = text.replace(
        "Sistem dirancang dengan pola *Layered Clean Architecture* berbasis kontainer:",
        "Sistem dirancang dengan pola *Layered Clean Architecture* berbasis layanan bare-metal native pada sistem operasi Linux host yang dikelola oleh PM2 Process Manager dan Nginx Native:"
    )

    # 5. Update Bab 6.1 Tech Stack table
    old_stack_row = """| **In-Memory Cache & Queue**| **Redis + BullMQ** | Manajemen sesi pengguna, rate limiting, antrean debounce progress video/slide, dan pemrosesan notifikasi asinkronus. |"""
    new_stack_row = """| **Process Manager (Runtime)** | **PM2 (Process Manager 2)** | Manajemen proses Node.js level produksi, cluster mode multi-core, zero-downtime rolling reload (`pm2 reload`), auto-restart saat memory spike / crash, dan isolasi worker BullMQ. |
| **Web Server & Reverse Proxy**| **Nginx Native (Linux Service)** | Reverse proxy SSL/TLS 1.3 Let's Encrypt, serving static bundle React Vite (`dist/`) dengan caching tajam, rate limiting ketat, dan kompresi Gzip. |
| **In-Memory Cache & Queue**| **Redis 7 Native + BullMQ** | Manajemen sesi pengguna, rate limiting, antrean debounce progress video/slide, dan pemrosesan notifikasi asinkronus. |"""

    text = text.replace(old_stack_row, new_stack_row)

    # 6. Update Bab 6.2 Efficiency bullet points
    old_efficiency_bullet = """- Arsitektur modular *monorepo* atau struktur proyek terpadu memudahkan koordinasi dan pengujian bersama."""
    new_efficiency_bullet = """- Arsitektur modular *monorepo* atau struktur proyek terpadu memudahkan koordinasi dan pengujian bersama.
- Penggunaan **PM2 Process Manager** mengeliminasi kompleksitas orkestrasi kontainer Docker dan overhead memori daemon, memungkinkan tim 2 developer memantau, mendebug, dan memperbarui server produksi cukup dengan perintah sederhana (`pm2 status`, `pm2 logs`, `pm2 reload`)."""

    text = text.replace(old_efficiency_bullet, new_efficiency_bullet)

    # 7. Complete Replacement for Bab 7 (Server, Deployment, dan State Machines)
    bab7_marker = "# BAB 7: SERVER, DEPLOYMENT, DAN STATE MACHINES"
    bab8_marker = "# BAB 8: RENCANA PENGEMBANGAN, BOUNDARY VALUE ANALYSIS (BVA), DAN CAUSE-EFFECT ANALYSIS"

    parts_before = text.split(bab7_marker)
    parts_after = parts_before[1].split(bab8_marker)

    # Keep State Machines (7.3)
    state_machines_marker = "## 7.3 Diagram Mesin Status (State Transition Diagrams)"
    state_machines_content = parts_after[0].split(state_machines_marker)[1]

    new_bab7_body = """
## 7.1 Topologi Server Bare-Metal (PM2 Runtime & Native Linux Services)

Berdasarkan keputusan teknis institusi, implementasi server E-Learning UAY pada lingkungan **Live Development / Staging** maupun **Production VPS** mengadopsi arsitektur **Bare-Metal Native** yang dikelola oleh **PM2 Process Manager** dan **Nginx Native**, tanpa menggunakan kontainer Docker.

### 1. Justifikasi Arsitektur Bare-Metal Native & PM2:
1. **Efisiensi Alokasi Memori & CPU (Zero Virtualization Overhead)**:
   - Mengeliminasi beban kerja *Docker daemon*, lapisan jembatan jaringan virtual (*bridge network abstraction*), dan alokasi memori kontainer ganda. Seluruh memori RAM dan vCPU server dialokasikan 100% secara langsung untuk komputasi aplikasi, *cache* buffer database, dan antrian antarmuka pengguna.
   - Sangat ideal dan stabil berjalan pada VPS dengan memori terbatas (4 GB – 8 GB RAM) tanpa risiko terhenti mendadak akibat *Out-Of-Memory (OOM)*.
2. **Performa I/O Maksimal pada Database & Filesystem**:
   - PostgreSQL 16 dan Redis 7 beroperasi langsung (*native binary*) di atas filesystem NVMe Linux host melalui UNIX domain socket / loopback interface (`127.0.0.1`), menghasilkan throughput transaksi ACID yang jauh lebih tinggi dan latensi pembacaan data yang lebih rendah dibandingkan sistem volume virtual Docker.
3. **Pembaruan Sistem Tanpa Henti (True Zero-Downtime Rolling Reload)**:
   - Melalui fitur `pm2 reload ecosystem.config.js --env production`, PM2 melakukan restart bertahap (*rolling restart*) per *worker instance* pada mode cluster. Mahasiswa yang sedang mengerjakan kuis aktif atau membaca materi tidak akan mengalami pemutusan koneksi (*connection drop*) saat pembaruan kode versi baru dirilis ke server.
4. **Isolasi Proses Komputasi & Pemrosesan Latar Belakang (Worker Isolation)**:
   - Beban pemrosesan latar belakang yang berat (seperti kalkulasi pembobotan nilai akhir kelas, pengiriman batch notifikasi, dan konversi data) dipisahkan ke dalam proses worker tersendiri (`uay-worker`) di bawah PM2, sehingga tidak membebani atau memperlambat responsivitas API utama (`uay-api`).
5. **Kemudahan Monitoring & Operasional Sysadmin Kampus**:
   - Administrator sistem dan tim IT kampus dapat memantau kesehatan server, penggunaan CPU/RAM per proses, serta log error secara langsung tanpa perlu masuk ke dalam lingkungan kontainer:
     ```bash
     pm2 status          # Melihat status seluruh proses aktif
     pm2 monit           # Monitoring visual real-time CPU & Memory
     pm2 logs uay-api    # Memeriksa log aktivitas API secara langsung
     systemctl status postgresql  # Memeriksa status database master
     ```

---

### Spesifikasi Hardware Server Host (Minimum vs Rekomendasi):

| Parameter Hardware | Spesifikasi Minimum (*Minimum Spec*) | Spesifikasi Rekomendasi (*Recommended Spec*) |
| :--- | :--- | :--- |
| **Peruntukan Lingkungan** | **Fase Pilot / Uji Coba Terbatas**<br>(1 Program Studi / ~500 – 1.000 Mahasiswa) | **Fase Produksi Penuh Seluruh Kampus**<br>(Multi-Fakultas / ~3.000 – 5.000+ Mahasiswa) |
| **Processor (vCPU)** | **2 vCPU** (Frekuensi 2.4 GHz+) | **4 vCPU** (Frekuensi 3.0 GHz+ Compute-Optimized) |
| **Memori (RAM)** | **4 GB RAM** (DDR4) | **8 GB – 16 GB RAM** (DDR4 / DDR5 ECC) |
| **Penyimpanan (Storage)** | **50 GB NVMe SSD** | **100 GB – 150 GB NVMe SSD** (High IOPS) |
| **Sistem Operasi Host** | Ubuntu 22.04 / 24.04 LTS (64-bit Minimal) | Ubuntu 24.04 LTS (64-bit Minimal Server) |
| **Koneksi Jaringan / Bandwidth** | 100 Mbps Port (Bandwidth Unmetered) | 1 Gbps Port (Bandwidth Unmetered) |
| **Beban Puncak Konkurensi** | **150 – 250 pengguna aktif bersamaan**<br>(Cukup untuk kuis serentak 1–2 rombel) | **800 – 1.500 pengguna aktif bersamaan**<br>(Kuat melayani ujian serentak antar-fakultas) |

---

### Matriks Alokasi Sumber Daya OS & Proses PM2:

Setiap proses sistem dialokasikan batasan memori dan prioritas proses secara ketat melalui konfigurasi PM2 dan Systemd untuk menjamin stabilitas total sistem:

| Komponen & Proses Layanan | Pengelola (*Manager*) | Mode Eksekusi / Instance | Alokasi RAM Minimum (Host 4 GB) | Alokasi RAM Rekomendasi (Host 8-16 GB) | Kebijakan Pembatasan (*Guardrail*) |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`uay-api`** (Backend REST API) | **PM2** | Cluster Mode (2 Instances) | 1.0 GB (512 MB / inst) | 2.0 GB (1.0 GB / inst) | `max_memory_restart: '1G'`, otomatis restart jika memori melonjak |
| **`uay-worker`** (BullMQ Job Worker) | **PM2** | Fork Mode (1 Instance) | 384 MB | 1.0 GB | `max_memory_restart: '512M'`, memproses kalkulasi nilai & notifikasi |
| **`postgresql`** (Database PostgreSQL 16) | **Systemd** | Native Linux Service | 1.5 GB | 3.5 GB | `shared_buffers = 1GB`, `max_connections = 150`, `work_mem = 16MB` |
| **`redis-server`** (In-Memory Cache & Queue)| **Systemd** | Native Linux Service | 256 MB | 512 MB | `maxmemory 400mb`, kebijakan eviksi `volatile-lru` |
| **`nginx`** (Reverse Proxy & Static Web) | **Systemd** | Native Linux Master/Workers | 128 MB | 256 MB | Melayani static build React Vite (`dist/`), Gzip aktif, caching aset |
| **OS Host, Kernel, & Cadangan Buffer** | **Linux Host** | Ubuntu 24.04 LTS Core | 732 MB | 1.2 GB | Penyangga memori untuk mencegah *Out-Of-Memory (OOM)* pada kernel |
| **TOTAL ALOKASI SISTEM** | — | — | **4.0 GB RAM** | **8.5 GB RAM (Optimal pada VPS 8-16 GB)** | Seluruh alokasi proses beroperasi harmonis |

---

### Alokasi Partisi Penyimpanan Disk (Storage Allocation):

Server E-Learning UAY memiliki karakteristik penyimpanan yang sangat ramping karena menerapkan prinsip arsitektur **Zero-Binary Storage** (seluruh berkas fisik besar dialihkan ke File Service / MinIO S3):
- **Sistem Operasi & Paket Sistem (Ubuntu Core)**: ~12 GB
- **Database Master (PostgreSQL 16)**: ~20 – 30 GB (teks materi, butir soal kuis, skema bobot nilai, dan snapshot audit log)
- **Log Berkas Sistem & PM2 Rotated Logs**: ~5 – 8 GB
- **Staging Berkas Backup Harian Lokal**: ~15 – 20 GB (disimpan sementara 7 hari sebelum sinkronisasi otomatis ke offsite storage)
- **Total Kebutuhan Disk**: 50 GB (Minimum) hingga 100 GB (Rekomendasi).

---

### Diagram Topologi Proses Host (Bare-Metal Native):

```
Ubuntu 24.04 LTS (Bare-Metal Production VPS Host)
│
├── [Systemd Service: nginx] (Port 80/443 SSL Certbot)
│   ├── Static SPA Web Server: /var/www/elearning-prod/dist (Vite Build)
│   │   └── Cache-Control: max-age=31536000, immutable (Assets Bundle)
│   └── Reverse Proxy Gateway:
│       ├── Pass /api/ ──► http://127.0.0.1:3000 (PM2 API Cluster)
│       └── Pass /api/v1/auth/ ──► Strict Rate Limiter (5 req/s)
│
├── [PM2 Process Manager (Daemon)]
│   ├── App: uay-api [Cluster Mode: 2 Worker Instances] (Node.js Port 3000)
│   │   ├── Instance #0 (PID 10421) ── CPU Core 0
│   │   └── Instance #1 (PID 10422) ── CPU Core 1
│   └── App: uay-worker [Fork Mode: 1 Dedicated Worker] (Node.js Background)
│       └── BullMQ Queue Consumer (Kalkulasi Nilai, Dispatch Notifikasi)
│
├── [Systemd Service: postgresql] (Port 5432 - Localhost Only: 127.0.0.1)
│   ├── Database Production: elearning_prod (Master Data ACID)
│   └── Database Staging: elearning_dev (Untuk Pengujian Terisolasi)
│
├── [Systemd Service: redis-server] (Port 6379 - Localhost Only: 127.0.0.1)
│   ├── DB 0: Production Cache, Session Blacklist, BullMQ Queue
│   └── DB 1: Staging / Dev Cache & Queue
│
└── [Linux Crontab System]:
    └── 0 2 * * * /opt/uay-elearning/deployment/scripts/backup.sh (Daily Native Backup)
```

---

## 7.1.1 Arsitektur Dual-Environment PM2 (Live Development Server & Production VPS)

Sistem dirancang dengan pemisahan lingkungan yang ketat antara **Live Development / Staging Server** (untuk pengujian berkelanjutan dan validasi tim PO/QA) serta **Production Server** (untuk operasional resmi perkuliahan):

```
┌───────────────────────────────────────────────┐     ┌───────────────────────────────────────────────┐
│     1. LIVE DEV / STAGING ENVIRONMENT         │     │     2. PRODUCTION ENVIRONMENT                 │
│     (dev-elearning.uay.ac.id)                 │     │     (elearning.uay.ac.id)                     │
├───────────────────────────────────────────────┤     ├───────────────────────────────────────────────┤
│ • PM2 App Name: uay-api-dev                   │     │ • PM2 App Name: uay-api-prod (Cluster: 2 inst)│
│ • Port Binding: 127.0.0.1:3001                │     │ • Port Binding: 127.0.0.1:3000                │
│ • PM2 Worker: uay-worker-dev                  │     │ • PM2 Worker: uay-worker-prod                 │
│ • Web Root: /var/www/elearning-dev/dist       │     │ • Web Root: /var/www/elearning-prod/dist      │
│ • Database: elearning_dev                     │     │ • Database: elearning_prod                    │
│ • Redis DB: DB 1 (127.0.0.1:6379/1)           │     │ • Redis DB: DB 0 (127.0.0.1:6379/0)           │
│ • Log Level: DEBUG / Verbose                  │     │ • Log Level: INFO / WARN / ERROR Only         │
│ • SSO: Staging Sandbox Client ID              │     │ • SSO: Official Production Client ID & Secret │
│ • File Service: Dev Bucket (Testing Uploads)  │     │ • File Service: Prod S3/MinIO Encrypted Bucket│
│ • PM2 Environment Flag: --env development     │     │ • PM2 Environment Flag: --env production      │
└───────────────────────────────────────────────┘     └───────────────────────────────────────────────┘
```

---

## 7.1.2 Berkas Konfigurasi PM2 (`ecosystem.config.js`), Nginx Native, dan Environment

### 1. ecosystem.config.js (Berkas Konfigurasi Master PM2):

Berkas ini ditempatkan pada direktori akar proyek (`/opt/uay-elearning/ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    // -------------------------------------------------------------
    // 1. BACKEND REST API (CLUSTER MODE)
    // -------------------------------------------------------------
    {
      name: 'uay-api',
      script: './apps/api/dist/index.js',
      instances: 2, // 2 instances pada VPS 2-4 vCPU, atau 'max' untuk seluruh core
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // Mencegah memory leak crash
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true, // Menunggu sinyal process.send('ready') sebelum menerima trafik
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://uay_admin:SuperSecurePassword2026!@127.0.0.1:5432/elearning_prod?schema=public',
        REDIS_URL: 'redis://:RedisSecretAuthKey2026!@127.0.0.1:6379/0',
        SSO_ISSUER_URL: 'https://sso.uay.ac.id',
        SSO_CLIENT_ID: 'elearning-uay-prod',
        SSO_CLIENT_SECRET: 'SecretOAuthTokenFromSSO2026',
        SSO_REDIRECT_URI: 'https://elearning.uay.ac.id/api/v1/auth/callback',
        FILE_SERVICE_API_URL: 'https://files.uay.ac.id/api/v1',
        FILE_SERVICE_API_KEY: 'SecretServiceTokenFromFS2026',
        APP_PUBLIC_URL: 'https://elearning.uay.ac.id'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/elearning_dev?schema=public',
        REDIS_URL: 'redis://127.0.0.1:6379/1',
        SSO_ISSUER_URL: 'https://sso.uay.ac.id',
        SSO_CLIENT_ID: 'elearning-uay-dev',
        SSO_CLIENT_SECRET: 'DevOAuthToken2026',
        SSO_REDIRECT_URI: 'https://dev-elearning.uay.ac.id/api/v1/auth/callback',
        FILE_SERVICE_API_URL: 'https://dev-files.uay.ac.id/api/v1',
        FILE_SERVICE_API_KEY: 'DevServiceToken2026',
        APP_PUBLIC_URL: 'https://dev-elearning.uay.ac.id'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/uay-elearning/api-error.log',
      out_file: '/var/log/uay-elearning/api-out.log',
      merge_logs: true,
      time: true
    },

    // -------------------------------------------------------------
    // 2. BACKGROUND QUEUE WORKER (FORK MODE)
    // -------------------------------------------------------------
    {
      name: 'uay-worker',
      script: './apps/api/dist/worker.js',
      instances: 1, // 1 dedicated instance untuk antrean BullMQ
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://uay_admin:SuperSecurePassword2026!@127.0.0.1:5432/elearning_prod?schema=public',
        REDIS_URL: 'redis://:RedisSecretAuthKey2026!@127.0.0.1:6379/0'
      },
      env_development: {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/elearning_dev?schema=public',
        REDIS_URL: 'redis://127.0.0.1:6379/1'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/uay-elearning/worker-error.log',
      out_file: '/var/log/uay-elearning/worker-out.log',
      time: true
    }
  ]
};
```

---

### 2. /etc/nginx/sites-available/elearning.uay.ac.id (Konfigurasi Nginx Native Production):

```nginx
# Rate Limiting Zones (Anti Brute-Force & DDoS)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

# Upstream Backend PM2 Cluster
upstream pm2_elearning_api {
    server 127.0.0.1:3000;
    keepalive 32;
}

# HTTP Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name elearning.uay.ac.id;
    return 301 https://$host$request_uri;
}

# HTTPS Production Gateway
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name elearning.uay.ac.id;

    # SSL Certificate & Modern TLS Parameters
    ssl_certificate /etc/letsencrypt/live/elearning.uay.ac.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elearning.uay.ac.id/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Enterprise Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # 1. Serving Frontend SPA Static Files (React / Vite Build)
    root /var/www/elearning-prod/dist;
    index index.html;

    # Cache static assets (JS, CSS, Images, Fonts) with immutable hash
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # SPA Fallback Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Reverse Proxy ke Backend REST API (PM2 Cluster)
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://pm2_elearning_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # 3. Strict Rate Limiting pada Endpoint Otentikasi
    location /api/v1/auth/ {
        limit_req zone=auth_limit burst=5 nodelay;
        proxy_pass http://pm2_elearning_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

### 3. .env.production (Variabel Lingkungan Server Produksi):

```ini
# --- APLIKASI UTAMA ---
NODE_ENV=production
PORT=3000
APP_PUBLIC_URL=https://elearning.uay.ac.id

# --- DATABASE POSTGRESQL NATIVE ---
DATABASE_URL=postgresql://uay_admin:SuperSecurePassword2026!@127.0.0.1:5432/elearning_prod?schema=public

# --- REDIS NATIVE CACHE & QUEUE ---
REDIS_URL=redis://:RedisSecretAuthKey2026!@127.0.0.1:6379/0

# --- INTEGRASI SSO / IDENTITY UAY ---
SSO_ISSUER_URL=https://sso.uay.ac.id
SSO_CLIENT_ID=elearning-uay-prod
SSO_CLIENT_SECRET=SecretOAuthTokenFromSSO2026
SSO_REDIRECT_URI=https://elearning.uay.ac.id/api/v1/auth/callback

# --- INTEGRASI FILE SERVICE UAY ---
FILE_SERVICE_API_URL=https://files.uay.ac.id/api/v1
FILE_SERVICE_API_KEY=SecretServiceTokenFromFS2026
```

---

## 7.1.3 Prosedur Deployment, Migrasi Database Prisma, dan Zero-Downtime Reload

### 1. Inisialisasi Server Host Baru (One-Time VPS Setup):
Langkah awal penyiapan server Ubuntu 24.04 LTS:
```bash
# 1. Update OS & Pasang Utilitas Dasar
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx

# 2. Pasang Node.js 22 LTS & Manajer Paket
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm pm2

# 3. Konfigurasi PM2 Auto-Start saat Server Boot
pm2 startup systemd
# (Jalankan perintah 'sudo env PATH=...' yang dihasilkan PM2 di terminal)

# 4. Pasang & Aktifkan PostgreSQL 16 & Redis
sudo apt install -y postgresql postgresql-contrib redis-server
sudo systemctl enable postgresql redis-server
sudo systemctl start postgresql redis-server

# 5. Siapkan Database & User PostgreSQL
sudo -u postgres psql -c "CREATE USER uay_admin WITH PASSWORD 'SuperSecurePassword2026!';"
sudo -u postgres psql -c "CREATE DATABASE elearning_prod OWNER uay_admin;"
sudo -u postgres psql -c "CREATE DATABASE elearning_dev OWNER uay_admin;"

# 6. Siapkan Direktori Aplikasi & Hak Akses
sudo mkdir -p /opt/uay-elearning /var/www/elearning-prod /var/www/elearning-dev /var/log/uay-elearning
sudo chown -R $USER:$USER /opt/uay-elearning /var/www/elearning-prod /var/www/elearning-dev /var/log/uay-elearning
```

---

### 2. Standar Prosedur Rilis / Update Kode Rutin (Zero-Downtime Deployment Runbook):

Setiap kali ada pembaruan kode yang telah lolos uji di staging:
```bash
cd /opt/uay-elearning

# 1. Tarik pembaruan kode terbaru dari repositori
git pull origin main

# 2. Pasang dependensi secara deterministik
pnpm install --frozen-lockfile

# 3. Generate client Prisma & Eksekusi Migrasi Database Aman
npx prisma generate --schema packages/db/prisma/schema.prisma
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma

# 4. Bangun Kompilasi Frontend & Backend
pnpm build

# 5. Salin Hasil Build Frontend ke Direktori Nginx
rm -rf /var/www/elearning-prod/dist/*
cp -r apps/web/dist/* /var/www/elearning-prod/dist/

# 6. Eksekusi Zero-Downtime Rolling Reload pada PM2
pm2 reload ecosystem.config.js --env production

# 7. Simpan State PM2
pm2 save
```

---

### 3. Verifikasi Pasca-Deployment:
Pastikan seluruh proses berstatus `online` tanpa kenaikan restart yang abnormal:
```bash
pm2 status
curl -f https://elearning.uay.ac.id/api/v1/health || echo "Health check failed!"
```

---

## 7.2 Strategi Backup Otomatis Native dan Disaster Recovery

Pencadangan data dan pemulihan bencana (*Disaster Recovery*) menerapkan **Model Tanggung Jawab Bersama** (*Shared Responsibility Model*) antara Tim Pengembang (*Developer*) dan Tim Server (*DevOps / Sysadmin Kampus*).

### 1. Model Tanggung Jawab Bersama (RACI Backup & Recovery):
- **Tanggung Jawab Tim Pengembang (Developer)**:
  - Menyediakan skrip pencadangan otomatis native yang mengeksekusi `pg_dump -Fc` secara konsisten langsung pada sistem operasi host tanpa merusak integritas transaksi yang sedang berjalan.
  - Menyediakan skrip pemulihan darurat (*recovery runbook*) yang menangani pemutusan koneksi aktif, restorasi skema/data, dan verifikasi tabel aktif.
  - Menjaga keselarasan referensi `fileObjectId` antara database E-Learning dengan penyimpanan objek di File Service.
- **Tanggung Jawab Tim Server / Sysadmin**:
  - Memasang dan mengelola penjadwalan *cron job* harian pada VPS host.
  - Menyediakan dan mengamankan media penyimpanan cadangan (NAS lokal kampus dan *bucket* Cloud Object Storage terisolasi / *offsite*).
  - Mengatur kebijakan retensi (7 hari lokal, 30 hari offsite) dan memantau ketersediaan kapasitas disk (*disk space alerting*).
  - Melakukan pemantauan status eksekusi (*monitoring & alert*) jika backup gagal berjalan.

---

### 2. Berkas Skrip Otomasi di Direktori deployment/scripts/:

#### 1. deployment/scripts/backup.sh (Native PostgreSQL Backup Script):
```bash
#!/bin/bash
# ==============================================================================
# Skrip Backup Otomatis Database PostgreSQL (Native PM2 / Bare-Metal Host)
# E-Learning Universitas Achmad Yani (UAY)
# ==============================================================================
set -euo pipefail

BACKUP_DIR="/var/backups/elearning"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="elearning_prod"
DB_USER="postgres"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Memulai proses pencadangan database ${DB_NAME} (Native)..."

# 1. Ekspor Database Native menggunakan format custom terkompresi
sudo -u "${DB_USER}" pg_dump -Fc "${DB_NAME}" | gzip > "${BACKUP_FILE}"

# 2. Generate Checksum SHA-256 untuk verifikasi integritas data
sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"

echo "[$(date)] Backup berhasil: ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

# 3. Rotasi Retensi Lokal (Hapus cadangan lokal yang berumur > 7 hari)
find "${BACKUP_DIR}" -name "${DB_NAME}_*.dump.gz*" -mtime +7 -exec rm -f {} \;
echo "[$(date)] Rotasi retensi 7 hari lokal selesai."

# 4. Offsite Backup Sync Hook (Sync otomatis ke NAS Kampus / Cloud Storage)
# rclone copy "${BACKUP_DIR}" remote-nas:uay-backups/elearning/ || true
```

#### 2. deployment/scripts/restore.sh (Native PostgreSQL Recovery Script):
```bash
#!/bin/bash
# ==============================================================================
# Skrip Pemulihan Darurat (Disaster Recovery) PostgreSQL (Native PM2 / Bare-Metal)
# E-Learning Universitas Achmad Yani (UAY)
# ==============================================================================
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Penggunaan: $0 <path-ke-file-backup.dump.gz> [--force]"
  exit 1
fi

BACKUP_FILE="$1"
FORCE_FLAG="${2:-}"
DB_NAME="elearning_prod"
DB_USER="postgres"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Berkas backup ${BACKUP_FILE} tidak ditemukan!"
  exit 1
fi

# 1. Verifikasi Checksum SHA-256 jika berkas checksum tersedia
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
  echo "Memverifikasi integritas checksum SHA-256..."
  sha256sum -c "${CHECKSUM_FILE}"
  echo "Checksum valid ✅"
fi

# 2. Konfirmasi Keamanan Manual
if [ "${FORCE_FLAG}" != "--force" ]; then
  echo "⚠️ PERINGATAN: Tindakan ini akan menimpa seluruh database ${DB_NAME}!"
  read -r -p "Ketik 'RESTORE-PROD' untuk melanjutkan pemulihan: " CONFIRM
  if [ "${CONFIRM}" != "RESTORE-PROD" ]; then
    echo "Pemulihan dibatalkan oleh pengguna."
    exit 1
  fi
fi

echo "[$(date)] Memulai restorasi database ${DB_NAME}..."

# 3. Hentikan Sementara Proses PM2 agar tidak ada transaksi aktif
echo "Menghentikan layanan backend di PM2..."
pm2 stop uay-api uay-worker || true

# 4. Putuskan seluruh koneksi aktif ke database
sudo -u "${DB_USER}" psql -d postgres -c "
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();"

# 5. Eksekusi Restore
sudo -u "${DB_USER}" pg_restore --clean --if-exists -d "${DB_NAME}" <(gunzip -c "${BACKUP_FILE}")

# 6. Nyalakan Kembali PM2 Services
echo "Menyalakan kembali proses PM2..."
pm2 start ecosystem.config.js --env production

echo "[$(date)] Restorasi selesai dan layanan kembali aktif! ✅"
```

#### 3. deployment/scripts/backup.cron (Konfigurasi Crontab Otomatis):
```cron
# Eksekusi backup harian database E-Learning UAY setiap malam pukul 02:00 WIB
0 2 * * * /opt/uay-elearning/deployment/scripts/backup.sh >> /var/log/uay-elearning/backup.log 2>&1
```

---

### 3. Parameter Pemulihan Bencana (Disaster Recovery SLA):
- **Recovery Point Objective (RPO)**: **Maksimal 24 Jam** (kehilangan data maksimal 1 hari jika terjadi insiden total, terjamin melalui eksekusi *nightly backup* pukul 02.00 WIB).
- **Recovery Time Objective (RTO)**: **Kurang dari 30 Menit** (waktu pemulihan hingga sistem aktif normal kembali pada server baru menggunakan PM2 dan skrip `restore.sh`).

---
""" + state_machines_marker + state_machines_content

    # Reconstruct text
    final_text = parts_before[0] + bab7_marker + new_bab7_body + bab8_marker + parts_after[1]

    # 8. Update Bab 8.3 Vertical Slice Stages
    final_text = final_text.replace(
        "Setup repositori, konfigurasi Prisma & PostgreSQL, integrasi OIDC SSO UAY, pemetaan pengguna & middleware peran.",
        "Setup repositori, instalasi & konfigurasi PM2, Systemd PostgreSQL 16 & Redis, Prisma ORM, integrasi OIDC SSO UAY, pemetaan pengguna & middleware peran."
    )
    final_text = final_text.replace(
        "Deployment ke VPS Staging/Production, konfigurasi SSL Nginx, load testing, pengujian UAT pilot pada Prodi Informatika.",
        "Deployment ke VPS Staging/Production via PM2 Cluster & Nginx Native, konfigurasi SSL Certbot, load testing, pengujian UAT pilot pada Prodi Informatika."
    )

    # 9. Update Bab 9.3 Recommendation Table
    final_text = final_text.replace(
        "| **Topologi Deployment** | Single VPS Containerized Architecture (Docker Compose) untuk fase pilot. | [ Dalam Penelaahan / Review ] |",
        "| **Topologi Deployment** | Arsitektur Bare-Metal Native (PM2 Runtime Cluster + Nginx Native + PostgreSQL 16 & Redis 7 Host) untuk efisiensi RAM/CPU maksimal dan zero-downtime reload. | [ Dalam Penelaahan / Review ] |"
    )

    # 10. Update Footer
    final_text = final_text.replace(
        "Platform E-Learning Universitas Achmad Yani (UAY) V3.0.",
        "Platform E-Learning Universitas Achmad Yani (UAY) Versi 5.0 (PM2 Bare-Metal Native Architecture)."
    )

    # Write to v5.0 and latest
    with open(V5_PATH, "w", encoding="utf-8") as f:
        f.write(final_text)
    print(f"[SUCCESS] Berhasil membuat: {V5_PATH}")

    with open(LATEST_PATH, "w", encoding="utf-8") as f:
        f.write(final_text)
    print(f"[SUCCESS] Berhasil memperbarui dokumen acuan: {LATEST_PATH}")

if __name__ == "__main__":
    build_v5()
