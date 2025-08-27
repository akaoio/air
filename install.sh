#!/bin/sh
# Air installation using Manager framework
# Follows Access pattern: shell foundation with TypeScript coordination

set -e

# Check if Manager framework is available
check_manager() {
    # Check if manager is installed in the system
    if [ -d "/usr/local/lib/manager" ]; then
        MANAGER_DIR="/usr/local/lib/manager"
        return 0
    fi
    
    # Check if manager is in user's home
    if [ -d "$HOME/manager" ]; then
        MANAGER_DIR="$HOME/manager"
        return 0
    fi
    
    # Check if manager is in local directory (workspace mode)
    if [ -d "./manager" ]; then
        MANAGER_DIR="./manager"
        return 0
    fi
    
    # Check if manager is in parent projects directory (workspace mode)
    if [ -d "../manager" ]; then
        MANAGER_DIR="../manager"
        return 0
    fi
    
    # Manager not found - need to clone it
    echo "Manager framework not found. Installing..."
    git clone https://github.com/akaoio/manager.git "$HOME/manager" || {
        echo "Failed to install Manager framework"
        exit 1
    }
    MANAGER_DIR="$HOME/manager"
}

# Load Manager framework
check_manager
. "$MANAGER_DIR/manager.sh"

# Display header
manager_header() {
    echo "=================================================="
    echo "  Air - Distributed P2P Database System v2.1.0"
    echo "  TypeScript | Real-time Sync | Manager-Powered"
    echo "=================================================="
    echo ""
}

# Main installation
main() {
    manager_header
    
    # Initialize Manager for Air
    manager_init "air" \
                 "https://github.com/akaoio/air.git" \
                 "npm run start" \
                 "Distributed P2P Database System"
    
    # Parse command line arguments
    USE_SERVICE=false
    USE_CRON=false
    USE_AUTO_UPDATE=false
    USE_MONITORING=true
    USE_P2P_DISCOVERY=false
    CRON_INTERVAL=5
    AIR_PORT=8765
    SHOW_HELP=false
    
    for arg in "$@"; do
        case "$arg" in
            --service|--systemd)
                USE_SERVICE=true
                ;;
            --cron)
                USE_CRON=true
                ;;
            --auto-update)
                USE_AUTO_UPDATE=true
                ;;
            --p2p-discovery)
                USE_P2P_DISCOVERY=true
                ;;
            --no-monitoring)
                USE_MONITORING=false
                ;;
            --port=*)
                AIR_PORT="${arg#*=}"
                ;;
            --interval=*)
                CRON_INTERVAL="${arg#*=}"
                USE_CRON=true
                ;;
            --redundant)
                USE_SERVICE=true
                USE_CRON=true
                ;;
            --help|-h)
                SHOW_HELP=true
                ;;
            *)
                manager_warn "Unknown option: $arg"
                ;;
        esac
    done
    
    if [ "$SHOW_HELP" = true ]; then
        cat << 'EOF'
Air Installation - Manager Framework Edition

Options:
  --service         Setup systemd service (system or user level)
  --cron            Setup cron job for periodic monitoring
  --interval=N      Cron interval in minutes (default: 5)
  --redundant       Both service and cron (recommended for P2P)
  --p2p-discovery   Enable P2P peer discovery features
  --no-monitoring   Disable network monitoring
  --port=N          Air server port (default: 8765)
  --auto-update     Enable weekly auto-updates
  --help            Show this help

Examples:
  ./install-with-manager.sh --redundant --auto-update
  ./install-with-manager.sh --service --p2p-discovery --port=8766
  ./install-with-manager.sh --cron --interval=3 --no-monitoring

The Manager framework handles:
  ✓ XDG-compliant directory creation
  ✓ Clean clone architecture
  ✓ Automatic sudo/non-sudo detection
  ✓ Systemd service creation (system or user)
  ✓ Cron job setup with proper scheduling
  ✓ Auto-update configuration
  ✓ TypeScript build process management
  ✓ P2P network monitoring

