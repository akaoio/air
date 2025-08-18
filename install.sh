#!/bin/bash

echo "
╔══════════════════════════════════════════════════════════════╗
║                    Air Installation                          ║
║                                                              ║
║  The bash installer has been replaced with a new Node.js    ║
║  installer that provides better features:                   ║
║                                                              ║
║  • Static IP configuration (auto-detect & setup)            ║
║  • Interactive UI with validation                           ║
║  • Better error handling                                    ║
║  • Cross-platform support                                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"

# Check if Node.js is installed
if command -v node &> /dev/null; then
    echo "Starting new installer..."
    echo ""
    
    # Check if npm packages are installed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Run the new installer
    node installer.js "$@"
else
    echo "Node.js is not installed. Please install Node.js first:"
    echo "  sudo apt install nodejs npm"
    echo ""
    echo "Or use the legacy bash installer:"
    echo "  ./install-legacy.sh"
    exit 1
fi