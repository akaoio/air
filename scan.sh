#!/bin/sh
# Air Network Scan Module - Domain-Agnostic P2P System
# Enables Air nodes to discover and connect to peers globally
# Not tied to any specific domain - works for the world

set -e

# Framework initialization
STACKER_DIR="${STACKER_DIR:-./manager}"

# Check if Stacker is available
if [ ! -f "$STACKER_DIR/stacker.sh" ]; then
    echo "Error: Stacker framework not found at $STACKER_DIR"
    echo "Please ensure Stacker is properly installed"
    exit 1
fi

# Load Stacker framework
. "$STACKER_DIR/stacker.sh"

# Initialize Manager for Air scan
stacker_init "air-scan" \
             "https://github.com/akaoio/air.git" \
             "scan" \
             "Air P2P Network Scan"

# Configuration paths (XDG compliant via Manager)
SCAN_CONFIG="${SCAN_CONFIG:-$STACKER_CONFIG_DIR/scan.json}"
SCAN_STATE="${SCAN_STATE:-$STACKER_STATE_DIR/scan.state}"
SCAN_LOG="${SCAN_LOG:-$STACKER_DATA_DIR/scan.log}"

# Default values - domain-agnostic
DEFAULT_SCAN_METHOD="multicast"  # multicast, dns, dht, manual
DEFAULT_PEER_PREFIX="air-node"
DEFAULT_CHECK_INTERVAL=60
DEFAULT_MAX_PEERS=50
DEFAULT_PORT=8765

# Scan methods for different environments
ENABLE_MULTICAST="${ENABLE_MULTICAST:-true}"    # Local network scan
ENABLE_DNS="${ENABLE_DNS:-false}"               # DNS-based scan (optional)
ENABLE_DHT="${ENABLE_DHT:-true}"                # DHT-based scan (GUN native)
ENABLE_MANUAL="${ENABLE_MANUAL:-true}"          # Manual peer configuration

# Initialize scan system
init_scan() {
    stacker_log "Initializing Air scan system..."
    
    # Create necessary directories
    mkdir -p "$(dirname "$SCAN_CONFIG")"
    mkdir -p "$(dirname "$SCAN_STATE")"
    mkdir -p "$(dirname "$SCAN_LOG")"
    
    # Initialize configuration if not exists
    if [ ! -f "$SCAN_CONFIG" ]; then
        create_default_config
    fi
}

# Create default configuration - domain-agnostic
create_default_config() {
    cat > "$SCAN_CONFIG" << EOF
{
    "scan": {
        "methods": {
            "multicast": $ENABLE_MULTICAST,
            "dns": $ENABLE_DNS,
            "dht": $ENABLE_DHT,
            "manual": $ENABLE_MANUAL
        },
        "multicast": {
            "address": "239.255.42.99",
            "port": 8766,
            "interface": "auto"
        },
        "dns": {
            "enabled": false,
            "domain": "",
            "prefix": "$DEFAULT_PEER_PREFIX",
            "provider": ""
        },
        "dht": {
            "enabled": true,
            "bootstrap": [
                "gun.eco/gun",
                "gunjs.herokuapp.com/gun"
            ]
        },
        "manual": {
            "peers": []
        },
        "limits": {
            "max_peers": $DEFAULT_MAX_PEERS,
            "check_interval": $DEFAULT_CHECK_INTERVAL,
            "connection_timeout": 5000
        },
        "network": {
            "port": $DEFAULT_PORT,
            "bind": "0.0.0.0"
        }
    }
}
EOF
    chmod 600 "$SCAN_CONFIG"
    stacker_log "Created default scan configuration"
}

