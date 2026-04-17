#!/bin/bash
set -e

echo "Running standardized local release gate..."
npm run release:local "$@"
