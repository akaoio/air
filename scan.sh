#!/bin/sh
# Air Network Scan Module - Domain-Agnostic P2P System
# Enables Air nodes to discover and connect to peers globally
# Not tied to any specific domain - works for the world

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

# Initialize Manager for Air discovery
manager_init "air-discovery" \
             "https://github.com/akaoio/air.git" \
             "discovery" \
             "Air P2P Network Discovery"

# Configuration paths (XDG compliant via Manager)
DISCOVERY_CONFIG="${DISCOVERY_CONFIG:-$MANAGER_CONFIG_DIR/discovery.json}"
DISCOVERY_STATE="${DISCOVERY_STATE:-$MANAGER_STATE_DIR/discovery.state}"
DISCOVERY_LOG="${DISCOVERY_LOG:-$MANAGER_DATA_DIR/discovery.log}"

# Default values - domain-agnostic
DEFAULT_DISCOVERY_METHOD="multicast"  # multicast, dns, dht, manual
DEFAULT_PEER_PREFIX="air-node"
DEFAULT_CHECK_INTERVAL=60
DEFAULT_MAX_PEERS=50
DEFAULT_PORT=8765

# Discovery methods for different environments
ENABLE_MULTICAST="${ENABLE_MULTICAST:-true}"    # Local network discovery
ENABLE_DNS="${ENABLE_DNS:-false}"               # DNS-based discovery (optional)
ENABLE_DHT="${ENABLE_DHT:-true}"                # DHT-based discovery (GUN native)
ENABLE_MANUAL="${ENABLE_MANUAL:-true}"          # Manual peer configuration

# Initialize discovery system
init_discovery() {
    manager_log "Initializing Air discovery system..."
    
    # Create necessary directories
    mkdir -p "$(dirname "$DISCOVERY_CONFIG")"
    mkdir -p "$(dirname "$DISCOVERY_STATE")"
    mkdir -p "$(dirname "$DISCOVERY_LOG")"
    
    # Initialize configuration if not exists
    if [ ! -f "$DISCOVERY_CONFIG" ]; then
        create_default_config
    fi
}

