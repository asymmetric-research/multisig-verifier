#!/bin/bash
set -euo pipefail

DIST_DIR="$(dirname "$0")/../dist"

if [ ! -d "$DIST_DIR" ]; then
  echo "Error: dist/ directory not found. Run 'npm run build' first."
  exit 1
fi

# Hash ALL files in dist/ (sorted for determinism)
HASH=$(find "$DIST_DIR" -type f | sort | xargs cat | shasum -a 256 | awk '{print $1}')

echo "SHA-256: $HASH"
echo ""
echo "Verify by running:"
echo "  find dist -type f | sort | xargs cat | shasum -a 256"