# Load scan configuration
load_scan_config() {
    if [ -f "$SCAN_CONFIG" ]; then
        # Load configuration values
        MULTICAST_ENABLED=$(grep -o '"multicast":[^,}]*' "$SCAN_CONFIG" | head -1 | cut -d: -f2 | tr -d ' ')
        DNS_ENABLED=$(grep -o '"dns":[^,}]*' "$SCAN_CONFIG" | head -1 | cut -d: -f2 | tr -d ' ')
        DHT_ENABLED=$(grep -o '"dht":[^,}]*' "$SCAN_CONFIG" | head -1 | cut -d: -f2 | tr -d ' ')
        MANUAL_ENABLED=$(grep -o '"manual":[^,}]*' "$SCAN_CONFIG" | head -1 | cut -d: -f2 | tr -d ' ')
        
        MAX_PEERS=$(grep -o '"max_peers":[^,}]*' "$SCAN_CONFIG" | cut -d: -f2 | tr -d ' ')
        CHECK_INTERVAL=$(grep -o '"check_interval":[^,}]*' "$SCAN_CONFIG" | cut -d: -f2 | tr -d ' ')
        AIR_PORT=$(grep -o '"port":[^,}]*' "$SCAN_CONFIG" | tail -1 | cut -d: -f2 | tr -d ' ')
    else
        # Use defaults
        MULTICAST_ENABLED=$ENABLE_MULTICAST
        DNS_ENABLED=$ENABLE_DNS
        DHT_ENABLED=$ENABLE_DHT
        MANUAL_ENABLED=$ENABLE_MANUAL
        MAX_PEERS=$DEFAULT_MAX_PEERS
        CHECK_INTERVAL=$DEFAULT_CHECK_INTERVAL
        AIR_PORT=$DEFAULT_PORT
    fi
}

# Multicast scan - find peers on local network
scan_multicast() {
    if [ "$MULTICAST_ENABLED" != "true" ]; then
        return
    fi
    
    stacker_log "Starting multicast scan on local network..."
    
    # This would typically use Node.js multicast from Air itself
    # Shell script triggers the Node.js scan module
    if [ -f "$STACKER_CLEAN_CLONE_DIR/dist/scan.js" ]; then
        node "$STACKER_CLEAN_CLONE_DIR/dist/scan.js" multicast &
        echo $! > "$STACKER_STATE_DIR/scan-multicast.pid"
    fi
}

# DHT scan - use GUN's native DHT
scan_dht() {
    if [ "$DHT_ENABLED" != "true" ]; then
        return
    fi
    
    stacker_log "Starting DHT-based peer scan..."
    
    # GUN handles DHT natively - just ensure bootstrap peers are configured
    # This is handled in the main Air application via GUN configuration
    echo "dht_enabled" > "$SCAN_STATE"
}

