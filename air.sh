#!/bin/sh
# Air - Modular P2P Database Management System
# Version: 0.0.1
# Following Stacker/Access philosophy: Modular, clean, maintainable

set -e

# Detect script location
SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH" 2>/dev/null || readlink "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# Load Stacker framework (now provides all core functionality)
if ! command -v stacker >/dev/null 2>&1; then
    echo "ERROR: Stacker framework required but not found" >&2
    echo "Install: curl -sSL https://raw.githubusercontent.com/akaoio/stacker/main/install.sh | sh" >&2
    exit 1
fi

# Initialize Air with Stacker framework
export AIR_VERSION="0.0.1"
export AIR_HOME="$SCRIPT_DIR"

# Use stacker XDG directory creation if available
if command -v stacker_require >/dev/null 2>&1 && stacker_require "core" 2>/dev/null; then
    export STACKER_TECH_NAME="air"
    if stacker_create_xdg_dirs 2>/dev/null; then
        # Use stacker-created directories
        export AIR_CONFIG_DIR="$STACKER_CONFIG_DIR"
        export AIR_DATA_DIR="$STACKER_DATA_DIR"
        export AIR_STATE_DIR="$STACKER_STATE_DIR"
    fi
fi

# Fallback to manual XDG setup if stacker not available
if [ -z "$AIR_CONFIG_DIR" ]; then
    export AIR_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/air"
    export AIR_DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/air"
    export AIR_STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/air"
    # Create required directories manually
    mkdir -p "$AIR_CONFIG_DIR" "$AIR_DATA_DIR" "$AIR_STATE_DIR"
fi

export AIR_PID_FILE="$AIR_STATE_DIR/air.pid"

# Load remaining Air-specific modules
export AIR_MODULE_DIR="$SCRIPT_DIR/modules"

# Utility functions for Air
# Unified logging - use stacker if available, fallback to local
if command -v stacker_log >/dev/null 2>&1; then
    air_log() { stacker_log "$*"; }
    air_error() { stacker_error "$*"; }
    air_warn() { stacker_warn "$*"; }  
    air_info() { stacker_info "$*"; }
    air_success() { stacker_log "SUCCESS: $*"; }
else
    # Fallback logging when stacker not available
    air_log() { printf "[Air] %s\n" "$*"; }
    air_error() { printf "[Air ERROR] %s\n" "$*" >&2; }
    air_warn() { printf "[Air WARN] %s\n" "$*" >&2; }
    air_info() { printf "[Air INFO] %s\n" "$*"; }
    air_success() { printf "[Air SUCCESS] %s\n" "$*"; }
fi