# Create default configuration - domain-agnostic
create_default_config() {
    cat > "$DISCOVERY_CONFIG" << EOF
{
    "discovery": {
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
    chmod 600 "$DISCOVERY_CONFIG"
    manager_log "Created default discovery configuration"
}

# Load discovery configuration
load_discovery_config() {
    if [ -f "$DISCOVERY_CONFIG" ]; then
        # Load configuration values
        MULTICAST_ENABLED=$(grep -o '"multicast":[^,}]*' "$DISCOVERY_CONFIG" | head -1 | cut -d: -f2 | tr -d ' ')
        DNS_ENABLED=$(grep -o '"dns":[^,}]*' "$DISCOVERY_CONFIG" | head -1 | cut -d: -f2 | tr -d ' ')
        DHT_ENABLED=$(grep -o '"dht":[^,}]*' "$DISCOVERY_CONFIG" | head -1 | cut -d: -f2 | tr -d ' ')
        MANUAL_ENABLED=$(grep -o '"manual":[^,}]*' "$DISCOVERY_CONFIG" | head -1 | cut -d: -f2 | tr -d ' ')
        
        MAX_PEERS=$(grep -o '"max_peers":[^,}]*' "$DISCOVERY_CONFIG" | cut -d: -f2 | tr -d ' ')
        CHECK_INTERVAL=$(grep -o '"check_interval":[^,}]*' "$DISCOVERY_CONFIG" | cut -d: -f2 | tr -d ' ')
        AIR_PORT=$(grep -o '"port":[^,}]*' "$DISCOVERY_CONFIG" | tail -1 | cut -d: -f2 | tr -d ' ')
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

# Multicast discovery - find peers on local network
discover_multicast() {
    if [ "$MULTICAST_ENABLED" != "true" ]; then
        return
    fi
    
    manager_log "Starting multicast discovery on local network..."
    
    # This would typically use Node.js multicast from Air itself
    # Shell script triggers the Node.js discovery module
    if [ -f "$MANAGER_CLEAN_CLONE_DIR/dist/discovery.js" ]; then
        node "$MANAGER_CLEAN_CLONE_DIR/dist/discovery.js" multicast &
        echo $! > "$MANAGER_STATE_DIR/discovery-multicast.pid"
    fi
}

# DHT discovery - use GUN's native DHT
discover_dht() {
    if [ "$DHT_ENABLED" != "true" ]; then
        return
    fi
    
    manager_log "Starting DHT-based peer discovery..."
    
    # GUN handles DHT natively - just ensure bootstrap peers are configured
    # This is handled in the main Air application via GUN configuration
    echo "dht_enabled" > "$DISCOVERY_STATE"
}

# DNS discovery - optional, domain-agnostic
discover_dns() {
    if [ "$DNS_ENABLED" != "true" ]; then
        return
    fi
    
    # Only use DNS if explicitly configured with a domain
    local domain=$(grep -o '"domain":"[^"]*"' "$DISCOVERY_CONFIG" | cut -d'"' -f4)
    if [ -z "$domain" ]; then
        manager_warn "DNS discovery enabled but no domain configured"
        return
    fi
    
    manager_log "Starting DNS-based discovery for domain: $domain"
    
    # Discover peers via DNS TXT or A records
    local prefix=$(grep -o '"prefix":"[^"]*"' "$DISCOVERY_CONFIG" | cut -d'"' -f4)
    prefix="${prefix:-$DEFAULT_PEER_PREFIX}"
    
    # Try to find peer records
    for i in $(seq 0 9); do
        local peer_host="${prefix}${i}.${domain}"
        if nslookup "$peer_host" >/dev/null 2>&1; then
            local peer_ip=$(nslookup "$peer_host" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
            if [ -n "$peer_ip" ]; then
                manager_log "Found DNS peer: $peer_host ($peer_ip)"
                add_peer "$peer_ip" "$AIR_PORT"
            fi
        fi
    done
}

# Manual peer configuration
discover_manual() {
    if [ "$MANUAL_ENABLED" != "true" ]; then
        return
    fi
    
    manager_log "Loading manual peer configuration..."
    
    # Extract manual peers from config
    # Format: ["host1:port1", "host2:port2", ...]
    local peers=$(grep -o '"peers":\[[^]]*\]' "$DISCOVERY_CONFIG" | sed 's/.*\[//' | sed 's/\]//' | tr ',' '\n' | tr -d '"' | tr -d ' ')
    
    if [ -n "$peers" ]; then
        echo "$peers" | while read -r peer; do
            if [ -n "$peer" ]; then
                local host=$(echo "$peer" | cut -d: -f1)
                local port=$(echo "$peer" | cut -d: -f2)
                port="${port:-$AIR_PORT}"
                manager_log "Adding manual peer: $host:$port"
                add_peer "$host" "$port"
            fi
        done
    fi
}

# Add a discovered peer
add_peer() {
    local host="$1"
    local port="${2:-$AIR_PORT}"
    
    # Save to state file
    echo "${host}:${port}" >> "$DISCOVERY_STATE.peers"
    
    # Trigger connection in Air (via Node.js)
    if [ -f "$MANAGER_CLEAN_CLONE_DIR/dist/cli.js" ]; then
        node "$MANAGER_CLEAN_CLONE_DIR/dist/cli.js" connect "${host}:${port}" 2>/dev/null || true
    fi
}

# Show discovered peers
show_peers() {
    manager_log "Current discovered peers:"
    
    if [ -f "$DISCOVERY_STATE.peers" ]; then
        cat "$DISCOVERY_STATE.peers" | sort -u | while read -r peer; do
            echo "  • $peer"
        done
    else
        echo "  No peers discovered yet"
    fi
    
    # Also show GUN's connected peers if Air is running
    if air_is_running; then
        echo ""
        echo "GUN Network Status:"
        if [ -f "$MANAGER_CLEAN_CLONE_DIR/dist/cli.js" ]; then
            node "$MANAGER_CLEAN_CLONE_DIR/dist/cli.js" peers 2>/dev/null || echo "  Unable to query GUN peers"
        fi
    fi
}

# Check if Air is running
air_is_running() {
    if [ -f "$MANAGER_STATE_DIR/air.pid" ]; then
        local pid=$(cat "$MANAGER_STATE_DIR/air.pid")
        kill -0 "$pid" 2>/dev/null
    else
        false
    fi
}

# Configure discovery for a specific environment
configure_discovery() {
    local method="$1"
    
    case "$method" in
        local)
            manager_log "Configuring for local network discovery only"
            sed -i 's/"multicast": [^,]*/"multicast": true/' "$DISCOVERY_CONFIG"
            sed -i 's/"dns": [^,]*/"dns": false/' "$DISCOVERY_CONFIG"
            sed -i 's/"dht": [^,]*/"dht": false/' "$DISCOVERY_CONFIG"
            ;;
        global)
            manager_log "Configuring for global P2P discovery"
            sed -i 's/"multicast": [^,]*/"multicast": false/' "$DISCOVERY_CONFIG"
            sed -i 's/"dns": [^,]*/"dns": false/' "$DISCOVERY_CONFIG"
            sed -i 's/"dht": [^,]*/"dht": true/' "$DISCOVERY_CONFIG"
            ;;
        hybrid)
            manager_log "Configuring for hybrid discovery (all methods)"
            sed -i 's/"multicast": [^,]*/"multicast": true/' "$DISCOVERY_CONFIG"
            sed -i 's/"dns": [^,]*/"dns": false/' "$DISCOVERY_CONFIG"
            sed -i 's/"dht": [^,]*/"dht": true/' "$DISCOVERY_CONFIG"
            ;;
        dns)
            local domain="$2"
            if [ -z "$domain" ]; then
                manager_error "DNS discovery requires a domain"
                exit 1
            fi
            manager_log "Configuring DNS discovery for domain: $domain"
            sed -i 's/"dns": [^,]*/"dns": true/' "$DISCOVERY_CONFIG"
            sed -i "s/\"domain\": \"[^\"]*\"/\"domain\": \"$domain\"/" "$DISCOVERY_CONFIG"
            ;;
        *)
            manager_error "Unknown discovery method: $method"
            echo "Available methods: local, global, hybrid, dns <domain>"
            exit 1
            ;;
    esac
}

