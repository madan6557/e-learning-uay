# -*- coding: utf-8 -*-
"""
Script to generate Technical Design Document v5.0 DOCX directly from v4.0 DOCX.
Ensures ZERO obsolete references (NO OMNI) and full alignment with PM2 Bare-Metal Native architecture.
"""
from pathlib import Path
from docx import Document

ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"

V4_DOCX = DOCS_DIR / "Technical Design - E-Learning UAY - v4.0.docx"
V5_DOCX = DOCS_DIR / "Technical Design - E-Learning UAY - v5.0.docx"
LATEST_DOCX = DOCS_DIR / "Technical Design - E-Learning UAY.docx"

def update_docx():
    doc = Document(str(V4_DOCX))

    # 1. Update Subtitle on Title Page
    for p in doc.paragraphs[:5]:
        if "Versi" in p.text:
            p.text = "Versi 5.0: Arsitektur Bare-Metal Native (PM2 Runtime Cluster, Nginx Native, Systemd PostgreSQL 16 & Redis Host), Dynamic Resource Engine, Pelacakan Progress Granular, Pembobotan Nilai Otomatis, Pemetaan Prioritas P0-Pn, dan Blueprint Deployment"

    # 2. Update Table of Contents in docx
    for p in doc.paragraphs[35:55]:
        if "7.1 Topologi Server" in p.text:
            p.text = "7.1 Topologi Server Bare-Metal (PM2 Runtime dan Native Linux Services)"
        elif "7.1.1" in p.text:
            p.text = "7.1.1 Arsitektur Dual-Environment PM2 (Live Dev Port 3001 dan Production Port 3000)"
        elif "7.1.2" in p.text:
            p.text = "7.1.2 Berkas Konfigurasi PM2 (ecosystem.config.js), Nginx Native, dan Environment"

    # 3. Update Bab 2.1 sentence
    for p in doc.paragraphs[65:80]:
        if "berbasis kontainer" in p.text:
            p.text = "Sistem dirancang dengan pola Layered Clean Architecture berbasis layanan bare-metal native pada sistem operasi Linux host yang dikelola oleh PM2 Process Manager dan Nginx Native:"

    # 4. Update Bab 7 Headings and Texts
    for p in doc.paragraphs[385:460]:
        if "7.1 Topologi Server (Single-VPS" in p.text:
            p.text = "7.1 Topologi Server Bare-Metal (PM2 Runtime & Native Linux Services)"
        elif "Untuk memastikan keandalan, ketersediaan tinggi" in p.text:
            p.text = "Berdasarkan keputusan teknis institusi, implementasi server E-Learning UAY pada lingkungan Live Development / Staging maupun Production VPS mengadopsi arsitektur Bare-Metal Native yang dikelola oleh PM2 Process Manager dan Nginx Native, tanpa menggunakan kontainer Docker."
        elif "Matriks Alokasi Sumber Daya per Kontainer" in p.text:
            p.text = "Matriks Alokasi Sumber Daya OS & Proses PM2:"
        elif "Sistem Operasi & Docker Base Images" in p.text:
            p.text = "Sistem Operasi & Paket Sistem (Ubuntu Core): ~12 GB"
        elif "Diagram Topologi Kontainer Docker:" in p.text:
            p.text = "Diagram Topologi Proses Host (Bare-Metal Native):"
        elif "7.1.1 Arsitektur Dual-Environment" in p.text:
            p.text = "7.1.1 Arsitektur Dual-Environment PM2 (Live Development Server & Production VPS)"
        elif "7.1.2 Berkas Konfigurasi Standar Docker & Nginx" in p.text:
            p.text = "7.1.2 Berkas Konfigurasi PM2 (ecosystem.config.js), Nginx Native, dan Environment"
        elif "1. Dockerfile.api" in p.text:
            p.text = "1. ecosystem.config.js (Berkas Konfigurasi Master PM2):"
        elif "2. Dockerfile.web" in p.text:
            p.text = "2. /etc/nginx/sites-available/elearning.uay.ac.id (Konfigurasi Nginx Native Production):"
        elif "3. docker-compose.prod.yml" in p.text:
            p.text = "3. .env.production (Variabel Lingkungan Server Produksi):"
        elif "4. docker-compose.dev.yml" in p.text:
            p.text = "4. .env.development (Variabel Lingkungan Server Staging):"
        elif "5. .env.example" in p.text:
            p.text = "5. Prosedur Deployment, Migrasi Database Prisma, dan Zero-Downtime Reload:"
        elif "6. nginx/prod.conf" in p.text:
            p.text = "6. Verifikasi Status dan Pemantauan Layanan PM2:"
        elif "Mengekspor database PostgreSQL (elearning_uay_db) dari kontainer uay-postgres" in p.text:
            p.text = "Mengekspor database PostgreSQL (elearning_prod) secara native menggunakan sudo -u postgres pg_dump -Fc langsung di host Linux."
        elif "Melakukan pemulihan database dari berkas .dump.gz dengan satu baris perintah." in p.text:
            p.text = "Melakukan pemulihan database dari berkas .dump.gz secara native tanpa Docker dengan konfirmasi keamanan RESTORE-PROD dan pemutusan koneksi aktif."

    # 5. Update Table 24: Resource Allocation Table
    t24 = doc.tables[24]
    t24_headers = ["Komponen & Proses Layanan", "Pengelola (Manager)", "Mode Eksekusi / Instance", "Alokasi RAM Min (4 GB)", "Alokasi RAM Rekomendasi (8-16 GB)", "Kebijakan Pembatasan (Guardrail)"]
    for i, h in enumerate(t24_headers):
        t24.rows[0].cells[i].text = h
    
    t24_data = [
        ["uay-api (Backend REST API)", "PM2", "Cluster Mode (2 Instances)", "1.0 GB (512 MB/inst)", "2.0 GB (1.0 GB/inst)", "max_memory_restart: '1G', auto-restart jika memori melonjak"],
        ["uay-worker (BullMQ Job Worker)", "PM2", "Fork Mode (1 Instance)", "384 MB", "1.0 GB", "max_memory_restart: '512M', memproses kalkulasi nilai & notifikasi"],
        ["postgresql (PostgreSQL 16)", "Systemd", "Native Linux Service", "1.5 GB", "3.5 GB", "shared_buffers = 1GB, max_connections = 150, work_mem = 16MB"],
        ["redis-server (Cache & Queue)", "Systemd", "Native Linux Service", "256 MB", "512 MB", "maxmemory 400mb, kebijakan eviksi volatile-lru"],
        ["nginx (Reverse Proxy & Static)", "Systemd", "Native Linux Master/Workers", "128 MB", "256 MB", "Melayani static build React Vite (dist/), Gzip aktif, caching aset"],
        ["OS Host, Kernel, & Cadangan Buffer", "Linux Host", "Ubuntu 24.04 LTS Core", "732 MB", "1.2 GB", "Penyangga memori untuk mencegah Out-Of-Memory (OOM) pada kernel"],
        ["TOTAL ALOKASI SISTEM", "—", "—", "4.0 GB RAM", "8.5 GB RAM (Optimal pada VPS 8-16 GB)", "Seluruh alokasi proses beroperasi harmonis tanpa virtualisasi"]
    ]
    for r_idx, row_values in enumerate(t24_data, start=1):
        for c_idx, val in enumerate(row_values):
            t24.rows[r_idx].cells[c_idx].text = val

    # 6. Update Table 25: Diagram Topologi
    doc.tables[25].rows[0].cells[0].text = """Ubuntu 24.04 LTS (Bare-Metal Production VPS Host)
├── [Systemd Service: nginx] (Port 80/443 SSL Certbot)
│   ├── Static SPA Web Server: /var/www/elearning-prod/dist (Vite Build)
│   │   └── Cache-Control: max-age=31536000, immutable (Assets Bundle)
│   └── Reverse Proxy Gateway:
│       ├── Pass /api/ ──► http://127.0.0.1:3000 (PM2 API Cluster)
│       └── Pass /api/v1/auth/ ──► Strict Rate Limiter (5 req/s)
├── [PM2 Process Manager (Daemon)]
│   ├── App: uay-api [Cluster Mode: 2 Worker Instances] (Node.js Port 3000)
│   │   ├── Instance #0 (PID 10421) ── CPU Core 0
│   │   └── Instance #1 (PID 10422) ── CPU Core 1
│   └── App: uay-worker [Fork Mode: 1 Dedicated Worker] (Node.js Background)
│       └── BullMQ Queue Consumer (Kalkulasi Nilai, Dispatch Notifikasi)
├── [Systemd Service: postgresql] (Port 5432 - Localhost Only: 127.0.0.1)
│   ├── Database Production: elearning_prod (Master Data ACID)
│   └── Database Staging: elearning_dev (Untuk Pengujian Terisolasi)
├── [Systemd Service: redis-server] (Port 6379 - Localhost Only: 127.0.0.1)
│   ├── DB 0: Production Cache, Session Blacklist, BullMQ Queue
│   └── DB 1: Staging / Dev Cache & Queue
└── [Linux Crontab System]:
    └── 0 2 * * * /opt/uay-elearning/deployment/scripts/backup-native.sh (Daily Native Backup)"""

    # 7. Update Table 26: Dual-Environment Box
    doc.tables[26].rows[0].cells[0].text = """1. LIVE DEV / STAGING ENVIRONMENT (dev-elearning.uay.ac.id)
• PM2 App Name: uay-api-dev (Port 3001)
• PM2 Worker: uay-worker-dev
• Web Root: /var/www/elearning-dev/dist
• Database: elearning_dev (PostgreSQL Host)
• Redis DB: DB 1 (127.0.0.1:6379/1)
• Log Level: DEBUG / Verbose
• SSO: Staging Sandbox Client ID
• File Service: Dev Bucket (Testing Uploads)
• PM2 Environment Flag: --env development

2. PRODUCTION ENVIRONMENT (elearning.uay.ac.id)
• PM2 App Name: uay-api-prod (Cluster: 2 instances, Port 3000)
• PM2 Worker: uay-worker-prod (Fork: 1 instance)
• Web Root: /var/www/elearning-prod/dist
• Database: elearning_prod (PostgreSQL Host Master Data ACID)
• Redis DB: DB 0 (127.0.0.1:6379/0)
• Log Level: INFO / WARN / ERROR Only
• SSO: Official Production Client ID & Secret
• File Service: Prod S3/MinIO Encrypted Bucket
• PM2 Environment Flag: --env production"""

    # 8. Update Table 27: ecosystem.config.js
    doc.tables[27].rows[0].cells[0].text = """module.exports = {
  apps: [
    {
      name: 'uay-api',
      script: './apps/api/dist/apps/api/src/index.js',
      instances: 2, // Cluster mode: 2 instances pada VPS 2-4 vCPU
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
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
    {
      name: 'uay-worker',
      script: './apps/api/dist/worker.js',
      instances: 1, // Fork mode untuk antrean BullMQ
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
};"""

    # 9. Update Table 28: Nginx Native Server Block
    doc.tables[28].rows[0].cells[0].text = """limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

upstream pm2_elearning_api {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name elearning.uay.ac.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name elearning.uay.ac.id;

    ssl_certificate /etc/letsencrypt/live/elearning.uay.ac.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elearning.uay.ac.id/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root /var/www/elearning-prod/dist;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

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
    }

    location /api/v1/auth/ {
        limit_req zone=auth_limit burst=5 nodelay;
        proxy_pass http://pm2_elearning_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}"""

    # 10. Update Table 29: .env.production
    doc.tables[29].rows[0].cells[0].text = """NODE_ENV=production
PORT=3000
APP_PUBLIC_URL=https://elearning.uay.ac.id
DATABASE_URL=postgresql://uay_admin:SuperSecurePassword2026!@127.0.0.1:5432/elearning_prod?schema=public
REDIS_URL=redis://:RedisSecretAuthKey2026!@127.0.0.1:6379/0
SSO_ISSUER_URL=https://sso.uay.ac.id
SSO_CLIENT_ID=elearning-uay-prod
SSO_CLIENT_SECRET=SecretOAuthTokenFromSSO2026
SSO_REDIRECT_URI=https://elearning.uay.ac.id/api/v1/auth/callback
FILE_SERVICE_API_URL=https://files.uay.ac.id/api/v1
FILE_SERVICE_API_KEY=SecretServiceTokenFromFS2026"""

    # 11. Update Table 30: .env.development
    doc.tables[30].rows[0].cells[0].text = """NODE_ENV=development
PORT=3001
APP_PUBLIC_URL=https://dev-elearning.uay.ac.id
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/elearning_dev?schema=public
REDIS_URL=redis://127.0.0.1:6379/1
SSO_ISSUER_URL=https://sso.uay.ac.id
SSO_CLIENT_ID=elearning-uay-dev
SSO_CLIENT_SECRET=DevOAuthToken2026
SSO_REDIRECT_URI=https://dev-elearning.uay.ac.id/api/v1/auth/callback
FILE_SERVICE_API_URL=https://dev-files.uay.ac.id/api/v1
FILE_SERVICE_API_KEY=DevServiceToken2026"""

    # 12. Update Table 31: Deployment Runbook
    doc.tables[31].rows[0].cells[0].text = """# STANDAR OPERASIONAL PROSEDUR RILIS KODE (ZERO-DOWNTIME PM2 RELOAD)
cd /opt/uay-elearning
git pull origin main
pnpm install --frozen-lockfile
npx prisma generate --schema packages/db/prisma/schema.prisma
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
pnpm build
cp -r apps/web/dist/* /var/www/elearning-prod/dist/
pm2 reload ecosystem.config.js --env production
pm2 save"""

    # 13. Update Table 32: PM2 Status & Healthcheck
    doc.tables[32].rows[0].cells[0].text = """# VERIFIKASI STATUS PASCA DEPLOYMENT
pm2 status
pm2 logs uay-api --lines 20
curl -f https://elearning.uay.ac.id/api/v1/health || echo "Healthcheck Failed!"""

    # 14. Update Table 40: Recommendation Table
    t40 = doc.tables[40]
    for row in t40.rows:
        if "Topologi Deployment" in row.cells[0].text:
            row.cells[1].text = "Arsitektur Bare-Metal Native (PM2 Runtime Cluster + Nginx Native + PostgreSQL 16 & Redis 7 Host) untuk efisiensi RAM/CPU maksimal dan zero-downtime reload."

    # Save to v5.0 and latest docx
    doc.save(str(V5_DOCX))
    print(f"[SUCCESS] Berhasil membuat: {V5_DOCX}")
    doc.save(str(LATEST_DOCX))
    print(f"[SUCCESS] Berhasil memperbarui: {LATEST_DOCX}")

if __name__ == "__main__":
    update_docx()
