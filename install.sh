#!/bin/sh
# Air Installation v2.0 - Human-Friendly Experience
# Powered by Manager Framework - No Hardcoded Values
# Designed for Global Usage

set -e

# Colors for better UX
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Dynamic configuration - NO HARDCODED VALUES
AIR_CONFIG_FILE="${HOME}/.config/air/install.conf"
AIR_PROFILES_DIR="${HOME}/.config/air/profiles"

# Create config directories
mkdir -p "$(dirname "$AIR_CONFIG_FILE")"
mkdir -p "$AIR_PROFILES_DIR"

# Display welcome with ASCII art
show_welcome() {
    clear
    echo "${CYAN}"
    cat << 'EOF'
     ╔═══════════════════════════════════════════════════╗
     ║                                                   ║
     ║           ░█▀█░▀█▀░█▀▄                          ║
     ║           ░█▀█░░█░░█▀▄                          ║
     ║           ░▀░▀░▀▀▀░▀░▀                          ║
     ║                                                   ║
     ║     Distributed P2P Database for the World       ║
     ║           Powered by Manager Framework           ║
     ╚═══════════════════════════════════════════════════╝
EOF
    echo "${NC}"
    echo "${WHITE}Welcome to Air Installation Experience v2.0${NC}"
    echo "${YELLOW}We'll guide you through a personalized setup${NC}"
    echo ""
    printf "${GREEN}Press ENTER to continue...${NC}"
    read -r _
}

# Load or create user profile
load_profile() {
    echo ""
    echo "${CYAN}═══ User Profile ═══${NC}"
    echo ""
    echo "Select your profile:"
    echo "  ${GREEN}1)${NC} 🚀 Developer (optimized for development)"
    echo "  ${GREEN}2)${NC} 🏢 Enterprise (production-ready, high security)"
    echo "  ${GREEN}3)${NC} 👤 Personal (simple, resource-efficient)"
    echo "  ${GREEN}4)${NC} 🌍 Global Node (contribute to worldwide network)"
    echo "  ${GREEN}5)${NC} ⚙️  Custom (configure everything)"
    echo "  ${GREEN}6)${NC} 📁 Load saved profile"
    echo ""
    printf "${YELLOW}Your choice [1-6]: ${NC}"
    read -r profile_choice
    
    case "$profile_choice" in
        1) load_developer_profile ;;
        2) load_enterprise_profile ;;
        3) load_personal_profile ;;
        4) load_global_profile ;;
        5) custom_configuration ;;
        6) load_saved_profile ;;
        *) echo "${RED}Invalid choice${NC}"; load_profile ;;
    esac
}

# Developer profile - optimized for development
load_developer_profile() {
    echo "${GREEN}✓ Loading Developer Profile${NC}"
    export AIR_PROFILE="developer"
    export AIR_PORT="${AIR_PORT:-8765}"
    export AIR_ENV="development"
    export AIR_AUTO_UPDATE="false"
    export AIR_MONITORING="true"
    export AIR_P2P_MODE="local"
    export AIR_SERVICE_TYPE="manual"
    export AIR_LOG_LEVEL="debug"
    export AIR_PEER_LIMIT="10"
    export AIR_DATA_DIR="${HOME}/dev/air/data"
}

# Enterprise profile - production ready
load_enterprise_profile() {
    echo "${GREEN}✓ Loading Enterprise Profile${NC}"
    export AIR_PROFILE="enterprise"
    export AIR_PORT="${AIR_PORT:-8765}"
    export AIR_ENV="production"
    export AIR_AUTO_UPDATE="true"
    export AIR_MONITORING="true"
    export AIR_P2P_MODE="global"
    export AIR_SERVICE_TYPE="systemd"
    export AIR_LOG_LEVEL="info"
    export AIR_PEER_LIMIT="1000"
    export AIR_DATA_DIR="/var/lib/air"
    export AIR_BACKUP="true"
    export AIR_SECURITY="enhanced"
}

# Personal profile - simple and efficient
load_personal_profile() {
    echo "${GREEN}✓ Loading Personal Profile${NC}"
    export AIR_PROFILE="personal"
    export AIR_PORT="${AIR_PORT:-8765}"
    export AIR_ENV="production"
    export AIR_AUTO_UPDATE="true"
    export AIR_MONITORING="false"
    export AIR_P2P_MODE="hybrid"
    export AIR_SERVICE_TYPE="cron"
    export AIR_LOG_LEVEL="warn"
    export AIR_PEER_LIMIT="50"
    export AIR_DATA_DIR="${HOME}/.local/share/air"
}