# Add a manual peer
add_manual_peer() {
    local peer="$1"
    
    if [ -z "$peer" ]; then
        manager_error "Peer address required"
        exit 1
    fi
    
    manager_log "Adding manual peer: $peer"
    
    # Add to config file
    # TODO: Implement JSON array manipulation in POSIX shell
    echo "$peer" >> "$DISCOVERY_STATE.manual"
    
    # Try to connect immediately
    local host=$(echo "$peer" | cut -d: -f1)
    local port=$(echo "$peer" | cut -d: -f2)
    port="${port:-$AIR_PORT}"
    add_peer "$host" "$port"
}

# Main discovery daemon
run_discovery_daemon() {
    manager_log "Starting Air discovery daemon..."
    
    # Initialize
    init_discovery
    load_discovery_config
    
    # Start discovery methods
    discover_multicast
    discover_dht
    discover_dns
    discover_manual
    
    # Monitor and refresh
    while true; do
        sleep "$CHECK_INTERVAL"
        
        # Refresh peer list
        if [ "$DNS_ENABLED" = "true" ]; then
            discover_dns
        fi
        
        # Check peer health
        # This would be done by the Node.js Air application
        
        manager_log "Discovery cycle completed, next check in ${CHECK_INTERVAL}s"
    done
}

# Command line interface
case "${1:-help}" in
    start)
        run_discovery_daemon
        ;;
    show|peers)
        show_peers
        ;;
    configure)
        configure_discovery "$2" "$3"
        ;;
    add)
        add_manual_peer "$2"
        ;;
    init)
        init_discovery
        manager_log "Discovery system initialized"
        ;;
    help)
        cat << EOF
Air Network Discovery - Domain-Agnostic P2P System

Usage: ./discovery.sh [command] [options]

Commands:
  start           Start discovery daemon
  show, peers     Show discovered peers
  configure TYPE  Configure discovery method
                  Types: local, global, hybrid, dns <domain>
  add PEER        Add manual peer (host:port)
  init            Initialize discovery configuration
  help            Show this help message

Discovery Methods:
  • Multicast - Discover peers on local network (LAN)
  • DHT - Distributed hash table via GUN network
  • DNS - Optional DNS-based discovery (if domain configured)
  • Manual - Explicitly configured peer addresses

Examples:
  ./discovery.sh start              # Start discovery daemon
  ./discovery.sh configure global   # Use DHT for global discovery
  ./discovery.sh configure dns example.com  # Enable DNS discovery
  ./discovery.sh add 192.168.1.100:8765    # Add manual peer
  ./discovery.sh show                # Show all discovered peers

Air is designed for the world, not tied to any specific domain.
Default configuration uses DHT for global P2P discovery.
EOF
        ;;
    *)
        manager_error "Unknown command: $1"
        echo "Use './discovery.sh help' for usage information"
        exit 1
        ;;
esac