EOF
        exit 0
    fi
    
    # Build installation arguments
    INSTALL_ARGS=""
    [ "$USE_SERVICE" = true ] && INSTALL_ARGS="$INSTALL_ARGS --service"
    [ "$USE_CRON" = true ] && INSTALL_ARGS="$INSTALL_ARGS --cron --interval=$CRON_INTERVAL"
    [ "$USE_AUTO_UPDATE" = true ] && INSTALL_ARGS="$INSTALL_ARGS --auto-update"
    
    # Default to service mode for P2P database reliability
    if [ "$USE_SERVICE" = false ] && [ "$USE_CRON" = false ]; then
        manager_log "No automation specified, defaulting to systemd service (recommended for P2P)"
        INSTALL_ARGS="--service"
        USE_SERVICE=true
    fi
    
    # Pre-installation: ensure Node.js and npm are available
    setup_nodejs_dependencies
    
    # Run Manager installation
    manager_log "Installing Air with Manager framework..."
    manager_install $INSTALL_ARGS || {
        manager_error "Installation failed"
        exit 1
    }
    
    # Air-specific setup
    setup_air_configuration
    setup_typescript_build
    
    # Handle Air-specific features
    if [ "$USE_P2P_DISCOVERY" = true ]; then
        setup_p2p_discovery
    fi
    
    if [ "$USE_MONITORING" = true ]; then
        setup_air_monitoring
    fi
    
    # Show completion summary
    show_summary
}

# Setup Node.js dependencies
setup_nodejs_dependencies() {
    manager_log "Checking Node.js dependencies..."
    
    # Check for Node.js
    if ! command -v node > /dev/null 2>&1; then
        manager_warn "Node.js not found - installing via package manager"
        manager_install_package "nodejs npm"
    fi
    
    # Check for npm
    if ! command -v npm > /dev/null 2>&1; then
        manager_warn "npm not found - installing"
        manager_install_package "npm"
    fi
    
    manager_log "✓ Node.js dependencies verified"
}

# Setup TypeScript build process
setup_typescript_build() {
    manager_log "Setting up TypeScript build process..."
    
    # Navigate to clean clone directory
    cd "$MANAGER_CLEAN_CLONE_DIR" || {
        manager_error "Failed to access clean clone directory"
        exit 1
    }
    
    # Install dependencies
    manager_log "Installing npm dependencies..."
    npm install || {
        manager_error "Failed to install npm dependencies"
        exit 1
    }
    
    # Build the project
    manager_log "Building Air TypeScript project..."
    npm run build || {
        manager_error "Failed to build Air project"
        exit 1
    }
    
    manager_log "✓ TypeScript build completed"
}

# Setup Air configuration
setup_air_configuration() {
    manager_log "Setting up Air configuration..."
    
    # Config directory already created by Manager during installation
    CONFIG_FILE="$MANAGER_CONFIG_DIR/config.json"
    
    # Create initial Air configuration if it doesn't exist
    if [ ! -f "$CONFIG_FILE" ]; then
        cat > "$CONFIG_FILE" << EOF
{
  "name": "air",
  "env": "production",
  "port": ${AIR_PORT},
  "host": "0.0.0.0",
  "manager": {
    "enabled": true,
    "autoUpdate": ${USE_AUTO_UPDATE:-false},
    "serviceMode": "${USE_SERVICE:+systemd}${USE_CRON:+cron}",
    "monitoringEnabled": ${USE_MONITORING:-true},
    "updateInterval": ${CRON_INTERVAL}
  },
  "production": {
    "port": ${AIR_PORT},
    "domain": "localhost",
    "peers": []
  }
}
EOF
        manager_log "✓ Initial Air configuration created"
    else
        manager_log "✓ Existing configuration preserved"
    fi
}

# Setup P2P discovery features
setup_p2p_discovery() {
    manager_log "Setting up P2P discovery..."
    
    # Create P2P discovery script
    discovery_script="$MANAGER_INSTALL_DIR/air-p2p-discovery"
    
    cat > "$discovery_script" << 'EOF'
#!/bin/sh
# Air P2P Discovery - Manager Framework Integration
# Discovers and connects to Air P2P peers

source "$(dirname "$0")/manager/manager.sh" 2>/dev/null || {
    echo "Manager framework not available"
    exit 1
}

AIR_PORT=${AIR_PORT:-8765}
CONFIG_FILE="${MANAGER_CONFIG_DIR:-$HOME/.config/air}/config.json"

# Discover peers on local network
discover_peers() {
    manager_log "Discovering Air P2P peers on port $AIR_PORT..."
    
    # Simple network scan for Air peers
    for i in $(seq 1 254); do
        ip="192.168.1.$i"
        if curl -s --connect-timeout 2 "http://$ip:$AIR_PORT" > /dev/null 2>&1; then
            echo "Found Air peer: $ip:$AIR_PORT"
        fi &
    done
    wait
}

# Add peer to configuration
add_peer() {
    peer_url="$1"
    if [ -f "$CONFIG_FILE" ]; then
        # Add peer to config (simplified - would need proper JSON editing)
        manager_log "Adding peer: $peer_url"
        echo "Peer discovered: $peer_url" >> "${MANAGER_DATA_DIR}/discovered-peers.log"
    fi
}

discover_peers
EOF
    
    chmod +x "$discovery_script"
    
    # Copy to installation directory
    if [ -w "$MANAGER_INSTALL_DIR" ]; then
        cp "$discovery_script" "$MANAGER_INSTALL_DIR/"
    else
        sudo cp "$discovery_script" "$MANAGER_INSTALL_DIR/"
    fi
    
    manager_log "✓ P2P discovery enabled"
    manager_log "  Command: air-p2p-discovery"
}

