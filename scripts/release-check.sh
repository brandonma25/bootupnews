#!/bin/bash
set -e

echo "Running release validation..."

npm install
npm run lint || true
npm run build
npm run test

# Kill any existing dev server
pkill -f "next dev" || true

# Start dev server
npm run dev &
DEV_PID=$!

sleep 5

# Run Playwright
PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e

kill $DEV_PID || true

echo "Release check complete"