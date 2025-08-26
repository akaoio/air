#!/bin/sh
# Air installation script - Following Access philosophy
# Pure shell implementation with clean clone architecture

set -e

# Configuration
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
REPO_URL="${REPO_URL:-https://github.com/akaoio/air.git}"
CLEAN_CLONE_DIR="$HOME/air"
SCRIPT_NAME="air"
VERSION="2.0.0"

# Colors for output (if terminal supports it)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

log() {
    echo "${GREEN}[Air]${NC} $*"
}

warn() {
    echo "${YELLOW}[Warning]${NC} $*"
}

error() {
    echo "${RED}[Error]${NC} $*" >&2
}

# Display header
show_header() {
    echo "=================================================="
    echo "  Air - P2P Database & Real-time Sync v${VERSION}"
    echo "  Pure Node.js | XDG Compliant | Clean Clone Install"
    echo "=================================================="
    echo ""
}

# Check for required tools
check_requirements() {
    local missing=""
    local missing_packages=""
    
    # Check for git (required for clean clone)
    if ! command -v git >/dev/null 2>&1; then
        missing="$missing git"
        missing_packages="$missing_packages git"
    fi
    
    # Check for Node.js
    if ! command -v node >/dev/null 2>&1; then
        missing="$missing node"
        missing_packages="$missing_packages nodejs"
    fi
    
    # Check for npm
    if ! command -v npm >/dev/null 2>&1; then
        missing="$missing npm"
        missing_packages="$missing_packages npm"
    fi
    
    if [ -n "$missing" ]; then
        error "Missing required tools:$missing"
        error "Please install the following packages: $missing_packages"
        log "On Ubuntu/Debian: sudo apt update && sudo apt install $missing_packages"
        log "On RHEL/CentOS: sudo yum install $missing_packages"
        log "On macOS: brew install node git"
        exit 1
    fi
    
    log "✓ All requirements satisfied"
}

# Create clean clone of Air repository
create_clean_clone() {
    log "Creating clean clone at $CLEAN_CLONE_DIR..."
    
    current_dir=$(pwd)
    
    # SMART UPDATE: If running from target directory, update in place instead of deleting
    if [ "$current_dir" = "$CLEAN_CLONE_DIR" ]; then
        log "Running from Air directory - updating in place with git..."
        
        # Check if this is a git repository
        if [ -d ".git" ]; then
            log "Updating existing Air repository..."
            git fetch origin >/dev/null 2>&1 || {
                warn "Failed to fetch updates, continuing with existing version"
            }
            
            # Check if we're behind
            LOCAL=$(git rev-parse HEAD 2>/dev/null)
            REMOTE=$(git rev-parse origin/main 2>/dev/null || git rev-parse origin/master 2>/dev/null)
            
            if [ "$LOCAL" != "$REMOTE" ]; then
                log "Updates available, pulling changes..."
                git pull origin main >/dev/null 2>&1 || git pull origin master >/dev/null 2>&1 || {
                    warn "Failed to pull updates, continuing with existing version"
                }
            else
                log "Already up to date"
            fi
        else
            error "Current directory is not a git repository"
            exit 1
        fi
        
        # Set clean clone dir to current directory for installation
        CLEAN_CLONE_DIR="$current_dir"
        return 0
    fi
    
    # Normal clean clone for external installation
    if [ -d "$CLEAN_CLONE_DIR" ]; then
        log "Removing existing Air clone..."
        rm -rf "$CLEAN_CLONE_DIR"
    fi
    
    # Clone fresh repository
    git clone "$REPO_URL" "$CLEAN_CLONE_DIR" || {
        error "Failed to clone Air repository from $REPO_URL"
        exit 1
    }
    
    # Verify main.js exists in clean clone
    if [ ! -f "$CLEAN_CLONE_DIR/main.js" ]; then
        error "Clean clone missing main.js - repository structure may be incorrect"
        exit 1
    fi
    
    log "✓ Clean clone created successfully"
}