# DNS scan - optional, domain-agnostic
scan_dns() {
    if [ "$DNS_ENABLED" != "true" ]; then
        return
    fi
    
    # Only use DNS if explicitly configured with a domain
    local domain=$(grep -o '"domain":"[^"]*"' "$SCAN_CONFIG" | cut -d'"' -f4)
    if [ -z "$domain" ]; then
        stacker_warn "DNS scan enabled but no domain configured"
        return
    fi
    
    stacker_log "Starting DNS-based scan for domain: $domain"
    
    # Scan for peers via DNS TXT or A records
    local prefix=$(grep -o '"prefix":"[^"]*"' "$SCAN_CONFIG" | cut -d'"' -f4)
    prefix="${prefix:-$DEFAULT_PEER_PREFIX}"
    
    # Try to find peer records
    for i in $(seq 0 9); do
        local peer_host="${prefix}${i}.${domain}"
        if nslookup "$peer_host" >/dev/null 2>&1; then
            local peer_ip=$(nslookup "$peer_host" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
            if [ -n "$peer_ip" ]; then
                stacker_log "Found DNS peer: $peer_host ($peer_ip)"
                add_peer "$peer_ip" "$AIR_PORT"
            fi
        fi
    done
}

# Manual peer configuration
scan_manual() {
    if [ "$MANUAL_ENABLED" != "true" ]; then
        return
    fi
    
    stacker_log "Loading manual peer configuration..."
    
    # Extract manual peers from config
    # Format: ["host1:port1", "host2:port2", ...]
    local peers=$(grep -o '"peers":\[[^]]*\]' "$SCAN_CONFIG" | sed 's/.*\[//' | sed 's/\]//' | tr ',' '\n' | tr -d '"' | tr -d ' ')
    
    if [ -n "$peers" ]; then
        echo "$peers" | while read -r peer; do
            if [ -n "$peer" ]; then
                local host=$(echo "$peer" | cut -d: -f1)
                local port=$(echo "$peer" | cut -d: -f2)
                port="${port:-$AIR_PORT}"
                stacker_log "Adding manual peer: $host:$port"
                add_peer "$host" "$port"
            fi
        done
    fi
}

# Add a scanned peer
add_peer() {
    local host="$1"
    local port="${2:-$AIR_PORT}"
    
    # Save to state file
    echo "${host}:${port}" >> "$SCAN_STATE.peers"
    
    # Trigger connection in Air (via Node.js)
    if [ -f "$STACKER_CLEAN_CLONE_DIR/dist/cli.js" ]; then
        node "$STACKER_CLEAN_CLONE_DIR/dist/cli.js" connect "${host}:${port}" 2>/dev/null || true
    fi
}

# Show scanned peers
show_peers() {
    stacker_log "Current scanned peers:"
    
    if [ -f "$SCAN_STATE.peers" ]; then
        cat "$SCAN_STATE.peers" | sort -u | while read -r peer; do
            echo "  • $peer"
        done
    else
        echo "  No peers scanned yet"
    fi
    
    # Also show GUN's connected peers if Air is running
    if air_is_running; then
        echo ""
        echo "GUN Network Status:"
        if [ -f "$STACKER_CLEAN_CLONE_DIR/dist/cli.js" ]; then
            node "$STACKER_CLEAN_CLONE_DIR/dist/cli.js" peers 2>/dev/null || echo "  Unable to query GUN peers"
        fi
    fi
}

# Check if Air is running
air_is_running() {
    if [ -f "$STACKER_STATE_DIR/air.pid" ]; then
        local pid=$(cat "$STACKER_STATE_DIR/air.pid")
        kill -0 "$pid" 2>/dev/null
    else
        false
    fi
}

# Configure scan for a specific environment
configure_scan() {
    local method="$1"
    
    case "$method" in
        local)
            stacker_log "Configuring for local network scan only"
            sed -i 's/"multicast": [^,]*/"multicast": true/' "$SCAN_CONFIG"
            sed -i 's/"dns": [^,]*/"dns": false/' "$SCAN_CONFIG"
            sed -i 's/"dht": [^,]*/"dht": false/' "$SCAN_CONFIG"
            ;;
        global)
            stacker_log "Configuring for global P2P scan"
            sed -i 's/"multicast": [^,]*/"multicast": false/' "$SCAN_CONFIG"
            sed -i 's/"dns": [^,]*/"dns": false/' "$SCAN_CONFIG"
            sed -i 's/"dht": [^,]*/"dht": true/' "$SCAN_CONFIG"
            ;;
        hybrid)
            stacker_log "Configuring for hybrid scan (all methods)"
            sed -i 's/"multicast": [^,]*/"multicast": true/' "$SCAN_CONFIG"
            sed -i 's/"dns": [^,]*/"dns": false/' "$SCAN_CONFIG"
            sed -i 's/"dht": [^,]*/"dht": true/' "$SCAN_CONFIG"
            ;;
        dns)
            local domain="$2"
            if [ -z "$domain" ]; then
                stacker_error "DNS scan requires a domain"
                exit 1
            fi
            stacker_log "Configuring DNS scan for domain: $domain"
            sed -i 's/"dns": [^,]*/"dns": true/' "$SCAN_CONFIG"
            sed -i "s/\"domain\": \"[^\"]*\"/\"domain\": \"$domain\"/" "$SCAN_CONFIG"
            ;;
        *)
            stacker_error "Unknown scan method: $method"
            echo "Available methods: local, global, hybrid, dns <domain>"
            exit 1
            ;;
    esac
}