# Global node profile - contribute to network
load_global_profile() {
    echo "${GREEN}✓ Loading Global Node Profile${NC}"
    export AIR_PROFILE="global"
    export AIR_PORT="${AIR_PORT:-8765}"
    export AIR_ENV="production"
    export AIR_AUTO_UPDATE="true"
    export AIR_MONITORING="true"
    export AIR_P2P_MODE="global"
    export AIR_SERVICE_TYPE="redundant"
    export AIR_LOG_LEVEL="info"
    export AIR_PEER_LIMIT="unlimited"
    export AIR_DATA_DIR="${HOME}/.local/share/air"
    export AIR_RELAY="true"
    export AIR_DISCOVERY="aggressive"
}

# Custom configuration - full control
custom_configuration() {
    echo ""
    echo "${CYAN}═══ Custom Configuration ═══${NC}"
    echo ""
    
    # Network Configuration
    echo "${YELLOW}Network Settings:${NC}"
    printf "  Port number [8765]: "
    read -r custom_port
    AIR_PORT="${custom_port:-8765}"
    
    printf "  Bind address [0.0.0.0]: "
    read -r custom_bind
    AIR_BIND="${custom_bind:-0.0.0.0}"
    
    echo ""
    echo "P2P Network Mode:"
    echo "  1) Local only (development)"
    echo "  2) Hybrid (local + select peers)"
    echo "  3) Global (connect worldwide)"
    printf "Choice [1-3]: "
    read -r p2p_mode
    case "$p2p_mode" in
        1) AIR_P2P_MODE="local" ;;
        2) AIR_P2P_MODE="hybrid" ;;
        3) AIR_P2P_MODE="global" ;;
        *) AIR_P2P_MODE="hybrid" ;;
    esac
    
    # Service Configuration
    echo ""
    echo "${YELLOW}Service Configuration:${NC}"
    echo "How should Air run?"
    echo "  1) Manual (start/stop manually)"
    echo "  2) Systemd service"
    echo "  3) Cron job"
    echo "  4) Both systemd + cron (redundant)"
    printf "Choice [1-4]: "
    read -r service_type
    case "$service_type" in
        1) AIR_SERVICE_TYPE="manual" ;;
        2) AIR_SERVICE_TYPE="systemd" ;;
        3) AIR_SERVICE_TYPE="cron" ;;
        4) AIR_SERVICE_TYPE="redundant" ;;
        *) AIR_SERVICE_TYPE="manual" ;;
    esac
    
    # Advanced Options
    echo ""
    echo "${YELLOW}Advanced Options:${NC}"
    
    printf "Enable auto-updates? [y/N]: "
    read -r auto_update
    case "$auto_update" in
        [yY]*) AIR_AUTO_UPDATE="true" ;;
        *) AIR_AUTO_UPDATE="false" ;;
    esac
    
    printf "Enable monitoring? [Y/n]: "
    read -r monitoring
    case "$monitoring" in
        [nN]*) AIR_MONITORING="false" ;;
        *) AIR_MONITORING="true" ;;
    esac
    
    printf "Max peer connections [100]: "
    read -r peer_limit
    AIR_PEER_LIMIT="${peer_limit:-100}"
    
    printf "Log level (debug/info/warn/error) [info]: "
    read -r log_level
    AIR_LOG_LEVEL="${log_level:-info}"
    
    # Data Storage
    echo ""
    echo "${YELLOW}Data Storage:${NC}"
    printf "Data directory [${HOME}/.local/share/air]: "
    read -r data_dir
    AIR_DATA_DIR="${data_dir:-${HOME}/.local/share/air}"
    
    # Save custom profile
    printf "${GREEN}Save this configuration as profile? [y/N]: ${NC}"
    read -r save_profile
    if [ "$save_profile" = "y" ] || [ "$save_profile" = "Y" ]; then
        printf "Profile name: "
        read -r profile_name
        save_current_profile "$profile_name"
    fi
}

