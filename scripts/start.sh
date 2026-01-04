#!/bin/bash

# 自动建立软链接到 /root/.local/bin
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$( dirname "$SCRIPT_DIR" )"

mkdir -p /root/.local/bin
ln -sf "$PROJECT_DIR/bin/amp-prox" /root/.local/bin/amp-prox

echo "Initialization complete. 'amp-prox' is now available globally."
echo "Running amp-prox --version..."
amp-prox --version
