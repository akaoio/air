#!/bin/sh
# Air Core Module - Foundation for P2P Operations
# Version: 2.1.0
# Following Manager/Access modular philosophy

# Module metadata
MODULE_NAME="air-core"
MODULE_VERSION="2.1.0"
MODULE_DESCRIPTION="Core functions for Air P2P database"

# Core initialization
air_core_init() {
    # Set core environment
    AIR_VERSION="2.1.0"
    AIR_HOME="${AIR_HOME:-$HOME/air}"
    AIR_CONFIG_DIR="${AIR_CONFIG_DIR:-$HOME/.config/air}"
    AIR_DATA_DIR="${AIR_DATA_DIR:-$HOME/.local/share/air}"
    AIR_STATE_DIR="${AIR_STATE_DIR:-$HOME/.local/state/air}"
    AIR_PID_FILE="$AIR_STATE_DIR/air.pid"
    
    # Create directories if needed
    mkdir -p "$AIR_CONFIG_DIR" "$AIR_DATA_DIR" "$AIR_STATE_DIR"
    
    # Export for child modules
    export AIR_VERSION AIR_HOME AIR_CONFIG_DIR AIR_DATA_DIR AIR_STATE_DIR AIR_PID_FILE
}

# Logging with colors (Access-style)
air_log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        ERROR)   echo "[$timestamp] ❌ $message" >&2 ;;
        WARN)    echo "[$timestamp] ⚠️  $message" >&2 ;;
        INFO)    echo "[$timestamp] ✅ $message" ;;
        DEBUG)   [ "${AIR_DEBUG:-0}" = "1" ] && echo "[$timestamp] 🔍 $message" ;;
        *)       echo "[$timestamp] $level: $message" ;;
    esac
}

# Simplified logging functions
air_error() { air_log ERROR "$@"; }
air_warn()  { air_log WARN "$@"; }
air_info()  { air_log INFO "$@"; }
air_debug() { air_log DEBUG "$@"; }

# Check if Air is running
air_is_running() {
    if [ -f "$AIR_PID_FILE" ]; then
        local pid=$(cat "$AIR_PID_FILE" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Get Air PID
air_get_pid() {
    if air_is_running; then
        cat "$AIR_PID_FILE"
    else
        return 1
    fi
}

# Save PID
air_save_pid() {
    local pid="$1"
    echo "$pid" > "$AIR_PID_FILE"
}

# Remove PID file
air_remove_pid() {
    rm -f "$AIR_PID_FILE"
}

# Validate environment
air_validate_env() {
    # Check Node.js availability
    if ! command -v node >/dev/null 2>&1; then
        air_error "Node.js is required but not found"
        return 1
    fi
    
    # Check if dist/main.js exists
    if [ ! -f "$AIR_HOME/dist/main.js" ]; then
        air_warn "Built artifacts not found. Building..."
        return 1
    fi
    
    return 0
}

# Get configuration value
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
        # Fallback to basic pattern matching for systems without Node.js
        case "$key" in
            port)
                grep -o '"port"[[:space:]]*:[[:space:]]*[0-9]*' "$config_file" | \
                    sed 's/.*:[[:space:]]*//'
                ;;
            *)
                # Extract string values (handles basic cases)
                grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$config_file" | \
                    sed 's/.*:[[:space:]]*"//' | sed 's/"[[:space:]]*$//'
                ;;
        esac
    fi
}

# Initialize core module
air_core_init

# Export module interface
# Set configuration value
air_config_set() {
    local key="$1"
    local value="$2"
    local config_file="$AIR_CONFIG_DIR/config.json"
    
    if [ -z "$key" ] || [ -z "$value" ]; then
        air_error "Usage: air_config_set <key> <value>"
        return 1
    fi
    
    # Ensure config file exists
    if [ ! -f "$config_file" ]; then
        echo '{}' > "$config_file"
    fi
    
    # Use a simple approach with temporary file for JSON modification
    local temp_file="$(mktemp)"
    
    # Use Node.js for proper JSON manipulation if available
    if command -v node >/dev/null 2>&1; then
        # Use Node.js for safe JSON manipulation
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
        " 2>/dev/null && air_info "Set $key = $value"
        return $?
    else
        # Fallback to basic sed approach for systems without Node.js
        if grep -q "\"$key\"" "$config_file" 2>/dev/null; then
            # Update existing key - use more precise regex
            sed "s/\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/\"$key\": \"$value\"/g" "$config_file" > "$temp_file"
        else
            # Add new key - only target the very last closing brace
            if [ -s "$config_file" ] && [ "$(cat "$config_file")" = "{}" ]; then
                # Empty object
                echo "{ \"$key\": \"$value\" }" > "$temp_file"
            else
                # Add to root level - find last } and add before it
                sed '$ s/^}$/    , "'$key'": "'$value'"\n}/' "$config_file" > "$temp_file"
            fi
        fi
    fi
    
    # Only needed for fallback sed approach (when Node.js not available)
    if [ ! -z "$temp_file" ] && [ -f "$temp_file" ]; then
        # Basic validation and move temp file
        if [ -s "$temp_file" ]; then
            mv "$temp_file" "$config_file"
            air_info "Set $key = $value"
        else
            rm -f "$temp_file"
            air_error "Failed to set configuration value"
            return 1
        fi
    fi
}

air_core_exports() {
    echo "air_core_init air_log air_error air_warn air_info air_debug"
    echo "air_is_running air_get_pid air_save_pid air_remove_pid"
    echo "air_validate_env air_config_get air_config_set"
}