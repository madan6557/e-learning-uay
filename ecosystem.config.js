module.exports = {
  apps: [
    {
      name: 'uay-api',
      script: './apps/api/dist/apps/api/src/index.js',
      instances: 2, // Cluster mode: 2 instances (atau 'max' untuk seluruh CPU core)
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
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
