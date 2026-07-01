// Example PM2 config for a relay client deployment.
// secrets are NOT embedded; they rely on PM2 daemon env inheritance
// regenerate with: bash generate-ecosystems.sh --force
module.exports = {
  apps: [{
    name: 'telegram-web-relay-client',
    script: 'serve.cjs',
    cwd: './',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    merge_logs: true,
    env: { NODE_ENV: 'production', PORT: '9091' }
  }]
};
