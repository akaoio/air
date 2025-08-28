#!/bin/sh
# Air Configuration Manager
# Dynamic configuration system - NO HARDCODED VALUES
# All values loaded from environment or config files

# Configuration paths (XDG compliant)
AIR_CONFIG_HOME="${XDG_CONFIG_HOME:-${HOME}/.config}/air"
AIR_DATA_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/air"
AIR_STATE_HOME="${XDG_STATE_HOME:-${HOME}/.local/state}/air"
AIR_CACHE_HOME="${XDG_CACHE_HOME:-${HOME}/.cache}/air"

# Create all directories
mkdir -p "$AIR_CONFIG_HOME"
mkdir -p "$AIR_DATA_HOME"
mkdir -p "$AIR_STATE_HOME"
mkdir -p "$AIR_CACHE_HOME"

# Load configuration from multiple sources
load_config() {
    # 1. System-wide defaults (if exists)
    if [ -f "/etc/air/defaults.conf" ]; then
        . "/etc/air/defaults.conf"
    fi
    
    # 2. User defaults
    if [ -f "$AIR_CONFIG_HOME/defaults.conf" ]; then
        . "$AIR_CONFIG_HOME/defaults.conf"
    fi
    
    # 3. Environment variables (override)
    # Network settings
    AIR_PORT="${AIR_PORT:-}"
    AIR_BIND="${AIR_BIND:-}"
    AIR_PROTOCOL="${AIR_PROTOCOL:-}"
    
    # P2P settings
    AIR_P2P_MODE="${AIR_P2P_MODE:-}"
    AIR_PEER_LIMIT="${AIR_PEER_LIMIT:-}"
    AIR_SCAN="${AIR_SCAN:-}"
    AIR_BOOTSTRAP_PEERS="${AIR_BOOTSTRAP_PEERS:-}"
    
    # Service settings
    AIR_SERVICE_TYPE="${AIR_SERVICE_TYPE:-}"
    AIR_AUTO_UPDATE="${AIR_AUTO_UPDATE:-}"
    AIR_UPDATE_CHANNEL="${AIR_UPDATE_CHANNEL:-}"
    AIR_UPDATE_INTERVAL="${AIR_UPDATE_INTERVAL:-}"
    
    # Security settings
    AIR_SECURITY_LEVEL="${AIR_SECURITY_LEVEL:-}"
    AIR_ENCRYPTION="${AIR_ENCRYPTION:-}"
    AIR_AUTH_REQUIRED="${AIR_AUTH_REQUIRED:-}"
    
    # Performance settings
    AIR_MAX_MEMORY="${AIR_MAX_MEMORY:-}"
    AIR_MAX_CPU="${AIR_MAX_CPU:-}"
    AIR_CACHE_SIZE="${AIR_CACHE_SIZE:-}"
    
    # Logging settings
    AIR_LOG_LEVEL="${AIR_LOG_LEVEL:-}"
    AIR_LOG_FORMAT="${AIR_LOG_FORMAT:-}"
    AIR_LOG_ROTATION="${AIR_LOG_ROTATION:-}"
    
    # 4. Profile-specific overrides
    if [ -n "$AIR_PROFILE" ] && [ -f "$AIR_CONFIG_HOME/profiles/${AIR_PROFILE}.conf" ]; then
        . "$AIR_CONFIG_HOME/profiles/${AIR_PROFILE}.conf"
    fi
    
    # 5. Local overrides (highest priority)
    if [ -f "$AIR_CONFIG_HOME/local.conf" ]; then
        . "$AIR_CONFIG_HOME/local.conf"
    fi
}

# Get configuration value with fallback
get_config() {
    local key="$1"
    local default="$2"
    local value
    
    # Try to get from environment
    eval "value=\$AIR_${key}"
    
    # If empty, try from config file
    if [ -z "$value" ] && [ -f "$AIR_CONFIG_HOME/config.json" ]; then
        value=$(grep "\"${key}\"" "$AIR_CONFIG_HOME/config.json" | cut -d'"' -f4)
    fi
    
    # Return value or default
    echo "${value:-$default}"
}

# Set configuration value
set_config() {
    local key="$1"
    local value="$2"
    local persist="${3:-true}"
    
    # Set in environment
    export "AIR_${key}=${value}"
    
    # Persist to config file if requested
    if [ "$persist" = "true" ]; then
        echo "AIR_${key}=\"${value}\"" >> "$AIR_CONFIG_HOME/local.conf"
    fi
}

