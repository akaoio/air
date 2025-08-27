#!/bin/sh
# Air - Manager-powered P2P Database Management
# Following Access philosophy: Manager handles all shell operations

set -e

# Framework initialization
MANAGER_DIR="${MANAGER_DIR:-./manager}"

# Check if Manager is available
if [ ! -f "$MANAGER_DIR/manager.sh" ]; then
    echo "Error: Manager framework not found at $MANAGER_DIR"
    echo "Please ensure Manager is properly installed"
    exit 1
fi

# Load Manager framework
. "$MANAGER_DIR/manager.sh"

# Initialize Manager for Air
manager_init "air" \
             "https://github.com/akaoio/air.git" \
             "node dist/main.js" \
             "Air Distributed P2P Database"

# Air-specific configuration
AIR_PORT="${AIR_PORT:-8765}"
AIR_HOST="${AIR_HOST:-0.0.0.0}"
AIR_ENV="${AIR_ENV:-production}"

# Check if Air is running using Manager's process management
air_is_running() {
    if [ -f "$MANAGER_STATE_DIR/air.pid" ]; then
        local pid=$(cat "$MANAGER_STATE_DIR/air.pid")
        kill -0 "$pid" 2>/dev/null
    else
        false
    fi
}

# Start Air using Manager patterns
air_start() {
    if air_is_running; then
        manager_log "Air is already running"
        return 0
    fi
    
    manager_log "Starting Air P2P database..."
    
    # Ensure we're in the clean clone directory
    cd "$MANAGER_CLEAN_CLONE_DIR" || {
        manager_error "Clean clone directory not found: $MANAGER_CLEAN_CLONE_DIR"
        return 1
    }
    
    # Check if built artifacts exist
    if [ ! -f "dist/main.js" ]; then
        manager_log "Building Air TypeScript project..."
        npm run build || {
            manager_error "Failed to build Air project"
            return 1
        }
    fi
    
    # Start the process in background and save PID
    nohup node dist/main.js > "$MANAGER_DATA_DIR/air.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$MANAGER_STATE_DIR/air.pid"
    
    # Wait a moment and check if process started successfully
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        manager_log "Air started successfully (PID: $pid)"
        manager_log "Port: $AIR_PORT | Config: $MANAGER_CONFIG_DIR/config.json"
        return 0
    else
        manager_error "Failed to start Air"
        rm -f "$MANAGER_STATE_DIR/air.pid"
        return 1
    fi
}

# Stop Air using Manager patterns
air_stop() {
    if ! air_is_running; then
        manager_log "Air is not running"
        return 0
    fi
    
    local pid=$(cat "$MANAGER_STATE_DIR/air.pid")
    manager_log "Stopping Air P2P database (PID: $pid)..."
    
    # Graceful shutdown
    kill "$pid" 2>/dev/null || true
    sleep 3
    
    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        manager_warn "Graceful shutdown failed, forcing termination..."
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi
    
    rm -f "$MANAGER_STATE_DIR/air.pid"
    
    if ! air_is_running; then
        manager_log "Air stopped successfully"
        return 0
    else
        manager_error "Failed to stop Air"
        return 1
    fi
}

# Restart Air
air_restart() {
    manager_log "Restarting Air P2P database..."
    air_stop
    sleep 2
    air_start
}

# Show Air status using Manager patterns
air_status() {
    echo "=============================================="
    echo "  Air P2P Database Status (Manager-Powered)"
    echo "=============================================="
    echo ""
    
    # Process status
    if air_is_running; then
        local pid=$(cat "$MANAGER_STATE_DIR/air.pid")
        manager_log "Air is running (PID: $pid)"
        
        # Show network status
        if command -v netstat >/dev/null 2>&1; then
            if netstat -ln 2>/dev/null | grep ":$AIR_PORT " >/dev/null; then
                echo "  🌐 Port $AIR_PORT: Active"
            else
                echo "  ⚠️  Port $AIR_PORT: Not listening"
            fi
        fi
        
        # Show configuration
        if [ -f "$MANAGER_CONFIG_DIR/config.json" ]; then
            echo "  📄 Config: $MANAGER_CONFIG_DIR/config.json"
            if command -v jq >/dev/null 2>&1; then
                local port=$(jq -r '.port // "8765"' "$MANAGER_CONFIG_DIR/config.json" 2>/dev/null)
                local env=$(jq -r '.env // "production"' "$MANAGER_CONFIG_DIR/config.json" 2>/dev/null)
                echo "  ⚙️  Environment: $env | Port: $port"
            fi
        fi
    else
        manager_error "Air is not running"
        return 1
    fi
    
    # Show Manager-managed directories
    echo ""
    echo "📁 Manager Directories:"
    echo "  Config: $MANAGER_CONFIG_DIR"
    echo "  Data:   $MANAGER_DATA_DIR"
    echo "  State:  $MANAGER_STATE_DIR"
    echo "  Clone:  $MANAGER_CLEAN_CLONE_DIR"
    
    return 0
}

# Show Air logs using Manager patterns
air_logs() {
    local log_file="$MANAGER_DATA_DIR/air.log"
    
    if [ -f "$log_file" ]; then
        manager_log "Following Air logs..."
        tail -f "$log_file"
    else
        manager_error "Log file not found: $log_file"
        return 1
    fi
}

