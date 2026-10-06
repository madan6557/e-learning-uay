const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "elearning-uay",
      cwd: __dirname,
      script: path.join(__dirname, "apps/api/dist/apps/api/src/index.js"),
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "768M",
      min_uptime: "10s",
      max_restarts: 10,
      exp_backoff_restart_delay: 1000,
      listen_timeout: 15000,
      kill_timeout: 30000,
      wait_ready: true,
      env: {
        NODE_ENV: "production",
        API_HOST: process.env.API_HOST || "0.0.0.0",
        PORT: Number(process.env.PORT || 3001),
        TRUST_PROXY: "1",
      },
      env_production: {
        NODE_ENV: "production",
        API_HOST: process.env.API_HOST || "0.0.0.0",
        PORT: Number(process.env.PORT || 3001),
        TRUST_PROXY: "1",
      },
      time: true,
      merge_logs: true,
    },
  ],
};
