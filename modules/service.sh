#!/bin/sh
# Air Service Module - Start/Stop/Restart Operations
# Version: 2.1.0
# Modular design following Manager/Access patterns

# Module metadata
MODULE_NAME="air-service"
MODULE_VERSION="2.1.0"
MODULE_DESCRIPTION="Service management for Air P2P database"
MODULE_DEPENDS="core"

# Start Air service
air_start() {
    if air_is_running; then
        local pid=$(air_get_pid)
        air_info "Air is already running (PID: $pid)"
        return 0
    fi
    
    air_info "Starting Air P2P database..."
    
    # Ensure we're in the Air directory
    cd "$AIR_HOME" || {
        air_error "Air home directory not found: $AIR_HOME"
        return 1
    }
    
    # Validate environment
    if ! air_validate_env; then
        # Try to build if artifacts missing
        if [ -f "package.json" ] && command -v npm >/dev/null 2>&1; then
            air_info "Building Air TypeScript project..."
            npm run build || {
                air_error "Failed to build Air project"
                return 1
            }
        else
            air_error "Cannot build - npm not available"
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
        air_info "Air started successfully (PID: $pid)"
        air_info "Port: $port | Config: $AIR_CONFIG_DIR/config.json"
        return 0
    else
        air_error "Failed to start Air"
        air_remove_pid
        return 1
    fi
}

# Stop Air service
air_stop() {
    if ! air_is_running; then
        air_info "Air is not running"
        return 0
    fi
    
    local pid=$(air_get_pid)
    air_info "Stopping Air P2P database (PID: $pid)..."
    
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
            air_warn "Forcing Air shutdown..."
            kill -KILL "$pid" 2>/dev/null
        fi
    fi
    
    air_remove_pid
    air_info "Air stopped successfully"
    return 0
}

# Restart Air service
air_restart() {
    air_info "Restarting Air P2P database..."
    air_stop || return 1
    sleep 1
    air_start || return 1
    return 0
}

# Get Air status
air_status() {
    echo "=============================================="
    echo "  Air P2P Database Status"
    echo "=============================================="
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

# Export module interface
air_service_exports() {
    echo "air_start air_stop air_restart air_status"
}