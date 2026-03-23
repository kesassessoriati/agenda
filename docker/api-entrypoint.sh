#!/bin/sh
set -eu

cd /app/apps/api

echo "Running Prisma migrations..."
npx prisma migrate deploy

if [ "${RUN_PRISMA_SEED:-false}" = "true" ]; then
  echo "Running Prisma seed..."
  npx prisma db seed
fi

exec node dist/main.js
