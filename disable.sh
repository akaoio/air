#!/bin/sh
# Air P2P Database - Stacker Disable Script
# Disables Air package and removes from system PATH

set -e

echo "Disabling Air P2P Database..."

# Stop Air service if running
if command -v air >/dev/null 2>&1; then
    echo "Stopping Air service if running..."
    air stop 2>/dev/null || echo "! Air was not running or failed to stop"
fi

# Remove air command from PATH
BIN_DIR="${HOME}/.local/bin"
AIR_BIN="$BIN_DIR/air"

if [ -L "$AIR_BIN" ]; then
    rm -f "$AIR_BIN"
    echo "✓ Removed command: air"
elif [ -f "$AIR_BIN" ]; then
    rm -f "$AIR_BIN"
    echo "✓ Removed file: air"
else
    echo "! 'air' command was not installed"
fi

echo ""
echo "✅ Air P2P Database disabled successfully!"
echo ""
echo "Note: Configuration and data files remain intact:"
echo "  Config: ${XDG_CONFIG_HOME:-$HOME/.config}/air"
echo "  Data: ${XDG_DATA_HOME:-$HOME/.local/share}/air"
echo ""
echo "To fully remove Air, use: stacker remove air"