# Show Air configuration
air_config() {
    local config_file="$MANAGER_CONFIG_DIR/config.json"
    
    if [ -f "$config_file" ]; then
        if command -v jq >/dev/null 2>&1; then
            jq '.' "$config_file"
        else
            cat "$config_file"
        fi
    else
        manager_error "Configuration file not found: $config_file"
        manager_log "To create initial config, run: air install"
        return 1
    fi
}

# Install Air using Manager framework
air_install() {
    manager_log "Installing Air using Manager framework..."
    
    # Parse installation arguments
    local install_args=""
    local show_help=false
    
    for arg in "$@"; do
        case "$arg" in
            --service|--systemd)
                install_args="$install_args --service"
                ;;
            --cron)
                install_args="$install_args --cron"
                ;;
            --auto-update)
                install_args="$install_args --auto-update"
                ;;
            --redundant)
                install_args="$install_args --redundant"
                ;;
            --help|-h)
                show_help=true
                ;;
            --interval=*)
                install_args="$install_args $arg"
                ;;
        esac
    done
    
    if [ "$show_help" = true ]; then
        echo "Air Installation Options:"
        echo "  --service         Setup systemd service"
        echo "  --cron            Setup cron monitoring"
        echo "  --redundant       Both systemd and cron (recommended)"
        echo "  --auto-update     Enable weekly auto-updates"
        echo "  --interval=N      Cron interval in minutes (default: 5)"
        echo "  --help            Show this help"
        return 0
    fi
    
    # Default to service mode for P2P reliability
    if [ -z "$install_args" ]; then
        install_args="--service"
    fi
    
    # Run Manager installation
    manager_install $install_args || {
        manager_error "Installation failed"
        return 1
    }
    
    # Build Air TypeScript project
    cd "$MANAGER_CLEAN_CLONE_DIR" && npm run build || {
        manager_error "Failed to build Air project"
        return 1
    }
    
    manager_log "Air installation completed successfully"
    return 0
}

# Update Air using Manager framework  
air_update() {
    manager_log "Updating Air using Manager framework..."
    
    # Navigate to clean clone
    cd "$MANAGER_CLEAN_CLONE_DIR" || {
        manager_error "Clean clone directory not found"
        return 1
    }
    
    # Git update
    if [ -d ".git" ]; then
        git fetch origin || manager_warn "Git fetch failed"
        git pull origin main || git pull origin master || manager_warn "Git pull failed"
    fi
    
    # NPM update and rebuild
    npm update || manager_warn "NPM update failed"
    npm run build || {
        manager_error "Build failed after update"
        return 1
    }
    
    # Restart if currently running
    if air_is_running; then
        manager_log "Restarting Air to apply updates..."
        air_restart
    fi
    
    manager_log "Air update completed successfully"
    return 0
}

# Show version information
air_version() {
    echo "Air P2P Database (Manager Edition)"
    echo "Manager Framework: v$(manager_version | grep -o 'v[0-9.]*')"
    echo ""
    
    if [ -f "$MANAGER_CLEAN_CLONE_DIR/package.json" ]; then
        if command -v jq >/dev/null 2>&1; then
            local air_version=$(jq -r '.version // "unknown"' "$MANAGER_CLEAN_CLONE_DIR/package.json" 2>/dev/null)
            echo "Air Version: $air_version"
        fi
    fi
}

# Main command handler following Access style
case "${1:-help}" in
    start)
        air_start
        ;;
    stop)
        air_stop
        ;;
    restart)
        air_restart
        ;;
    status)
        air_status
        ;;
    logs)
        air_logs
        ;;
    config)
        air_config
        ;;
    install)
        shift
        air_install "$@"
        ;;
    update)
        air_update
        ;;
    version)
        air_version
        ;;
    help|--help|-h)
        echo ""
        echo "=============================================="
        echo "  Air P2P Database v2.1.0 (Manager Edition)"
        echo "=============================================="
        echo ""
        echo "🚀 Usage:"
        echo "  air start              Start Air P2P database"
        echo "  air stop               Stop Air P2P database" 
        echo "  air restart            Restart Air P2P database"
        echo "  air status             Show Air status and health"
        echo "  air logs               Follow Air logs"
        echo "  air config             Show current configuration"
        echo "  air install [options]  Install Air with Manager"
        echo "  air update             Update Air to latest version"
        echo "  air version            Show version information"
        echo "  air help               Show this help"
        echo ""
        echo "📦 Installation Options:"
        echo "  --service         Setup systemd service (recommended)"
        echo "  --cron            Setup cron monitoring"  
        echo "  --redundant       Both systemd and cron"
        echo "  --auto-update     Enable weekly auto-updates"
        echo ""
        echo "🔧 Manager Integration:"
        echo "  ✅ XDG-compliant directories"
        echo "  ✅ Clean clone architecture"
        echo "  ✅ TypeScript build management"
        echo "  ✅ Cross-platform compatibility"
        echo "  ✅ Unified service management"
        echo ""
        echo "📁 Directories:"
        echo "  Config: ~/.config/air/"
        echo "  Data:   ~/.local/share/air/"
        echo "  State:  ~/.local/state/air/"
        echo "  Clone:  ~/air/"
        echo ""
        echo "🌐 Philosophy:"
        echo "  Manager handles all system operations for consistency"
        echo "  and reliability across the AKAO technology stack."
        echo ""
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run 'air help' for usage information"
        exit 1
        ;;
esac