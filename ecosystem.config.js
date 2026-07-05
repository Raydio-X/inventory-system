module.exports = {
  apps: [
    {
      name: 'inventory-api',
      script: 'app.js',
      cwd: '/var/www/inventory-api',
      env_file: '.env.production',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      error_file: '/var/log/inventory-api-error.log',
      out_file: '/var/log/inventory-api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      time: true
    }
  ]
};