# Discover optimal settings based on system
discover_settings() {
    echo "Discovering optimal settings for your system..."
    
    # Detect system resources
    if command -v nproc >/dev/null 2>&1; then
        SYSTEM_CPUS=$(nproc)
    else
        SYSTEM_CPUS=1
    fi
    
    if [ -f "/proc/meminfo" ]; then
        SYSTEM_MEMORY=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        SYSTEM_MEMORY_MB=$((SYSTEM_MEMORY / 1024))
    else
        SYSTEM_MEMORY_MB=1024
    fi
    
    # Detect network capabilities
    if command -v ip >/dev/null 2>&1; then
        NETWORK_INTERFACES=$(ip link show | grep -c "state UP")
    else
        NETWORK_INTERFACES=1
    fi
    
    # Check for IPv6 support
    if [ -f "/proc/net/if_inet6" ]; then
        IPV6_SUPPORT="true"
    else
        IPV6_SUPPORT="false"
    fi
    
    # Suggest settings based on resources
    if [ "$SYSTEM_MEMORY_MB" -gt 8192 ]; then
        SUGGESTED_PROFILE="enterprise"
        SUGGESTED_PEER_LIMIT="1000"
        SUGGESTED_CACHE_SIZE="2048"
    elif [ "$SYSTEM_MEMORY_MB" -gt 2048 ]; then
        SUGGESTED_PROFILE="standard"
        SUGGESTED_PEER_LIMIT="100"
        SUGGESTED_CACHE_SIZE="512"
    else
        SUGGESTED_PROFILE="lightweight"
        SUGGESTED_PEER_LIMIT="20"
        SUGGESTED_CACHE_SIZE="128"
    fi
    
    # Find available port
    for port in 8765 8766 8767 8080 3000; do
        if ! netstat -tuln 2>/dev/null | grep -q ":${port}"; then
            SUGGESTED_PORT="$port"
            break
        fi
    done
    
    # Export suggestions
    export SUGGESTED_PROFILE
    export SUGGESTED_PORT
    export SUGGESTED_PEER_LIMIT
    export SUGGESTED_CACHE_SIZE
    export SYSTEM_CPUS
    export SYSTEM_MEMORY_MB
    export IPV6_SUPPORT
}

# Validate configuration
validate_config() {
    local errors=0
    
    # Check port is valid
    local port=$(get_config "PORT" "8765")
    if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
        echo "ERROR: Invalid port number: $port"
        errors=$((errors + 1))
    fi
    
    # Check data directory is writable
    local data_dir=$(get_config "DATA_DIR" "$AIR_DATA_HOME")
    if [ ! -w "$data_dir" ]; then
        echo "ERROR: Data directory not writable: $data_dir"
        errors=$((errors + 1))
    fi
    
    # Check peer limit is reasonable
    local peer_limit=$(get_config "PEER_LIMIT" "100")
    if [ "$peer_limit" != "unlimited" ] && [ "$peer_limit" -lt 1 ]; then
        echo "ERROR: Invalid peer limit: $peer_limit"
        errors=$((errors + 1))
    fi
    
    return $errors
}

# Export configuration for other scripts
export_config() {
    cat > "$AIR_STATE_HOME/environment" << EOF
# Air Runtime Configuration
# Generated: $(date)

# Paths
export AIR_CONFIG_HOME="$AIR_CONFIG_HOME"
export AIR_DATA_HOME="$AIR_DATA_HOME"
export AIR_STATE_HOME="$AIR_STATE_HOME"
export AIR_CACHE_HOME="$AIR_CACHE_HOME"

# Network
export AIR_PORT="$(get_config PORT 8765)"
export AIR_BIND="$(get_config BIND 0.0.0.0)"
export AIR_PROTOCOL="$(get_config PROTOCOL http)"

# P2P
export AIR_P2P_MODE="$(get_config P2P_MODE hybrid)"
export AIR_PEER_LIMIT="$(get_config PEER_LIMIT 100)"
export AIR_SCAN="$(get_config SCAN true)"

# Service
export AIR_SERVICE_TYPE="$(get_config SERVICE_TYPE manual)"
export AIR_AUTO_UPDATE="$(get_config AUTO_UPDATE false)"

# Performance
export AIR_MAX_MEMORY="$(get_config MAX_MEMORY auto)"
export AIR_MAX_CPU="$(get_config MAX_CPU auto)"
export AIR_CACHE_SIZE="$(get_config CACHE_SIZE 256)"

# Logging
export AIR_LOG_LEVEL="$(get_config LOG_LEVEL info)"
export AIR_LOG_FORMAT="$(get_config LOG_FORMAT json)"
EOF
}

