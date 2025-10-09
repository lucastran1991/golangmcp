module.exports = {
  apps: [
    {
      name: 'golangmcp-backend',
      cwd: '/opt/golangmcp/backend',
      script: './main',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        GIN_MODE: 'release'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
        GIN_MODE: 'release'
      },
      log_file: '/var/log/pm2/golangmcp-backend.log',
      out_file: '/var/log/pm2/golangmcp-backend-out.log',
      error_file: '/var/log/pm2/golangmcp-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs']
    },
    {
      name: 'golangmcp-frontend',
      cwd: '/opt/golangmcp/frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'http://localhost:8080'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'http://localhost:8080'
      },
      log_file: '/var/log/pm2/golangmcp-frontend.log',
      out_file: '/var/log/pm2/golangmcp-frontend-out.log',
      error_file: '/var/log/pm2/golangmcp-frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', '.next', 'logs']
    }
  ]
};