# Load saved profile
load_saved_profile() {
    echo ""
    echo "${CYAN}Available Profiles:${NC}"
    ls -1 "$AIR_PROFILES_DIR" 2>/dev/null | sed 's/\.conf$//' | nl
    printf "${YELLOW}Select profile number: ${NC}"
    read -r profile_num
    
    profile_file=$(ls -1 "$AIR_PROFILES_DIR" 2>/dev/null | sed -n "${profile_num}p")
    if [ -f "$AIR_PROFILES_DIR/$profile_file" ]; then
        . "$AIR_PROFILES_DIR/$profile_file"
        echo "${GREEN}✓ Profile loaded: ${profile_file%.conf}${NC}"
    else
        echo "${RED}Profile not found${NC}"
        load_profile
    fi
}

# Save current configuration as profile
save_current_profile() {
    local profile_name="$1"
    local profile_file="$AIR_PROFILES_DIR/${profile_name}.conf"
    
    cat > "$profile_file" << EOF
# Air Profile: $profile_name
# Created: $(date)

export AIR_PROFILE="$profile_name"
export AIR_PORT="${AIR_PORT}"
export AIR_BIND="${AIR_BIND:-0.0.0.0}"
export AIR_ENV="${AIR_ENV:-production}"
export AIR_AUTO_UPDATE="${AIR_AUTO_UPDATE}"
export AIR_MONITORING="${AIR_MONITORING}"
export AIR_P2P_MODE="${AIR_P2P_MODE}"
export AIR_SERVICE_TYPE="${AIR_SERVICE_TYPE}"
export AIR_LOG_LEVEL="${AIR_LOG_LEVEL}"
export AIR_PEER_LIMIT="${AIR_PEER_LIMIT}"
export AIR_DATA_DIR="${AIR_DATA_DIR}"
EOF
    
    echo "${GREEN}✓ Profile saved: $profile_name${NC}"
}

# Show configuration summary
show_summary() {
    echo ""
    echo "${CYAN}═══ Configuration Summary ═══${NC}"
    echo ""
    echo "${WHITE}Profile:${NC} ${AIR_PROFILE:-custom}"
    echo "${WHITE}Network:${NC}"
    echo "  • Port: ${AIR_PORT}"
    echo "  • Bind: ${AIR_BIND:-0.0.0.0}"
    echo "  • P2P Mode: ${AIR_P2P_MODE}"
    echo "  • Max Peers: ${AIR_PEER_LIMIT}"
    echo ""
    echo "${WHITE}Service:${NC}"
    echo "  • Type: ${AIR_SERVICE_TYPE}"
    echo "  • Auto-update: ${AIR_AUTO_UPDATE}"
    echo "  • Monitoring: ${AIR_MONITORING}"
    echo ""
    echo "${WHITE}Storage:${NC}"
    echo "  • Data: ${AIR_DATA_DIR}"
    echo "  • Config: ${HOME}/.config/air"
    echo ""
    echo "${WHITE}Environment:${NC}"
    echo "  • Mode: ${AIR_ENV:-production}"
    echo "  • Log Level: ${AIR_LOG_LEVEL}"
    echo ""
}

# Confirm installation
confirm_installation() {
    show_summary
    echo "${YELLOW}═════════════════════════════${NC}"
    printf "${GREEN}Proceed with installation? [Y/n]: ${NC}"
    read -r confirm
    
    case "$confirm" in
        [nN]*) 
            echo "${YELLOW}Installation cancelled${NC}"
            echo "Your configuration has been saved."
            exit 0
            ;;
    esac
}

# Find and load Manager framework
find_manager() {
    # Check multiple locations for Manager
    for location in \
        "./manager" \
        "../manager" \
        "${HOME}/manager" \
        "${HOME}/.local/lib/manager" \
        "/usr/local/lib/manager"
    do
        if [ -f "$location/manager.sh" ]; then
            export MANAGER_DIR="$location"
            return 0
        fi
    done
    
    # Manager not found - offer to install
    echo ""
    echo "${YELLOW}Manager Framework not found.${NC}"
    echo "Manager is required for Air installation."
    printf "${GREEN}Install Manager Framework? [Y/n]: ${NC}"
    read -r install_manager
    
    case "$install_manager" in
        [nN]*) 
            echo "${RED}Cannot proceed without Manager Framework${NC}"
            exit 1
            ;;
    esac
    
    echo "${CYAN}Installing Manager Framework...${NC}"
    git clone https://github.com/akaoio/manager.git "${HOME}/.local/lib/manager" || {
        echo "${RED}Failed to install Manager Framework${NC}"
        exit 1
    }
    export MANAGER_DIR="${HOME}/.local/lib/manager"
}

