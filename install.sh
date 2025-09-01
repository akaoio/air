#!/bin/sh
# Air P2P Database - Stacker Installation Script
# Installs Air as a P2P database service

set -e

# Check if being installed via Stacker
if [ -z "$STACKER_PKG_NAME" ] && [ -z "$STACKER_INSTALL_MODE" ]; then
    echo "❌ ERROR: @akaoio/air can only be installed via Stacker framework"
    echo ""
    echo "Please install using:"
    echo "  stacker install gh:akaoio/air"
    echo ""
    echo "If you don't have Stacker installed:"
    echo "  curl -sSL https://raw.githubusercontent.com/akaoio/stacker/main/install.sh | sh"
    echo "  stacker install gh:akaoio/air"
    exit 1
fi

# Get package installation directory
PACKAGE_DIR="$(pwd)"
echo "Installing Air P2P Database from: $PACKAGE_DIR via Stacker..."

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js is required but not installed"
    echo "Please install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'.' -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js version 18+ required, found: $(node --version)"
    exit 1
fi

# Check npm
if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: npm is required but not installed"
    exit 1
fi

echo "✓ Node.js $(node --version) found"
echo "✓ npm $(npm --version) found"

# Create XDG-compliant directories (let stacker handle this when available)
echo "Creating XDG-compliant directories..."
AIR_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/air"
AIR_DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/air"
AIR_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/air" 
AIR_LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/air"

# Create directories efficiently  
mkdir -p "$AIR_CONFIG_DIR" "$AIR_DATA_DIR" "$AIR_CACHE_DIR" "$AIR_LOG_DIR"
echo "✓ Created XDG-compliant directories for Air"

# Install npm dependencies
echo "Installing npm dependencies..."
npm install --production --silent || {
    echo "ERROR: Failed to install npm dependencies"
    exit 1
}
echo "✓ npm dependencies installed"

# Build the project
echo "Building Air..."
if [ -f "package.json" ] && grep -q '"build"' package.json; then
    npm run build --silent || {
        echo "ERROR: Failed to build Air"
        exit 1
    }
    echo "✓ Air built successfully"
else
    echo "! No build script found, skipping build step"
fi

# Make air.sh executable
if [ -f "air.sh" ]; then
    chmod +x air.sh
    echo "✓ Made air.sh executable"
fi

# Make stacker.sh executable
if [ -f "stacker.sh" ]; then
    chmod +x stacker.sh
    echo "✓ Made stacker.sh executable"
fi

# Create default configuration
if [ ! -f "$AIR_CONFIG_DIR/air.conf" ]; then
    echo "Creating default configuration..."
    cat > "$AIR_CONFIG_DIR/air.conf" << 'EOF'
# Air P2P Database Configuration
# Port for the Air node to listen on
PORT=8765

# Host to bind to (use 0.0.0.0 for all interfaces)
HOST=localhost

# Peer URLs to connect to (comma-separated)
PEERS=

# Data directory
DATA_DIR=${AIR_DATA_DIR}

# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Enable development mode
DEV_MODE=false
EOF
    echo "✓ Created default configuration at: $AIR_CONFIG_DIR/air.conf"
fi

# Test the installation
echo "Testing Air installation..."
if [ -f "air.sh" ]; then
    if ./air.sh --help >/dev/null 2>&1; then
        echo "✓ Air installation test passed"
    else
        echo "! Air installation test failed, but continuing..."
    fi
fi

echo ""
echo "🎉 Air P2P Database installed successfully!"
echo ""
echo "Configuration directory: $AIR_CONFIG_DIR"
echo "Data directory: $AIR_DATA_DIR"
echo "Cache directory: $AIR_CACHE_DIR"
echo "Log directory: $AIR_LOG_DIR"
echo ""
echo "Next steps:"
echo "1. Enable the package: stacker enable air"
echo "2. Start Air: stacker service air start"
echo "3. Check status: stacker service air status"
echo ""
echo "For more help: ./air.sh --help"