# Add a manual peer
add_manual_peer() {
    local peer="$1"
    
    if [ -z "$peer" ]; then
        stacker_error "Peer address required"
        exit 1
    fi
    
    stacker_log "Adding manual peer: $peer"
    
    # Add to config file with proper JSON array handling
    local config_file="$AIR_CONFIG_DIR/config.json"
    local temp_file="$(mktemp)"
    
    if [ -f "$config_file" ]; then
        # Check if peers array exists, if not create it
        if ! grep -q '"peers"' "$config_file"; then
            # Add empty peers array
            sed 's/}$/, "peers": [] }/' "$config_file" > "$temp_file"
        else
            cp "$config_file" "$temp_file"
        fi
        
        # Add peer to array (simple approach - replace empty array or add to existing)
        if grep -q '"peers"[[:space:]]*:[[:space:]]*\[\]' "$temp_file"; then
            # Empty array - add first peer
            sed 's/"peers"[[:space:]]*:[[:space:]]*\[\]/"peers": ["'$peer'"]/' "$temp_file" > "$SCAN_STATE.temp"
            mv "$SCAN_STATE.temp" "$temp_file"
        else
            # Non-empty array - add peer before closing bracket
            sed 's/"peers"[[:space:]]*:[[:space:]]*\[\([^]]*\)\]/"peers": [\1, "'$peer'"]/' "$temp_file" > "$SCAN_STATE.temp"
            mv "$SCAN_STATE.temp" "$temp_file"
        fi
        
        mv "$temp_file" "$config_file"
    else
        # Create new config with peer
        echo '{"peers": ["'$peer'"]}' > "$config_file"
    fi
    
    # Also maintain manual peers list for reference
    echo "$peer" >> "$SCAN_STATE.manual"
    
    # Try to connect immediately
    local host=$(echo "$peer" | cut -d: -f1)
    local port=$(echo "$peer" | cut -d: -f2)
    port="${port:-$AIR_PORT}"
    add_peer "$host" "$port"
}

# Main scan daemon
run_scan_daemon() {
    stacker_log "Starting Air scan daemon..."
    
    # Initialize
    init_scan
    load_scan_config
    
    # Start scan methods
    scan_multicast
    scan_dht
    scan_dns
    scan_manual
    
    # Monitor and refresh
    while true; do
        sleep "$CHECK_INTERVAL"
        
        # Refresh peer list
        if [ "$DNS_ENABLED" = "true" ]; then
            scan_dns
        fi
        
        # Check peer health
        # This would be done by the Node.js Air application
        
        stacker_log "Scan cycle completed, next check in ${CHECK_INTERVAL}s"
    done
}

# Command line interface
case "${1:-help}" in
    start)
        run_scan_daemon
        ;;
    show|peers)
        show_peers
        ;;
    configure)
        configure_scan "$2" "$3"
        ;;
    add)
        add_manual_peer "$2"
        ;;
    init)
        init_scan
        stacker_log "Scan system initialized"
        ;;
    help)
        cat << EOF
Air Network Scan - Domain-Agnostic P2P System

Usage: ./scan.sh [command] [options]

Commands:
  start           Start scan daemon
  show, peers     Show scanned peers
  configure TYPE  Configure scan method
                  Types: local, global, hybrid, dns <domain>
  add PEER        Add manual peer (host:port)
  init            Initialize scan configuration
  help            Show this help message

Scan Methods:
  • Multicast - Scan peers on local network (LAN)
  • DHT - Distributed hash table via GUN network
  • DNS - Optional DNS-based scan (if domain configured)
  • Manual - Explicitly configured peer addresses

Examples:
  ./scan.sh start              # Start scan daemon
  ./scan.sh configure global   # Use DHT for global scan
  ./scan.sh configure dns example.com  # Enable DNS scan
  ./scan.sh add 192.168.1.100:8765    # Add manual peer
  ./scan.sh show                # Show all scanned peers

Air is designed for the world, not tied to any specific domain.
Default configuration uses DHT for global P2P scan.
EOF
        ;;
    *)
        stacker_error "Unknown command: $1"
        echo "Use './scan.sh help' for usage information"
        exit 1
        ;;
esac