# Install Air from clean clone
install_air() {
    log "Installing Air from clean clone..."
    
    # Change to clean clone directory
    cd "$CLEAN_CLONE_DIR" || {
        error "Failed to enter clean clone directory"
        exit 1
    }
    
    # Install npm dependencies
    log "Installing npm dependencies..."
    npm install --production >/dev/null 2>&1 || {
        error "Failed to install npm dependencies"
        exit 1
    }
    
    # Create XDG-compliant config directory
    mkdir -p "$HOME/.config/air"
    mkdir -p "$HOME/.local/share/air"
    mkdir -p "$HOME/.local/state/air"
    
    # Create air wrapper script
    local wrapper_script="$INSTALL_DIR/$SCRIPT_NAME"
    log "Creating Air wrapper script at $wrapper_script..."
    
    cat > /tmp/air-wrapper << 'EOF'
#!/bin/sh
# Air wrapper script - launches from clean clone with XDG paths

CLEAN_CLONE_DIR="$HOME/air"
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"

export XDG_CONFIG_HOME XDG_DATA_HOME XDG_STATE_HOME

# Ensure Air clean clone exists
if [ ! -d "$CLEAN_CLONE_DIR" ]; then
    echo "Error: Air not properly installed (missing $CLEAN_CLONE_DIR)"
    echo "Please run the Air installer again"
    exit 1
fi

# Run Air from clean clone
cd "$CLEAN_CLONE_DIR" || exit 1
exec node main.js "$@"
EOF
    
    # Install wrapper script
    if [ -w "$INSTALL_DIR" ]; then
        cp /tmp/air-wrapper "$wrapper_script"
        chmod +x "$wrapper_script"
    else
        sudo cp /tmp/air-wrapper "$wrapper_script"
        sudo chmod +x "$wrapper_script"
    fi
    
    rm /tmp/air-wrapper
    
    log "✓ Air installed successfully with XDG compliance"
    log "  Clean clone: $CLEAN_CLONE_DIR"
    log "  Config: ~/.config/air/config.json"
    log "  Data: ~/.local/share/air/"
    log "  State: ~/.local/state/air/"
}

# Setup systemd user service
setup_systemd_service() {
    log "Setting up systemd user service..."
    
    # Create user systemd directory
    mkdir -p "$HOME/.config/systemd/user"
    
    cat > "$HOME/.config/systemd/user/air.service" << EOF
[Unit]
Description=Air P2P Database Service
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
WorkingDirectory=$CLEAN_CLONE_DIR
Environment=XDG_CONFIG_HOME=$HOME/.config
Environment=XDG_DATA_HOME=$HOME/.local/share
Environment=XDG_STATE_HOME=$HOME/.local/state
Environment=NODE_ENV=production
ExecStart=/usr/bin/node main.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF
    
    # Enable lingering and start service
    if command -v loginctl >/dev/null 2>&1; then
        loginctl enable-linger "$USER" 2>/dev/null || true
    fi
    
    systemctl --user daemon-reload
    systemctl --user enable air >/dev/null 2>&1 || {
        warn "Failed to enable Air service"
    }
    
    log "✓ Systemd user service configured"
    log "  Control with: systemctl --user [start|stop|restart|status] air"
    log "  View logs: journalctl --user -u air -f"
}