# Command processing
air_main() {
    local command="$1"
    shift
    
    case "$command" in
        daemon)
            # Daemon mode for systemd service
            air_info "Starting Air in daemon mode..."
            
            # Ensure we're in the Air directory and built
            cd "$AIR_HOME" || {
                air_error "Air home directory not found: $AIR_HOME"
                exit 1
            }
            
            if ! air_validate_env; then
                if [ -f "package.json" ] && command -v npm >/dev/null 2>&1; then
                    air_info "Building Air TypeScript project..."
                    npm run build || {
                        air_error "Failed to build Air project"
                        exit 1
                    }
                else
                    air_error "Cannot build - npm not available"
                    exit 1
                fi
            fi
            
            # Get port from config or use default
            local port="${AIR_PORT:-$(air_config_get port)}"
            port="${port:-8765}"
            
            # Start the Node.js process directly (systemd will manage it)
            exec node dist/main.js
            ;;
        
        start)
            air_start_service "$@"
            ;;
            
        stop)
            air_stop_service "$@"
            ;;
            
        restart)
            air_restart_service "$@"
            ;;
            
        status)
            air_status_service "$@"
            ;;
            
        logs|log)
            air_show_logs "$@"
            ;;
            
        config)
            air_config "$@"
            ;;
            
        network)
            if [ -f "$AIR_MODULE_DIR/network.sh" ]; then
                . "$AIR_MODULE_DIR/network.sh"
                shift
                case "$1" in
                    health) air_network_health ;;
                    info)   air_network_info ;;
                    scan)   air_scan_local ;;
                    peers)  air_peers_list ;;
                    *)      air_network_info ;;
                esac
            else
                echo "ERROR: Network module not available" >&2
                exit 1
            fi
            ;;
            
        install)
            # Use Stacker for installation
            air_stacker_install "$@"
            ;;
            
        service)
            # Service management integration with Stacker
            if command -v stacker_require >/dev/null 2>&1; then
                export STACKER_TECH_NAME="air"
                export STACKER_SERVICE_DESCRIPTION="Air P2P Database Service"
                export STACKER_INSTALL_DIR="${STACKER_INSTALL_DIR:-/home/x/.local/bin}"
                export STACKER_CLEAN_CLONE_DIR="$AIR_HOME"
                export STACKER_SERVICE_TYPE="simple"
                export STACKER_PID_FILE="$AIR_PID_FILE"
                
                # Load service module
                if stacker_require "service" 2>/dev/null; then
                    case "${1:-help}" in
                        setup|install)
                            # Use specialized Node.js service setup
                            stacker_setup_nodejs_service
                            ;;
                        start)
                            stacker_start_service
                            ;;
                        stop)
                            stacker_stop_service
                            ;;
                        restart)
                            stacker_restart_service
                            ;;
                        status)
                            stacker_service_status
                            ;;
                        enable)
                            stacker_enable_service
                            ;;
                        disable)
                            stacker_disable_service
                            ;;
                        *)
                            echo "Air Service Management"
                            echo "Commands: setup start stop restart status enable disable"
                            ;;
                    esac
                else
                    air_error "Stacker service module not available"
                    exit 1
                fi
            else
                air_error "Stacker framework required for service management"
                exit 1
            fi
            ;;
            
        update)
            air_update "$@"
            ;;
            
        modules)
            case "$1" in
                list)   ls "$AIR_MODULE_DIR"/*.sh 2>/dev/null | sed 's|.*/||; s|\.sh$||' ;;
                loaded) echo "Using Stacker framework modules" ;;
                info)   echo "Module info for: $2" ;;
                *)      ls "$AIR_MODULE_DIR"/*.sh 2>/dev/null | sed 's|.*/||; s|\.sh$||' ;;
            esac
            ;;
            
        peers)
            # Alias for network peers for better UX
            if [ -f "$AIR_MODULE_DIR/network.sh" ]; then
                . "$AIR_MODULE_DIR/network.sh"
                air_peers_list
            else
                echo "ERROR: Network module not available" >&2
                exit 1
            fi
            ;;
            
        version|--version|-v)
            echo "Air P2P Database v${AIR_VERSION}"
            echo "Modular Shell Architecture"  
            echo "Standalone P2P System"
            ;;
            
        help|--help|-h|"")
            air_show_help
            ;;
            
        *)
            air_error "Unknown command: $command"
            echo "Run 'air help' for usage information"
            exit 1
            ;;
    esac
}

# Show logs
air_show_logs() {
    local log_file="$AIR_DATA_DIR/air.log"
    
    if [ ! -f "$log_file" ]; then
        air_warn "No log file found at $log_file"
        return 1
    fi
    
    if [ "$1" = "-f" ] || [ "$1" = "--follow" ]; then
        tail -f "$log_file"
    else
        tail -n 50 "$log_file"
        echo ""
        echo "Use 'air logs -f' to follow logs in real-time"
    fi
}

# Configuration management
air_config() {
    local action="$1"
    shift
    
    case "$action" in
        show|"")
            if [ -f "$AIR_CONFIG_DIR/config.json" ]; then
                cat "$AIR_CONFIG_DIR/config.json"
            else
                air_warn "No configuration file found"
            fi
            ;;
            
        get)
            air_config_get "$1"
            ;;
            
        set)
            air_require "core" || exit 1
            if [ $# -lt 2 ]; then
                air_error "Usage: air config set <key> <value>"
                exit 1
            fi
            local key="$1"
            local value="$2"
            air_config_set "$key" "$value"
            ;;
            
        *)
            air_error "Unknown config action: $action"
            ;;
    esac
}

# Update Air
air_update() {
    air_info "Updating Air P2P Database..."
    
    cd "$AIR_HOME" || {
        air_error "Air home not found: $AIR_HOME"
        return 1
    }
    
    # Pull latest from git
    if [ -d ".git" ]; then
        air_info "Pulling latest changes..."
        git pull || {
            air_error "Failed to pull updates"
            return 1
        }
    fi
    
    # Rebuild if needed
    if [ -f "package.json" ] && command -v npm >/dev/null 2>&1; then
        air_info "Installing dependencies..."
        npm install || {
            air_error "Failed to install dependencies"
            return 1
        }
        
        air_info "Building project..."
        npm run build || {
            air_error "Failed to build project"
            return 1
        }
    fi
    
    air_info "Update complete!"
    
    # Restart if running
    if air_is_running; then
        air_info "Restarting Air..."
        air_require "service" && air_restart
    fi
}

