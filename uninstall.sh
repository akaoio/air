#!/bin/sh
# Air Uninstaller - Powered by Manager Framework
# Clean removal of Air P2P database system
# Manager handles services, cron jobs, binaries, configs, data - everything

set -e

# Find and load Manager - required for proper uninstallation
find_manager() {
    # Check common locations for Manager
    if [ -f "$HOME/manager/manager.sh" ]; then
        MANAGER_DIR="$HOME/manager"
    elif [ -f "/usr/local/lib/manager/manager.sh" ]; then
        MANAGER_DIR="/usr/local/lib/manager"
    elif [ -f "./manager/manager.sh" ]; then
        MANAGER_DIR="./manager"
    else
        echo "ERROR: Manager framework not found!"
        echo "Manager is required for proper uninstallation."
        echo ""
        echo "Install Manager first:"
        echo "  git clone https://github.com/akaoio/manager.git ~/manager"
        echo ""
        echo "Manager handles all aspects of uninstallation properly."
        exit 1
    fi
}

# Load Manager framework
find_manager
. "$MANAGER_DIR/manager.sh"

# Display header
show_header() {
    echo "=================================================="
    echo "  Air P2P Database - Uninstaller"
    echo "  Distributed Database System v2.1.0"
    echo "=================================================="
    echo ""
}

# Confirm uninstallation unless forced
confirm_uninstall() {
    if [ "$1" != "--force" ] && [ "$1" != "-f" ]; then
        show_header
        echo "This will remove Air completely:"
        echo "  • Node.js application and dependencies"
        echo "  • Systemd services (if installed)"
        echo "  • Cron jobs (if installed)"
        echo "  • Configuration files"
        echo "  • Database files (GUN data)"
        echo "  • Log files and state"
        echo "  • Lock files and PID files"
        echo ""
        echo "⚠️  WARNING: This will stop any running Air instances"
        echo ""
        printf "Continue with uninstallation? (yes/no): "
        read -r response
        if [ "$response" != "yes" ]; then
            echo "Uninstallation cancelled."
            exit 0
        fi
    fi
}

# Initialize Manager for Air
init_air() {
    manager_init "air" \
                 "https://github.com/akaoio/air.git" \
                 "node dist/main.js" \
                 "Air Distributed P2P Database"
    
    manager_log "Manager initialized for Air uninstallation"
}

# Stop running Air instances
stop_air_instances() {
    manager_log "Checking for running Air instances..."
    
    # Check if Air is running via Manager's PID file
    if [ -f "$MANAGER_STATE_DIR/air.pid" ]; then
        local pid=$(cat "$MANAGER_STATE_DIR/air.pid" 2>/dev/null || true)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            manager_log "Stopping Air instance (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 2
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                manager_warn "Force killing Air instance..."
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
    fi
    
    # Also check for any stray node processes running Air
    if command -v pgrep >/dev/null 2>&1; then
        local air_pids=$(pgrep -f "node.*dist/main.js" 2>/dev/null || true)
        if [ -n "$air_pids" ]; then
            manager_warn "Found stray Air processes: $air_pids"
            for pid in $air_pids; do
                manager_log "Stopping process $pid..."
                kill "$pid" 2>/dev/null || true
            done
            sleep 2
        fi
    fi
}

# Parse command line options
parse_options() {
    UNINSTALL_OPTS=""
    KEEP_CONFIG=false
    KEEP_DATA=false
    
    for arg in "$@"; do
        case "$arg" in
            --keep-config)
                UNINSTALL_OPTS="$UNINSTALL_OPTS --keep-config"
                KEEP_CONFIG=true
                manager_log "Keeping configuration files"
                ;;
            --keep-data)
                UNINSTALL_OPTS="$UNINSTALL_OPTS --keep-data"
                KEEP_DATA=true
                manager_log "Keeping database and log files"
                ;;
            --keep-locks)
                UNINSTALL_OPTS="$UNINSTALL_OPTS --keep-state"
                manager_log "Keeping lock files and state"
                ;;
            --force|-f)
                # Already handled in confirm_uninstall
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
        esac
    done
}

