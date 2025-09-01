#!/bin/sh
# Air P2P Database - Stacker Uninstall Script
# Completely removes Air package and cleans up system

set -e

echo "Uninstalling Air P2P Database..."

# Stop Air service if running
if command -v air >/dev/null 2>&1; then
    echo "Stopping Air service..."
    air stop 2>/dev/null || echo "! Air was not running or failed to stop"
fi

# Remove air command from PATH
BIN_DIR="${HOME}/.local/bin"
AIR_BIN="$BIN_DIR/air"

if [ -L "$AIR_BIN" ] || [ -f "$AIR_BIN" ]; then
    rm -f "$AIR_BIN"
    echo "✓ Removed command: air"
fi

# Ask user about data removal
echo ""
echo "Air P2P Database has been uninstalled."
echo ""
echo "Configuration and data directories:"
echo "  Config: ${XDG_CONFIG_HOME:-$HOME/.config}/air"
echo "  Data: ${XDG_DATA_HOME:-$HOME/.local/share}/air"  
echo "  Cache: ${XDG_CACHE_HOME:-$HOME/.cache}/air"
echo "  Logs: ${XDG_STATE_HOME:-$HOME/.local/state}/air"
echo ""
echo "These directories contain your Air configuration and database."
echo "They will be preserved in case you reinstall Air later."
echo ""
echo "To manually remove all Air data, run:"
echo "  rm -rf \"${XDG_CONFIG_HOME:-$HOME/.config}/air\""
echo "  rm -rf \"${XDG_DATA_HOME:-$HOME/.local/share}/air\""
echo "  rm -rf \"${XDG_CACHE_HOME:-$HOME/.cache}/air\""
echo "  rm -rf \"${XDG_STATE_HOME:-$HOME/.local/state}/air\""
echo ""
echo "✅ Air P2P Database uninstalled successfully!"