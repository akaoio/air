#!/bin/sh
# @akaoio/air - Stacker Framework Integration
# Redirects to main Stacker cortex for universal shell framework

# Main Stacker directory (always use the central cortex)
MAIN_STACKER_DIR="/home/x/core/projects/stacker"

# Verify main Stacker exists
if [ ! -f "$MAIN_STACKER_DIR/stacker.sh" ]; then
    echo "FATAL: Main Stacker cortex not found at $MAIN_STACKER_DIR" >&2
    exit 1
fi

# Set STACKER_DIR to point to main cortex before sourcing
export STACKER_DIR="$MAIN_STACKER_DIR"

# Source the main Stacker framework
. "$MAIN_STACKER_DIR/stacker.sh" || {
    echo "FATAL: Cannot load main Stacker framework" >&2
    exit 1
}

# Initialize Air-specific configuration if needed
stacker_init "air" "https://github.com/akaoio/air.git" "air.sh" "Air P2P Database Service"

# Air-specific functions can be added here if needed
# All core Stacker functionality is now available through the main cortex