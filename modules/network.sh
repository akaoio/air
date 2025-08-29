#!/bin/sh
# Air Network Module - P2P Network Operations
# Version: 2.1.0
# Handles peer discovery, connectivity, network health

# Module metadata
MODULE_NAME="air-network"
MODULE_VERSION="2.1.0"
MODULE_DESCRIPTION="P2P network operations for Air"
MODULE_DEPENDS="core"

# Default values
DEFAULT_PEERS="gun.eco/gun gunjs.herokuapp.com/gun"
DEFAULT_PORT="8765"

# Get list of peers
air_peers_list() {
    local config_file="$AIR_CONFIG_DIR/config.json"
    
    if [ -f "$config_file" ]; then
        # Try to extract peers from config
        grep -o '"peers"[[:space:]]*:[[:space:]]*\[[^]]*\]' "$config_file" 2>/dev/null | \
            sed 's/.*\[//' | sed 's/\]//' | sed 's/"//g' | sed 's/,/ /g'
    else
        echo "$DEFAULT_PEERS"
    fi
}

# Check peer connectivity
air_peer_check() {
    local peer="$1"
    
    if [ -z "$peer" ]; then
        air_error "No peer specified"
        return 1
    fi
    
    air_debug "Checking peer: $peer"
    
    # Try to connect to peer (basic HTTP check)
    if command -v curl >/dev/null 2>&1; then
        if curl -s --max-time 5 "http://$peer" >/dev/null 2>&1; then
            return 0
        fi
    elif command -v wget >/dev/null 2>&1; then
        if wget -q --timeout=5 -O /dev/null "http://$peer" 2>/dev/null; then
            return 0
        fi
    fi
    
    return 1
}

# Check all peers
air_network_health() {
    air_info "Checking network health..."
    
    local peers=$(air_peers_list)
    local total=0
    local alive=0
    
    for peer in $peers; do
        total=$((total + 1))
        if air_peer_check "$peer"; then
            alive=$((alive + 1))
            air_info "  ✅ $peer - Connected"
        else
            air_warn "  ❌ $peer - Unreachable"
        fi
    done
    
    echo ""
    if [ $alive -eq $total ]; then
        air_info "Network Status: Excellent ($alive/$total peers reachable)"
    elif [ $alive -gt 0 ]; then
        air_warn "Network Status: Degraded ($alive/$total peers reachable)"
    else
        air_error "Network Status: Offline (0/$total peers reachable)"
    fi
}

# Scan for local Air nodes
air_scan_local() {
    air_info "Scanning for local Air nodes..."
    
    local port="${AIR_PORT:-$DEFAULT_PORT}"
    local subnet=$(ip route | grep -E '^(192\.168|10\.|172\.)' | head -1 | awk '{print $1}')
    
    if [ -z "$subnet" ]; then
        air_warn "Cannot determine local subnet"
        return 1
    fi
    
    air_info "Scanning subnet: $subnet"
    
    # Simple port scan for Air nodes
    # This is a basic implementation - could be enhanced
    for i in $(seq 1 254); do
        local ip="${subnet%.*}.$i"
        if nc -z -w1 "$ip" "$port" 2>/dev/null; then
            air_info "  Found potential Air node: $ip:$port"
        fi
    done
}

# Show network configuration
air_network_info() {
    echo "=============================================="
    echo "  Air Network Configuration"
    echo "=============================================="
    echo ""
    
    local port="${AIR_PORT:-$(air_config_get port)}"
    port="${port:-$DEFAULT_PORT}"
    
    echo "Local Configuration:"
    echo "  Port: $port"
    echo "  Bind: ${AIR_BIND:-0.0.0.0}"
    echo ""
    
    echo "Configured Peers:"
    local peers=$(air_peers_list)
    for peer in $peers; do
        echo "  • $peer"
    done
    echo ""
    
    # Show actual connections if Air is running
    if air_is_running; then
        echo "Active Connections:"
        # This would need to query the running Air instance
        # For now, just show that it's running
        echo "  Air is running - check logs for peer connections"
    else
        echo "Active Connections:"
        echo "  Air is not running"
    fi
    echo ""
}

# Export module interface
air_network_exports() {
    echo "air_peers_list air_peer_check air_network_health"
    echo "air_scan_local air_network_info"
}