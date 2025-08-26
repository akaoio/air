#!/bin/sh
# Air Uninstall Script - POSIX compliant following Access philosophy

# Define vars
who=$(id -un)
config="air.json"
root=""
bash=""
env=""
name=""

# Transform long options to short ones
for arg in $@
do
    shift
    case $arg in
        --root)   set -- $@ -r;;
        --bash)   set -- $@ -b;;
        --name)   set -- $@ -n;;
        *)        set -- $@ $arg
    esac
done

# Check flags
while getopts "r:b:n:" flag
do
    case $flag in
        r) root=$OPTARG;;
        b) bash=$OPTARG;;
        n) name=$OPTARG
    esac
done


# Config root
[ -z $root ] && root=`pwd` # Root folder of main.js

[ -z $bash ] && bash="$(cd "$(dirname "$0")" && pwd)" # Root folder of Bash script files

# Check if jq is installed
if ! command -v jq >/dev/null 2>&1
then
    echo "Warning: jq is not installed. Some configuration parsing may fail."
    echo "Consider installing jq manually for better configuration handling."
fi

# If config file exists, try to assign variables
if [ -f $root/$config ]
then
    name=`jq -r ".name" $root/$config`
    [ "$name" = "null" ] && name=$(jq -r ".name" "$root/$config")
fi

# READY

# User-scope uninstall
echo "Uninstalling Air P2P database (user-scope)..."

# Stop and disable user systemd service
if [ -n "$name" ]; then
    systemctl --user stop "$name" 2>/dev/null || echo "Note: Service $name was not running"
    systemctl --user disable "$name" 2>/dev/null || echo "Note: Service $name was not enabled"
fi

# Remove user systemd service file
user_service_file="$HOME/.config/systemd/user/$name.service"
if [ -f "$user_service_file" ]; then
    rm "$user_service_file"
    echo "✓ Removed user systemd service: $user_service_file"
fi

systemctl --user daemon-reload 2>/dev/null || true

# Remove user crontab entries
crontab -l 2>/dev/null | grep -v "$bash/" | crontab - 2>/dev/null || echo "Note: No crontab entries to remove"

# Clean up XDG directories (optional - ask user)
echo ""
printf "Remove Air configuration and data directories? [y/N]: "
read cleanup_response
case "$cleanup_response" in
    [Yy]*)
        rm -rf "$HOME/.config/air" 2>/dev/null || true
        rm -rf "$HOME/.local/share/air" 2>/dev/null || true
        rm -rf "$HOME/.local/state/air" 2>/dev/null || true
        echo "✓ Removed Air configuration and data directories"
        ;;
    *)
        echo "Configuration and data directories preserved in:"
        echo "  ~/.config/air/"
        echo "  ~/.local/share/air/"
        echo "  ~/.local/state/air/"
        ;;
esac

echo "
====================================
  AIR P2P DATABASE UNINSTALLED
  Peer: $name
  User: $(id -un) (no sudo required)
====================================

Air has been cleanly removed from user scope.
No system-wide changes were made.
"