# Setup Air network monitoring
setup_air_monitoring() {
    manager_log "Setting up Air network monitoring..."
    
    # Create Air monitoring script
    monitor_script="$MANAGER_DATA_DIR/air-monitor"
    
    cat > "$monitor_script" << EOF
#!/bin/sh
# Air Network Monitor - Manager Framework Integration
# Monitors Air P2P network health

source "$MANAGER_DIR/manager.sh"

AIR_PORT=${AIR_PORT}
AIR_PID_FILE="\$MANAGER_STATE_DIR/air.pid"

# Check if Air process is running
if [ -f "\$AIR_PID_FILE" ] && kill -0 "\$(cat "\$AIR_PID_FILE")" 2>/dev/null; then
    manager_log "Air process running (PID: \$(cat "\$AIR_PID_FILE"))"
else
    manager_warn "Air process not running - attempting restart"
    manager_service_restart "air"
    exit 1
fi

# Check port connectivity
if ! netstat -ln 2>/dev/null | grep ":\$AIR_PORT" > /dev/null; then
    manager_error "Air port \$AIR_PORT not listening"
    exit 1
fi

# Check peer connections (if endpoint available)
PEERS=\$(curl -s "http://localhost:\$AIR_PORT/peers" 2>/dev/null | wc -l || echo "0")
manager_log "Air network healthy - \$PEERS peer connections, port \$AIR_PORT active"
EOF
    
    chmod +x "$monitor_script"
    
    # Setup cron job for monitoring if using cron
    if [ "$USE_CRON" = true ]; then
        manager_cron_add "*/5 * * * *" "$monitor_script" "Air Network Monitor"
        manager_log "✓ Air network monitoring cron job added"
    fi
    
    manager_log "✓ Air network monitoring setup complete"
}

# Show completion summary
show_summary() {
    echo ""
    echo "=================================================="
    echo "  Air Installation Complete (Manager-Powered)"
    echo "=================================================="
    echo ""
    
    echo "📁 File Locations (XDG Compliant via Manager):"
    echo "   Config:      ~/.config/air/config.json"
    echo "   Data & Logs: ~/.local/share/air/"
    echo "   State Files: ~/.local/state/air/"
    echo "   Clean Clone: ~/air/"
    echo ""
    
    echo "🚀 Quick Start:"
    echo "   cd ~/air && npm run start    # Start Air server"
    echo "   curl http://localhost:$AIR_PORT   # Test connectivity"
    echo ""
    
    if [ "$USE_SERVICE" = true ]; then
        manager_show_service_commands "air"
        echo "   Service logs: journalctl -u air --follow"
        echo ""
    fi
    
    if [ "$USE_CRON" = true ]; then
        echo "⏰ Cron Monitoring:"
        echo "   Network check every $CRON_INTERVAL minutes"
        echo "   View logs: tail -f ~/.local/share/air/monitor.log"
        echo ""
    fi
    
    if [ "$USE_P2P_DISCOVERY" = true ]; then
        echo "🌐 P2P Discovery:"
        echo "   air-p2p-discovery      # Find and connect to peers"
        echo "   Peer logs: ~/.local/share/air/discovered-peers.log"
        echo ""
    fi
    
    echo "🔧 Manager Integration:"
    echo "   TypeScript builds managed automatically"
    echo "   XDG-compliant directory structure"
    echo "   Cross-platform package manager support"
    echo "   Unified service management"
    echo "   Built-in network monitoring"
    echo ""
    
    echo "🌐 Air P2P Network:"
    echo "   Port: $AIR_PORT (default: 8765)"
    echo "   Protocol: HTTP + WebSockets"
    echo "   Database: GUN distributed P2P"
    echo "   Config: ~/.config/air/config.json"
    echo ""
    
    manager_log "Air P2P database is ready!"
}

# Run main installation
main "$@"