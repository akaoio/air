#!/bin/sh
# Air Update Script - POSIX compliant following Access philosophy

# Define vars
config="air.json"
root=""
name=""

# Transform long options to short ones
for arg in $@
do
    shift
    case $arg in
        --root)   set -- $@ -r;;
        --name)   set -- $@ -n;;
        *)        set -- $@ $arg
    esac
done

# Check flags
while getopts "r:n:" flag
do
    case $flag in
    r) root=$OPTARG;;
    n) name=$OPTARG
    esac
done

# Config root
[ -z $root ] && root=`pwd` # Root folder of main.js

[ -z $bash ] && bash="$(cd "$(dirname "$0")" && pwd)" # Root folder of Bash script files

# Check if jq is installed? Install jq if jq doesn's exist.
if ! command -v jq >/dev/null 2>&1
then
    echo "Warning: jq is not installed. Configuration parsing may fail."
fi

# If config file exists, try to assign variables
if [ -f $root/$config ]
then
name=$(jq -r ".name" "$root/$config")
[ "$name" = "null" ] && name=$(jq -r ".name" "$root/$config")
fi

# READY

# User-scope update
echo "Updating Air P2P database (user-scope)..."

# Git operations (no sudo needed)
if [ -d ".git" ]; then
    echo "Fetching latest changes from git..."
    git fetch 2>/dev/null || echo "Warning: Git fetch failed"
    git pull 2>/dev/null || echo "Warning: Git pull failed"
else
    echo "Not a git repository - skipping git updates"
fi

# NPM operations (user-scope)
if [ -f "package.json" ]; then
    echo "Updating NPM dependencies..."
    npm update || echo "Warning: npm update failed"
else
    echo "No package.json found - skipping npm updates"
fi

# SSL certificate renewal (user-scope)
ssl_dir="$HOME/.local/share/air/ssl"
if [ -d "$ssl_dir" ]; then
    echo "Note: For SSL certificate renewal, use your preferred method:"
    echo "  - acme.sh (user-scope): ~/.acme.sh/acme.sh --renew -d yourdomain.com"
    echo "  - Manual renewal and copy to: $ssl_dir"
    echo "  - Reverse proxy handling SSL (recommended)"
fi

# Restart user systemd service
if [ -n "$name" ]; then
    echo "Restarting Air service..."
    systemctl --user restart "$name" 2>/dev/null || echo "Warning: Could not restart service $name"
    echo "✓ Air update complete"
else
    echo "Warning: No service name found - manual restart may be needed"
fi

echo "
User-scope update completed!
  Check status: systemctl --user status $name
  View logs:    journalctl --user -u $name -f
"