# Show help message
show_help() {
    show_header
    cat << 'EOF'
Usage: ./uninstall.sh [OPTIONS]

Options:
  --force, -f       Skip confirmation prompt
  --keep-config     Preserve configuration files
  --keep-data       Preserve database and log files
  --keep-locks      Preserve lock and state files
  --help, -h        Show this help message

Examples:
  ./uninstall.sh                    # Interactive uninstallation
  ./uninstall.sh --force            # Uninstall without confirmation
  ./uninstall.sh --keep-data        # Remove Air but keep database
  ./uninstall.sh --force --keep-config --keep-data  # Keep user data

Manager handles:
  ✓ Stopping all Air processes
  ✓ Removing systemd services (system and user)
  ✓ Removing cron jobs
  ✓ Deleting binaries and symlinks
  ✓ Cleaning up directories (respecting --keep options)
  ✓ Updating Manager registry

EOF
}

# Clean up Air-specific artifacts not handled by Manager
cleanup_air_artifacts() {
    manager_log "Cleaning up Air-specific artifacts..."
    
    # Remove node_modules if in clean clone directory
    if [ -d "$MANAGER_CLEAN_CLONE_DIR/node_modules" ] && [ "$KEEP_DATA" = false ]; then
        manager_log "Removing node_modules..."
        rm -rf "$MANAGER_CLEAN_CLONE_DIR/node_modules"
    fi
    
    # Remove dist directory (built artifacts)
    if [ -d "$MANAGER_CLEAN_CLONE_DIR/dist" ]; then
        manager_log "Removing built artifacts..."
        rm -rf "$MANAGER_CLEAN_CLONE_DIR/dist"
    fi
    
    # Remove GUN database files (radata)
    if [ "$KEEP_DATA" = false ]; then
        if [ -d "$MANAGER_DATA_DIR/radata" ]; then
            manager_log "Removing GUN database..."
            rm -rf "$MANAGER_DATA_DIR/radata"
        fi
        if [ -d "$MANAGER_CLEAN_CLONE_DIR/radata" ]; then
            rm -rf "$MANAGER_CLEAN_CLONE_DIR/radata"
        fi
    fi
    
    # Remove lock files
    if [ "$KEEP_DATA" = false ]; then
        manager_log "Removing lock files..."
        rm -f "$MANAGER_STATE_DIR"/*.lock 2>/dev/null || true
        rm -rf "$MANAGER_DATA_DIR/locks" 2>/dev/null || true
    fi
}

# Main uninstallation process
main() {
    # Parse options first
    parse_options "$@"
    
    # Confirm unless forced
    confirm_uninstall "$@"
    
    # Initialize Manager for Air
    init_air
    
    # Stop any running instances
    stop_air_instances
    
    # Let Manager handle the core uninstallation
    manager_log "Starting Manager uninstallation process..."
    
    # Manager handles:
    # - Stopping and removing systemd services
    # - Removing cron jobs
    # - Deleting binaries and symlinks
    # - Cleaning up config directories (unless --keep-config)
    # - Removing data and logs (unless --keep-data)
    # - Handling both root and non-root installations
    # - Updating the Manager registry
    
    manager_uninstall $UNINSTALL_OPTS || {
        manager_error "Manager uninstallation failed!"
        exit 1
    }
    
    # Clean up Air-specific artifacts
    cleanup_air_artifacts
    
    # Show completion message
    echo ""
    echo "=================================================="
    echo "  Air has been completely uninstalled"
    echo "=================================================="
    echo ""
    if [ "$KEEP_CONFIG" = true ] || [ "$KEEP_DATA" = true ]; then
        echo "Preserved files:"
        [ "$KEEP_CONFIG" = true ] && echo "  • Configuration files"
        [ "$KEEP_DATA" = true ] && echo "  • Database and log files"
        echo ""
    fi
    echo "Thank you for using Air P2P Database!"
    echo ""
    
    # Note about Manager
    if [ -z "$UNINSTALL_OPTS" ]; then
        echo "Note: All Air files have been removed."
    fi
    echo "Manager framework remains installed for other tools."
}

# Run main uninstallation
main "$@"