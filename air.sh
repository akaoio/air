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

# Set Air module directory
export AIR_MODULE_DIR="$SCRIPT_DIR/modules"

# Load module loader first
if [ -f "$AIR_MODULE_DIR/loader.sh" ]; then
    . "$AIR_MODULE_DIR/loader.sh"
else
    echo "ERROR: Air module loader not found at $AIR_MODULE_DIR/loader.sh" >&2
    exit 1
fi

# Load core module (always needed)
air_require "core" || {
    echo "ERROR: Failed to load core module" >&2
    exit 1
}

# Command processing
air_main() {
    local command="$1"
    shift
    
    case "$command" in
        start)
            air_require "service" || exit 1
            air_start "$@"
            ;;
            
        stop)
            air_require "service" || exit 1
            air_stop "$@"
            ;;
            
        restart)
            air_require "service" || exit 1
            air_restart "$@"
            ;;
            
        status)
            air_require "service" || exit 1
            air_status "$@"
            ;;
            
        logs|log)
            air_show_logs "$@"
            ;;
            
        config)
            air_config "$@"
            ;;
            
        network)
            air_require "network" || exit 1
            shift
            case "$1" in
                health) air_network_health ;;
                info)   air_network_info ;;
                scan)   air_scan_local ;;
                peers)  air_peers_list ;;
                *)      air_network_info ;;
            esac
            ;;
            
        install)
            # Use Manager for installation
            air_stacker_install "$@"
            ;;
            
        update)
            air_update "$@"
            ;;
            
        modules)
            case "$1" in
                list)   air_list_modules ;;
                loaded) air_list_loaded ;;
                info)   air_module_info "$2" ;;
                *)      air_list_modules ;;
            esac
            ;;
            
        peers)
            # Alias for network peers for better UX
            air_require "network" || exit 1
            air_peers_list
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

# Show help
air_show_help() {
    cat << EOF
==============================================
  Air P2P Database v${AIR_VERSION} (Modular Edition)
==============================================

🚀 Usage:
  air <command> [options]

📌 Core Commands:
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