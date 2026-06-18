#!/bin/bash
# Startup script for mottainai-fieldscheduler
# This file is committed to the repo and deployed with every build.
# It is used by PM2 to start the server.
cd /var/www/mottainai-fieldscheduler
# Load .env file if it exists (for server-side env vars)
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
exec node dist/index.js
