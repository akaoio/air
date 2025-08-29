#!/bin/sh
# Air Module Loader - Dynamic Module Loading System
# Version: 2.1.0
# Following Manager's modular loading philosophy

# Module directory
AIR_MODULE_DIR="${AIR_MODULE_DIR:-$(dirname "$0")}"

# Loaded modules tracking
AIR_LOADED_MODULES=""

# Load a module
air_load_module() {
    local module_name="$1"
    
    # Check if already loaded
    case " $AIR_LOADED_MODULES " in
        *" $module_name "*)
            return 0  # Already loaded
            ;;
    esac
    
    # Find module file
    local module_file="$AIR_MODULE_DIR/${module_name}.sh"
    
    if [ ! -f "$module_file" ]; then
        echo "ERROR: Module not found: $module_name" >&2
        return 1
    fi
    
    # Source the module
    . "$module_file" || {
        echo "ERROR: Failed to load module: $module_name" >&2
        return 1
    }
    
    # Track loaded module
    AIR_LOADED_MODULES="$AIR_LOADED_MODULES $module_name"
    
    # Load dependencies if specified
    if [ -n "$MODULE_DEPENDS" ]; then
        for dep in $MODULE_DEPENDS; do
            air_load_module "$dep" || return 1
        done
    fi
    
    return 0
}

# Load multiple modules
air_require() {
    local modules="$*"
    
    for module in $modules; do
        air_load_module "$module" || return 1
    done
    
    return 0
}

# List available modules
air_list_modules() {
    echo "Available Air Modules:"
    for module_file in "$AIR_MODULE_DIR"/*.sh; do
        if [ -f "$module_file" ]; then
            local module_name=$(basename "$module_file" .sh)
            # Skip loader itself
            if [ "$module_name" != "loader" ]; then
                echo "  • $module_name"
            fi
        fi
    done
}

# List loaded modules
air_list_loaded() {
    echo "Loaded Air Modules:$AIR_LOADED_MODULES"
}

# Get module info
air_module_info() {
    local module_name="$1"
    local module_file="$AIR_MODULE_DIR/${module_name}.sh"
    
    if [ ! -f "$module_file" ]; then
        echo "Module not found: $module_name"
        return 1
    fi
    
    # Extract metadata
    echo "Module: $module_name"
    grep "^MODULE_" "$module_file" | while read line; do
        echo "  $line"
    done
}