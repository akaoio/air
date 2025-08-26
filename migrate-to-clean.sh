#!/bin/bash
# Air Migration Script - From Old Chaos to Clean Architecture
# This script migrates users from the old Air to the clean version

set -e

echo "================================================"
echo "  Air Migration to Clean Architecture v2.0"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Stop all Air processes
echo "⏹️  Stopping all Air processes..."
pkill -f "air" 2>/dev/null || true
pkill -f "gun" 2>/dev/null || true
systemctl stop air 2>/dev/null || true
systemctl --user stop air 2>/dev/null || true
echo "   ✓ Processes stopped"

# Step 2: Clean crontab
echo ""
echo "🗑️  Cleaning old cron entries..."
crontab -l 2>/dev/null | grep -v -E "air|Air|ddns|gun" | crontab - 2>/dev/null || true
echo "   ✓ Cron cleaned"

# Step 3: Remove old PID files
echo ""
echo "🧹 Removing old PID files..."
rm -f /var/run/air.pid 2>/dev/null || true
rm -f ~/.local/state/air/*.pid 2>/dev/null || true
rm -f .air*.pid 2>/dev/null || true
rm -f air.pid 2>/dev/null || true
echo "   ✓ PID files removed"

# Step 4: Migrate configuration
echo ""
echo "📦 Migrating configuration to XDG standards..."

# Create XDG directories
mkdir -p ~/.config/air
mkdir -p ~/.local/share/air
mkdir -p ~/.local/state/air

# Find and migrate air.json
if [ -f "air.json" ]; then
    echo "   Found air.json in current directory"
    # Clean the config (remove DDNS/IP stuff)
    if command -v jq >/dev/null 2>&1; then
        jq 'del(.godaddy, .ddns, .ip, .ipSync)' air.json > ~/.config/air/config.json
        echo "   ✓ Migrated and cleaned config to ~/.config/air/config.json"
    else
        cp air.json ~/.config/air/config.json
        echo "   ✓ Migrated config to ~/.config/air/config.json (manual cleanup needed)"
    fi
elif [ -f "$HOME/.air/config.json" ]; then
    echo "   Found config in ~/.air/"
    cp "$HOME/.air/config.json" ~/.config/air/config.json
    echo "   ✓ Migrated to ~/.config/air/config.json"
elif [ -f "$HOME/.config/air/production.json" ]; then
    echo "   Found production.json"
    mv "$HOME/.config/air/production.json" ~/.config/air/config.json
    echo "   ✓ Renamed to config.json"
fi

# Step 5: Clean up old directories (but preserve data)
echo ""
echo "🗂️  Organizing old files..."
if [ -d "$HOME/.air" ]; then
    echo "   Moving ~/.air to ~/.local/share/air/legacy-backup"
    mkdir -p ~/.local/share/air/legacy-backup
    mv "$HOME/.air" ~/.local/share/air/legacy-backup/ 2>/dev/null || true
fi

# Step 6: Remove old systemd services
echo ""
echo "🔧 Cleaning systemd services..."
sudo systemctl disable air 2>/dev/null || true
sudo rm -f /etc/systemd/system/air.service 2>/dev/null || true
systemctl --user disable air 2>/dev/null || true
rm -f ~/.config/systemd/user/air.service 2>/dev/null || true
sudo systemctl daemon-reload 2>/dev/null || true
systemctl --user daemon-reload 2>/dev/null || true
echo "   ✓ Systemd cleaned"

# Step 7: Build the new Air
echo ""
echo "🔨 Building clean Air..."
cd "$(dirname "$0")"
npm run build:prod || {
    echo -e "${RED}❌ Build failed. Please run: npm install && npm run build:prod${NC}"
    exit 1
}
echo "   ✓ Build successful"

# Step 8: Show migration summary
echo ""
echo "================================================"
echo -e "${GREEN}✅ Migration Complete!${NC}"
echo "================================================"
echo ""
echo "📁 New File Locations (XDG Compliant):"
echo "   Config: ~/.config/air/config.json"
echo "   Data:   ~/.local/share/air/"
echo "   State:  ~/.local/state/air/"
echo "   Logs:   ~/.local/share/air/air.log"
echo ""
echo "🌐 Network Configuration:"
echo "   DDNS/IP sync is now handled by Access"
echo "   To configure: access config <provider>"
echo "   To check IP: access ip"
echo ""
echo "🚀 Next Steps:"
echo "   1. Review config: cat ~/.config/air/config.json"
echo "   2. Start Air: node dist/main.js start"
echo "   3. Install service: node dist/main.js install"
echo ""
echo "📌 Important Changes:"
echo "   • No more duplicate cron entries"
echo "   • No more zombie processes"
echo "   • No more DDNS in Air (Access handles it)"
echo "   • Clean XDG directory structure"
echo "   • Single config file location"
echo ""
echo -e "${YELLOW}⚠️  Old data backed up to: ~/.local/share/air/legacy-backup/${NC}"
echo ""
echo "Thank you for migrating to Clean Air!"