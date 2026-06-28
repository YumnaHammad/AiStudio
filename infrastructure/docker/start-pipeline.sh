#!/bin/sh
set -eu

echo "Starting AI pipeline (worker + renderer)..."
echo "Media root: ${LOCAL_MEDIA_DIR:-./data/media}"

trap 'kill 0 2>/dev/null || true' TERM INT

node apps/worker/dist/main.js &
WORKER_PID=$!
node apps/renderer/dist/main.js &
RENDERER_PID=$!

wait $WORKER_PID $RENDERER_PID
