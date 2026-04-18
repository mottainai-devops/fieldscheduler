module.exports = {
  apps: [
    {
      name: 'field-worker-scheduler',
      script: './dist/index.js',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'financial-sync',
      script: './syncCronJob.ts',
      interpreter: 'tsx',
      cron_restart: '0 */6 * * *', // Every 6 hours
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