# Stacker-based installation
air_stacker_install() {
    # Find Manager
    local stacker_dir=""
    for location in \
        "$SCRIPT_DIR/manager" \
        "$HOME/air/manager" \
        "$HOME/.local/lib/manager" \
        "/usr/local/lib/manager"
    do
        if [ -f "$location/stacker.sh" ]; then
            stacker_dir="$location"
            break
        fi
    done
    
    if [ -z "$stacker_dir" ]; then
        air_error "Stacker framework not found"
        echo "Please install Manager first"
        return 1
    fi
    
    # Load Manager and run installation
    . "$stacker_dir/stacker.sh"
    stacker_init "air" \
        "https://github.com/akaoio/air.git" \
        "air.sh" \
        "Air P2P Database"
    
    stacker_install "$@"
}

# Air-specific service functions using Stacker framework
air_start_service() {
    if air_is_running; then
        local pid=$(air_get_pid)
        echo "Air is already running (PID: $pid)"
        return 0
    fi
    
    echo "Starting Air P2P database..."
    
    # Ensure we're in the Air directory
    cd "$AIR_HOME" || {
        echo "ERROR: Air home directory not found: $AIR_HOME" >&2
        return 1
    }
    
    # Validate environment
    if ! air_validate_env; then
        if [ -f "package.json" ] && command -v npm >/dev/null 2>&1; then
            echo "Building Air TypeScript project..."
            npm run build || {
                echo "ERROR: Failed to build Air project" >&2
                return 1
            }
        else
            echo "ERROR: Cannot build - npm not available" >&2
            return 1
        fi
    fi
    
    # Get port from config or use default
    local port="${AIR_PORT:-$(air_config_get port)}"
    port="${port:-8765}"
    
    # Start the process in background
    nohup node dist/main.js > "$AIR_DATA_DIR/air.log" 2>&1 &
    local pid=$!
    
    # Save PID
    air_save_pid "$pid"
    
    # Wait a moment and verify process started
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        echo "Air started successfully (PID: $pid)"
        echo "Port: $port | Config: $AIR_CONFIG_DIR/config.json"
        return 0
    else
        echo "ERROR: Failed to start Air" >&2
        air_remove_pid
        return 1
    fi
}

air_stop_service() {
    if ! air_is_running; then
        echo "Air is not running"
        return 0
    fi
    
    local pid=$(air_get_pid)
    echo "Stopping Air P2P database (PID: $pid)..."
    
    # Try graceful shutdown first
    if kill -TERM "$pid" 2>/dev/null; then
        # Wait for process to stop (max 10 seconds)
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo "Forcing Air shutdown..." >&2
            kill -KILL "$pid" 2>/dev/null
        fi
    fi
    
    air_remove_pid
    echo "Air stopped successfully"
    return 0
}

air_restart_service() {
    echo "Restarting Air P2P database..."
    air_stop_service || return 1
    sleep 1
    air_start_service || return 1
    return 0
}

air_status_service() {
    echo "Air P2P Database Status"
    echo ""
    
    if air_is_running; then
        local pid=$(air_get_pid)
        local port="${AIR_PORT:-$(air_config_get port)}"
        port="${port:-8765}"
        
        echo "  Status: ✅ Running"
        echo "  PID: $pid"
        echo "  Port: $port"
        echo "  Config: $AIR_CONFIG_DIR/config.json"
        echo "  Logs: $AIR_DATA_DIR/air.log"
        
        # Check if port is listening
        if command -v netstat >/dev/null 2>&1; then
            if netstat -ln 2>/dev/null | grep -q ":$port "; then
                echo "  Network: ✅ Listening on port $port"
            else
                echo "  Network: ⚠️  Port $port not listening"
            fi
        fi
    else
        echo "  Status: ❌ Not running"
        echo ""
        echo "  Start with: air start"
    fi
    
    echo ""
    echo "Directories:"
    echo "  Config: $AIR_CONFIG_DIR"
    echo "  Data:   $AIR_DATA_DIR"
    echo "  State:  $AIR_STATE_DIR"
    echo "  Home:   $AIR_HOME"
    echo ""
}