# Perform installation using Manager
perform_installation() {
    echo ""
    echo "${CYAN}═══ Installing Air ═══${NC}"
    echo ""
    
    # Load Manager framework
    . "$MANAGER_DIR/manager.sh"
    
    # Initialize Manager for Air
    manager_init "air" \
                 "https://github.com/akaoio/air.git" \
                 "air.sh" \
                 "Distributed P2P Database System"
    
    # Build installation arguments based on configuration
    local install_args=""
    
    case "$AIR_SERVICE_TYPE" in
        systemd) install_args="--service" ;;
        cron) install_args="--cron" ;;
        redundant) install_args="--service --cron" ;;
    esac
    
    if [ "$AIR_AUTO_UPDATE" = "true" ]; then
        install_args="$install_args --auto-update"
    fi
    
    # Execute Manager installation
    manager_install $install_args || {
        echo "${RED}Installation failed${NC}"
        exit 1
    }
    
    # Configure Air with user settings
    configure_air
    
    echo ""
    echo "${GREEN}✓ Air installation completed successfully!${NC}"
}

# Configure Air with user settings
configure_air() {
    local config_file="${HOME}/.config/air/config.json"
    
    # Create configuration from environment
    cat > "$config_file" << EOF
{
  "port": ${AIR_PORT},
  "bind": "${AIR_BIND:-0.0.0.0}",
  "env": "${AIR_ENV:-production}",
  "p2p": {
    "mode": "${AIR_P2P_MODE}",
    "maxPeers": ${AIR_PEER_LIMIT:-100},
    "discovery": ${AIR_DISCOVERY:-true}
  },
  "monitoring": ${AIR_MONITORING:-true},
  "autoUpdate": ${AIR_AUTO_UPDATE:-false},
  "logging": {
    "level": "${AIR_LOG_LEVEL:-info}",
    "file": "${AIR_DATA_DIR}/logs/air.log"
  },
  "storage": {
    "dataDir": "${AIR_DATA_DIR}",
    "configDir": "${HOME}/.config/air",
    "stateDir": "${HOME}/.local/state/air"
  },
  "profile": "${AIR_PROFILE:-custom}"
}
EOF
}

# Post-installation actions
post_installation() {
    echo ""
    echo "${CYAN}═══ Next Steps ═══${NC}"
    echo ""
    
    case "$AIR_SERVICE_TYPE" in
        systemd)
            echo "Start Air service:"
            echo "  ${GREEN}sudo systemctl start air${NC}"
            echo ""
            echo "Check status:"
            echo "  ${GREEN}sudo systemctl status air${NC}"
            ;;
        cron)
            echo "Air will start automatically via cron."
            echo ""
            echo "Start manually:"
            echo "  ${GREEN}air start${NC}"
            ;;
        manual)
            echo "Start Air:"
            echo "  ${GREEN}air start${NC}"
            echo ""
            echo "Stop Air:"
            echo "  ${GREEN}air stop${NC}"
            ;;
    esac
    
    echo ""
    echo "View logs:"
    echo "  ${GREEN}air logs${NC}"
    echo ""
    echo "Configuration:"
    echo "  ${GREEN}${HOME}/.config/air/config.json${NC}"
    echo ""
    echo "${MAGENTA}Thank you for installing Air!${NC}"
    echo "${YELLOW}Join our global P2P network: https://air.akao.io${NC}"
}

# Main installation flow
main() {
    show_welcome
    find_manager
    load_profile
    confirm_installation
    perform_installation
    post_installation
}

# Handle arguments for non-interactive mode
case "$1" in
    --developer|--dev)
        load_developer_profile
        find_manager
        perform_installation
        ;;
    --enterprise|--prod)
        load_enterprise_profile
        find_manager
        perform_installation
        ;;
    --personal)
        load_personal_profile
        find_manager
        perform_installation
        ;;
    --global)
        load_global_profile
        find_manager
        perform_installation
        ;;
    --help|-h)
        echo "Air Installation v2.0"
        echo ""
        echo "Usage:"
        echo "  $0              Interactive installation"
        echo "  $0 --developer  Developer profile"
        echo "  $0 --enterprise Enterprise profile"
        echo "  $0 --personal   Personal profile"
        echo "  $0 --global     Global node profile"
        echo ""
        ;;
    *)
        main
        ;;
esac