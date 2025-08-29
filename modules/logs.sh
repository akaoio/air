#!/bin/sh
# Air Logs Module - Log Management and Analysis
# Version: 2.1.0
# Handles log viewing, rotation, analysis

# Module metadata
MODULE_NAME="air-logs"
MODULE_VERSION="2.1.0"
MODULE_DESCRIPTION="Log management for Air P2P database"
MODULE_DEPENDS="core"

# Log file paths
AIR_LOG_FILE="${AIR_DATA_DIR}/air.log"
AIR_ERROR_LOG="${AIR_DATA_DIR}/air.error.log"
AIR_ACCESS_LOG="${AIR_DATA_DIR}/air.access.log"

# Show recent logs
air_logs_show() {
    local lines="${1:-50}"
    local log_file="${2:-$AIR_LOG_FILE}"
    
    if [ ! -f "$log_file" ]; then
        air_warn "Log file not found: $log_file"
        return 1
    fi
    
    tail -n "$lines" "$log_file"
}

# Follow logs in real-time
air_logs_follow() {
    local log_file="${1:-$AIR_LOG_FILE}"
    
    if [ ! -f "$log_file" ]; then
        air_warn "Log file not found: $log_file"
        return 1
    fi
    
    air_info "Following logs (Ctrl+C to stop)..."
    tail -f "$log_file"
}

# Search logs
air_logs_search() {
    local pattern="$1"
    local log_file="${2:-$AIR_LOG_FILE}"
    
    if [ -z "$pattern" ]; then
        air_error "Search pattern required"
        return 1
    fi
    
    if [ ! -f "$log_file" ]; then
        air_warn "Log file not found: $log_file"
        return 1
    fi
    
    grep -i "$pattern" "$log_file"
}

# Rotate logs
air_logs_rotate() {
    local max_size="${1:-10485760}"  # 10MB default
    local max_files="${2:-5}"
    
    if [ ! -f "$AIR_LOG_FILE" ]; then
        return 0  # Nothing to rotate
    fi
    
    local size=$(stat -f%z "$AIR_LOG_FILE" 2>/dev/null || stat -c%s "$AIR_LOG_FILE" 2>/dev/null)
    
    if [ "$size" -gt "$max_size" ]; then
        air_info "Rotating log file (size: $size bytes)"
        
        # Rotate existing logs
        local i=$((max_files - 1))
        while [ $i -gt 0 ]; do
            if [ -f "$AIR_LOG_FILE.$i" ]; then
                mv "$AIR_LOG_FILE.$i" "$AIR_LOG_FILE.$((i + 1))"
            fi
            i=$((i - 1))
        done
        
        # Move current log
        mv "$AIR_LOG_FILE" "$AIR_LOG_FILE.1"
        
        # Create new log file
        touch "$AIR_LOG_FILE"
        air_info "Log rotation complete"
    fi
}

# Clean old logs
air_logs_clean() {
    local days="${1:-30}"
    
    air_info "Cleaning logs older than $days days..."
    
    find "$AIR_DATA_DIR" -name "*.log*" -mtime +"$days" -exec rm {} \; 2>/dev/null
    
    air_info "Log cleanup complete"
}

# Show log statistics
air_logs_stats() {
    if [ ! -f "$AIR_LOG_FILE" ]; then
        air_warn "Log file not found"
        return 1
    fi
    
    echo "Log Statistics:"
    echo "==============="
    
    # File info
    local size=$(stat -f%z "$AIR_LOG_FILE" 2>/dev/null || stat -c%s "$AIR_LOG_FILE" 2>/dev/null)
    local lines=$(wc -l < "$AIR_LOG_FILE")
    
    echo "  File: $AIR_LOG_FILE"
    echo "  Size: $(echo "scale=2; $size / 1048576" | bc 2>/dev/null || echo "$size bytes") MB"
    echo "  Lines: $lines"
    echo ""
    
    # Log level counts
    echo "Log Levels:"
    echo "  ERROR: $(grep -c "ERROR\|❌" "$AIR_LOG_FILE" 2>/dev/null || echo "0")"
    echo "  WARN:  $(grep -c "WARN\|⚠️" "$AIR_LOG_FILE" 2>/dev/null || echo "0")"
    echo "  INFO:  $(grep -c "INFO\|✅" "$AIR_LOG_FILE" 2>/dev/null || echo "0")"
    echo "  DEBUG: $(grep -c "DEBUG\|🔍" "$AIR_LOG_FILE" 2>/dev/null || echo "0")"
    echo ""
    
    # Recent activity
    echo "Recent Activity:"
    echo "  Last 10 minutes: $(find "$AIR_LOG_FILE" -mmin -10 2>/dev/null | wc -l)"
    echo "  Last hour: $(find "$AIR_LOG_FILE" -mmin -60 2>/dev/null | wc -l)"
    echo "  Last 24 hours: $(find "$AIR_LOG_FILE" -mtime -1 2>/dev/null | wc -l)"
}

# Export module interface
air_logs_exports() {
    echo "air_logs_show air_logs_follow air_logs_search"
    echo "air_logs_rotate air_logs_clean air_logs_stats"
}