# Core utility functions (using Stacker patterns)
air_is_running() {
    if [ -f "$AIR_PID_FILE" ]; then
        local pid=$(cat "$AIR_PID_FILE" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

air_get_pid() {
    if air_is_running; then
        cat "$AIR_PID_FILE"
    else
        return 1
    fi
}

air_save_pid() {
    local pid="$1"
    echo "$pid" > "$AIR_PID_FILE"
}

air_remove_pid() {
    rm -f "$AIR_PID_FILE"
}

air_validate_env() {
    # Check Node.js availability
    if ! command -v node >/dev/null 2>&1; then
        echo "ERROR: Node.js is required but not found" >&2
        return 1
    fi
    
    # Check if dist/main.js exists
    if [ ! -f "$AIR_HOME/dist/main.js" ]; then
        echo "Built artifacts not found. Building..." >&2
        return 1
    fi
    
    return 0
}

air_config_get() {
    local key="$1"
    local config_file="$AIR_CONFIG_DIR/config.json"
    
    if [ ! -f "$config_file" ]; then
        return 1
    fi
    
    # Use Node.js for proper JSON parsing if available
    if command -v node >/dev/null 2>&1; then
        node -e "
            const fs = require('fs');
            try {
                const config = JSON.parse(fs.readFileSync('$config_file', 'utf8'));
                const value = config['$key'];
                if (value !== undefined) {
                    console.log(value);
                }
            } catch(e) {
                process.exit(1);
            }
        " 2>/dev/null
    else
        # Fallback to basic pattern matching
        case "$key" in
            port)
                grep -o '"port"[[:space:]]*:[[:space:]]*[0-9]*' "$config_file" | \
                    sed 's/.*:[[:space:]]*//'
                ;;
            *)
                grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$config_file" | \
                    sed 's/.*:[[:space:]]*"//' | sed 's/"[[:space:]]*$//'
                ;;
        esac
    fi
}

air_config_set() {
    local key="$1"
    local value="$2"
    local config_file="$AIR_CONFIG_DIR/config.json"
    
    if [ -z "$key" ] || [ -z "$value" ]; then
        echo "ERROR: Usage: air config set <key> <value>" >&2
        return 1
    fi
    
    # Ensure config file exists
    if [ ! -f "$config_file" ]; then
        echo '{}' > "$config_file"
    fi
    
    # Use Node.js for proper JSON manipulation if available
    if command -v node >/dev/null 2>&1; then
        node -e "
            const fs = require('fs');
            const configPath = '$config_file';
            let config = {};
            try {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch(e) {
                console.error('Invalid JSON in config file, creating new config');
            }
            config['$key'] = '$value';
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        " 2>/dev/null && echo "Set $key = $value"
        return $?
    else
        echo "ERROR: Node.js required for config management" >&2
        return 1
    fi
}

# Show help
air_show_help() {
    cat << EOF
Air P2P Database v${AIR_VERSION} (Modular Edition)

🚀 Usage:
  air <command> [options]

📌 Core Commands:
  daemon             Run as daemon (for systemd service)
  start              Start Air P2P database
  stop               Stop Air P2P database
  restart            Restart Air P2P database
  status             Show status and health

📊 Monitoring:
  logs [--follow]    Show Air logs
  peers              List connected peers
  network health     Check network connectivity
  network info       Show network configuration  
  network scan       Scan for local Air nodes
  network peers      List configured peers

⚙️  Management:
  config [show]      Show configuration
  config get KEY     Get configuration value
  service setup      Install systemd service
  service start      Start Air service  
  service stop       Stop Air service
  service status     Show service status
  update             Update Air to latest version
  install            Install Air with Manager

🔧 Development:
  modules list       List available modules
  modules loaded     Show loaded modules
  modules info NAME  Show module information

ℹ️  Information:
  version            Show version
  help               Show this help

📁 Directories:
  Config: ~/.config/air/
  Data:   ~/.local/share/air/
  State:  ~/.local/state/air/
  Home:   ~/air/

🌐 Architecture:
  Air uses a modular shell architecture following
  Manager and Access design patterns for clean,
  maintainable, and extensible code.

EOF
}

# Run main function with all arguments
air_main "$@"