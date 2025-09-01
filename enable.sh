#!/bin/sh
# Air P2P Database - Stacker Enable Script
# Enables Air package and integrates with system PATH

set -e

PACKAGE_DIR="$(pwd)"
echo "Enabling Air P2P Database..."

# Add air command to PATH by creating symlink
BIN_DIR="${HOME}/.local/bin"
mkdir -p "$BIN_DIR"

# Create symlink to air.sh in user's bin directory
AIR_SCRIPT="$PACKAGE_DIR/air.sh"
AIR_BIN="$BIN_DIR/air"

if [ -f "$AIR_SCRIPT" ]; then
    # Remove existing symlink if present
    [ -L "$AIR_BIN" ] && rm -f "$AIR_BIN"
    
    # Create new symlink
    ln -s "$AIR_SCRIPT" "$AIR_BIN"
    echo "✓ Created command: air -> $AIR_SCRIPT"
else
    echo "! Warning: air.sh not found at $AIR_SCRIPT"
fi

# Verify PATH includes ~/.local/bin
if echo "$PATH" | grep -q "$BIN_DIR"; then
    echo "✓ $BIN_DIR is in PATH"
else
    echo "! Warning: $BIN_DIR is not in PATH"
    echo "  Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

# Test air command
if command -v air >/dev/null 2>&1; then
    echo "✓ 'air' command is now available"
    echo ""
    echo "Try running:"
    echo "  air --help"
    echo "  air start"
    echo "  air status"
else
    echo "! 'air' command not found in PATH"
    echo "  You may need to restart your shell or run:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

echo ""
echo "✅ Air P2P Database enabled successfully!"