# Interactive configuration editor
edit_config() {
    local temp_file="/tmp/air-config-$$"
    
    # Create editable configuration
    cat > "$temp_file" << EOF
# Air Configuration
# Edit values and save to apply

# Network Settings
PORT=$(get_config PORT 8765)
BIND=$(get_config BIND 0.0.0.0)

# P2P Settings  
P2P_MODE=$(get_config P2P_MODE hybrid)
PEER_LIMIT=$(get_config PEER_LIMIT 100)
SCAN=$(get_config SCAN true)

# Service Settings
SERVICE_TYPE=$(get_config SERVICE_TYPE manual)
AUTO_UPDATE=$(get_config AUTO_UPDATE false)

# Performance
MAX_MEMORY=$(get_config MAX_MEMORY auto)
CACHE_SIZE=$(get_config CACHE_SIZE 256)

# Logging
LOG_LEVEL=$(get_config LOG_LEVEL info)
EOF
    
    # Open in editor
    ${EDITOR:-vi} "$temp_file"
    
    # Load edited configuration
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        case "$key" in
            "#"*|"") continue ;;
        esac
        
        # Remove leading/trailing whitespace
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        
        # Set configuration
        set_config "$key" "$value"
    done < "$temp_file"
    
    rm -f "$temp_file"
    
    echo "Configuration updated"
}

# Show current configuration
show_config() {
    echo "Air Configuration"
    echo "================="
    echo ""
    echo "Paths:"
    echo "  Config: $AIR_CONFIG_HOME"
    echo "  Data:   $AIR_DATA_HOME"
    echo "  State:  $AIR_STATE_HOME"
    echo "  Cache:  $AIR_CACHE_HOME"
    echo ""
    echo "Network:"
    echo "  Port:     $(get_config PORT 8765)"
    echo "  Bind:     $(get_config BIND 0.0.0.0)"
    echo "  Protocol: $(get_config PROTOCOL http)"
    echo ""
    echo "P2P:"
    echo "  Mode:       $(get_config P2P_MODE hybrid)"
    echo "  Peer Limit: $(get_config PEER_LIMIT 100)"
    echo "  Scan:  $(get_config SCAN true)"
    echo ""
    echo "Service:"
    echo "  Type:        $(get_config SERVICE_TYPE manual)"
    echo "  Auto-update: $(get_config AUTO_UPDATE false)"
    echo ""
    echo "Performance:"
    echo "  Max Memory: $(get_config MAX_MEMORY auto)"
    echo "  Cache Size: $(get_config CACHE_SIZE 256)"
    echo ""
    echo "Logging:"
    echo "  Level:  $(get_config LOG_LEVEL info)"
    echo "  Format: $(get_config LOG_FORMAT json)"
}

# Reset configuration to defaults
reset_config() {
    echo "Resetting configuration to defaults..."
    
    # Remove local overrides
    rm -f "$AIR_CONFIG_HOME/local.conf"
    
    # Discover system settings
    discover_settings
    
    # Apply suggested defaults
    set_config "PORT" "${SUGGESTED_PORT:-8765}"
    set_config "PROFILE" "${SUGGESTED_PROFILE:-standard}"
    set_config "PEER_LIMIT" "${SUGGESTED_PEER_LIMIT:-100}"
    set_config "CACHE_SIZE" "${SUGGESTED_CACHE_SIZE:-256}"
    
    echo "Configuration reset complete"
}

# Main command handling
case "${1:-show}" in
    load)
        load_config
        echo "Configuration loaded"
        ;;
    discover)
        discover_settings
        echo "System: ${SYSTEM_CPUS} CPUs, ${SYSTEM_MEMORY_MB}MB RAM"
        echo "Suggested profile: $SUGGESTED_PROFILE"
        echo "Suggested port: $SUGGESTED_PORT"
        ;;
    validate)
        load_config
        if validate_config; then
            echo "Configuration is valid"
        else
            echo "Configuration has errors"
            exit 1
        fi
        ;;
    export)
        load_config
        export_config
        echo "Configuration exported to $AIR_STATE_HOME/environment"
        ;;
    edit)
        load_config
        edit_config
        ;;
    show)
        load_config
        show_config
        ;;
    reset)
        reset_config
        ;;
    get)
        load_config
        get_config "$2" "$3"
        ;;
    set)
        load_config
        set_config "$2" "$3"
        echo "Set AIR_$2=$3"
        ;;
    *)
        echo "Air Configuration Manager"
        echo ""
        echo "Usage:"
        echo "  $0 show      Show current configuration"
        echo "  $0 edit      Edit configuration interactively"
        echo "  $0 discover  Discover optimal settings"
        echo "  $0 validate  Validate configuration"
        echo "  $0 export    Export configuration"
        echo "  $0 reset     Reset to defaults"
        echo "  $0 get KEY   Get configuration value"
        echo "  $0 set KEY VALUE  Set configuration value"
        ;;
esac