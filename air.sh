#!/bin/sh
# Air - Pure POSIX shell wrapper following Access philosophy
# The eternal distributed P2P database management layer

VERSION="0.0.1"

# Color support (Access style)
if [ "${FORCE_COLOR:-0}" = "1" ] || { [ -t 1 ] && [ "${NO_COLOR:-0}" != "1" ] && [ "${TERM:-}" != "dumb" ]; }; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    BOLD='\033[1m'
    DIM='\033[2m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    BOLD=''
    DIM=''
    NC=''
fi

# XDG Base Directory Specification compliance
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"

# Air directories following XDG standard
AIR_CONFIG_HOME="${AIR_CONFIG_HOME:-$XDG_CONFIG_HOME/air}"
AIR_DATA_HOME="${AIR_DATA_HOME:-$XDG_DATA_HOME/air}"

# Configuration files (XDG-compliant)
AIR_CONFIG="${AIR_CONFIG:-$AIR_CONFIG_HOME/config.json}"
AIR_LOG="${AIR_LOG:-$AIR_DATA_HOME/air.log}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Ensure XDG-compliant directories exist
mkdir -p "$AIR_CONFIG_HOME"
mkdir -p "$AIR_DATA_HOME"

# Logging functions (Access style)
log_success() {
    echo "${GREEN}✓${NC} $*"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $*" >> "$AIR_LOG"
}

log_error() {
    if [ -n "$RED" ]; then
        echo "${RED}✗ Error:${NC} $*" >&2
    else
        echo "Error: $*" >&2
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >> "$AIR_LOG"
}

log_warning() {
    echo "${YELLOW}⚠ Warning:${NC} $*"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $*" >> "$AIR_LOG"
}

log_info() {
    echo "${BLUE}ℹ${NC} $*"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $*" >> "$AIR_LOG"
}

# Check if Node.js application is running
is_running() {
    pgrep -f "node.*main.js" >/dev/null 2>&1 || pgrep -f "npm.*start" >/dev/null 2>&1
}

# Start Air P2P node
start_air() {
    if is_running; then
        log_warning "Air is already running"
        return 1
    fi
    
    log_info "Starting Air P2P database..."
    cd "$SCRIPT_DIR"
    
    if [ -f "main.js" ]; then
        node main.js &
        sleep 2
        if is_running; then
            log_success "Air started successfully"
        else
            log_error "Failed to start Air"
            return 1
        fi
    elif [ -f "package.json" ]; then
        npm start &
        sleep 2
        if is_running; then
            log_success "Air started successfully via npm"
        else
            log_error "Failed to start Air via npm"
            return 1
        fi
    else
        log_error "No main.js or package.json found"
        return 1
    fi
}

# Stop Air P2P node
stop_air() {
    if ! is_running; then
        log_warning "Air is not running"
        return 1
    fi
    
    log_info "Stopping Air P2P database..."
    pkill -f "node.*main.js" 2>/dev/null || pkill -f "npm.*start" 2>/dev/null
    sleep 2
    
    if is_running; then
        log_warning "Graceful shutdown failed, using force..."
        pkill -9 -f "node.*main.js" 2>/dev/null || pkill -9 -f "npm.*start" 2>/dev/null
        sleep 1
    fi
    
    if ! is_running; then
        log_success "Air stopped successfully"
    else
        log_error "Failed to stop Air"
        return 1
    fi
}

# Restart Air P2P node
restart_air() {
    log_info "Restarting Air P2P database..."
    stop_air
    sleep 1
    start_air
}

# Check Air status
status_air() {
    if is_running; then
        pid=$(pgrep -f "node.*main.js" || pgrep -f "npm.*start")
        log_success "Air is running (PID: $pid)"
        
        # Show config if available
        if [ -f "$AIR_CONFIG" ]; then
            if command -v jq >/dev/null 2>&1; then
                port=$(jq -r '.development.port // .port // "8765"' "$AIR_CONFIG")
                domain=$(jq -r '.development.domain // .domain // "localhost"' "$AIR_CONFIG")
                echo "${DIM}Config: $domain:$port${NC}"
            fi
        fi
        
        return 0
    else
        log_error "Air is not running"
        return 1
    fi
}

# Show Air logs
logs_air() {
    if [ -f "$AIR_LOG" ]; then
        tail -f "$AIR_LOG"
    else
        log_error "No log file found at $AIR_LOG"
        return 1
    fi
}

# Main command handler (Access style)
case "${1:-help}" in
    start)
        start_air
        ;;
    stop)
        stop_air
        ;;
    restart)
        restart_air
        ;;
    status)
        status_air
        ;;
    logs)
        logs_air
        ;;
    config)
        if [ -f "$AIR_CONFIG" ]; then
            if command -v jq >/dev/null 2>&1; then
                jq '.' "$AIR_CONFIG"
            else
                cat "$AIR_CONFIG"
            fi
        else
            log_error "No config file found at $AIR_CONFIG"
            exit 1
        fi
        ;;
    version)
        echo "${BOLD}Air v$VERSION${NC} - Distributed P2P Database"
        ;;
    *)
        echo ""
        echo "${BOLD}================================================================${NC}"
        echo "${BOLD}Air - Distributed P2P Database v$VERSION${NC}"
        echo "${BOLD}================================================================${NC}"
        echo ""
        echo "${BOLD}Usage:${NC}"
        echo "${BOLD}------${NC}"
        echo ""
        echo "${BOLD}Commands:${NC}"
        echo "    ${BLUE}air start${NC}              Start Air P2P node"
        echo "    ${BLUE}air stop${NC}               Stop Air P2P node"
        echo "    ${BLUE}air restart${NC}            Restart Air P2P node"
        echo "    ${BLUE}air status${NC}             Show Air status"
        echo "    ${BLUE}air logs${NC}               Show Air logs (follow mode)"
        echo "    ${BLUE}air config${NC}             Show current configuration"
        echo "    ${BLUE}air version${NC}            Show version"
        echo "    ${BLUE}air help${NC}               Show this help"
        echo ""
        echo "${BOLD}Configuration:${NC}"
        echo "${BOLD}-------------${NC}"
        echo "    Config file: ${DIM}$AIR_CONFIG${NC}"
        echo "    Log file:    ${DIM}$AIR_LOG${NC}"
        echo ""
        echo "${BOLD}Philosophy:${NC}"
        echo "${BOLD}-----------${NC}"
        echo "${DIM}Air follows the Access philosophy of pure shell reliability.${NC}"
        echo "${DIM}While languages come and go, shell is eternal.${NC}"
        echo ""
        ;;
esac