# Setup auto-update system
setup_auto_update() {
    log "Setting up auto-update system..."
    
    # Create update script
    cat > "$HOME/.config/air/auto-update.sh" << 'EOF'
#!/bin/sh
# Air auto-update script - Uses ~/air clean clone and XDG config

REPO_URL="https://github.com/akaoio/air.git"
CLEAN_CLONE_DIR="$HOME/air"
CONFIG_DIR="$HOME/.config/air"
LOG_FILE="$CONFIG_DIR/auto-update.log"

# Function to log with timestamp
log_update() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# Function to update clean clone
update_clean_clone() {
    if [ -d "$CLEAN_CLONE_DIR" ]; then
        cd "$CLEAN_CLONE_DIR" || {
            log_update "ERROR: Cannot cd to $CLEAN_CLONE_DIR"
            return 1
        }
        
        # Check for updates
        git fetch origin >/dev/null 2>&1 || {
            log_update "ERROR: git fetch failed"
            return 1
        }
        
        LOCAL=$(git rev-parse HEAD)
        REMOTE=$(git rev-parse origin/main 2>/dev/null || git rev-parse origin/master 2>/dev/null)
        
        if [ "$LOCAL" != "$REMOTE" ]; then
            log_update "Updates available, pulling changes..."
            git pull origin main >/dev/null 2>&1 || git pull origin master >/dev/null 2>&1 || {
                log_update "ERROR: git pull failed"
                return 1
            }
            
            # Reinstall npm dependencies
            npm install --production >/dev/null 2>&1 || {
                log_update "ERROR: npm install failed"
                return 1
            }
            
            log_update "Air updated successfully"
            return 0
        else
            log_update "No updates needed"
            return 1
        fi
    else
        # Clone if directory doesn't exist
        log_update "Clean clone missing, creating $CLEAN_CLONE_DIR"
        git clone "$REPO_URL" "$CLEAN_CLONE_DIR" >/dev/null 2>&1 || {
            log_update "ERROR: git clone failed"
            return 1
        }
        
        cd "$CLEAN_CLONE_DIR" && npm install --production >/dev/null 2>&1
        return 0
    fi
}

# Update clean clone and restart service if needed
if update_clean_clone; then
    # Restart user service if it exists and is enabled
    if systemctl --user is-enabled air >/dev/null 2>&1; then
        systemctl --user restart air >/dev/null 2>&1 && \
        log_update "Air service restarted successfully"
    fi
fi
EOF
    
    chmod +x "$HOME/.config/air/auto-update.sh"
    
    # Add weekly auto-update cron job
    local update_cron="0 3 * * 0 $HOME/.config/air/auto-update.sh >/dev/null 2>&1"
    (crontab -l 2>/dev/null | grep -v "auto-update.sh"; echo "$update_cron") | crontab -
    
    log "✓ Auto-update enabled"
    log "  Update script: ~/.config/air/auto-update.sh"
    log "  Update log: ~/.config/air/auto-update.log"
    log "  Schedule: Weekly (Sunday 3 AM)"
}

# Show final summary
show_summary() {
    echo ""
    echo "=================================================="
    echo "  Air Installation Complete!"
    echo "=================================================="
    echo ""
    echo "📁 File Locations (XDG Base Directory Specification):"
    echo "   Config:      ~/.config/air/config.json"
    echo "   Data & Logs: ~/.local/share/air/"
    echo "   State Files: ~/.local/state/air/"
    echo "   Clean Clone: ~/air/ (used for runtime & updates)"
    echo ""
    echo "🚀 Quick Start:"
    echo "   air --version              # Test installation"
    echo "   systemctl --user start air # Start Air service"
    echo "   systemctl --user status air # Check Air status"
    echo ""
    echo "📝 Service Management:"
    echo "   systemctl --user [start|stop|restart|status] air"
    echo "   journalctl --user -u air -f  # View logs"
    echo ""
    echo "🔧 Configuration:"
    echo "   Edit: ~/.config/air/config.json"
    echo "   Auto-update: ~/.config/air/auto-update.sh"
    echo ""
    echo "Air is now ready for P2P database operations!"
    echo ""
}

# Main installation flow
main() {
    show_header
    
    # Parse arguments
    SETUP_SERVICE=true
    SETUP_AUTO_UPDATE=true
    
    while [ $# -gt 0 ]; do
        case $1 in
            --no-service)
                SETUP_SERVICE=false
                ;;
            --no-auto-update)
                SETUP_AUTO_UPDATE=false
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --no-service      Skip systemd service setup"
                echo "  --no-auto-update  Skip auto-update configuration"
                echo "  --help           Show this help"
                exit 0
                ;;
            *)
                warn "Unknown option: $1"
                ;;
        esac
        shift
    done
    
    # Installation steps
    check_requirements
    create_clean_clone
    install_air
    
    if [ "$SETUP_SERVICE" = true ]; then
        setup_systemd_service
    fi
    
    if [ "$SETUP_AUTO_UPDATE" = true ]; then
        setup_auto_update
    fi
    
    show_summary
}

# Run main installation
main "$@"