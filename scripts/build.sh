#!/bin/bash
set -euo pipefail

echo "Building multisig-verifier..."
npx webpack --config webpack.config.js --mode production

echo ""
echo "Generating build hash..."
bash "$(dirname "$0")/generate-hash.sh"
