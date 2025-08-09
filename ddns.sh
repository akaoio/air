#!/bin/bash

# Define vars
config="air.json"
ddns="ddns.json"
root=""
env=""
last_ip=""
current_ip=""
new_ip=""
domain=""
host=""
key=""
secret=""

# Transform long options to short ones
for arg in $@
do
    shift
    case $arg in
        --root)   set -- $@ -P;;
        --env)    set -- $@ -e;;
        --domain) set -- $@ -d;;
        --host)   set -- $@ -h;;
        --key)    set -- $@ -k;;
        --secret) set -- $@ -s;;
        *)        set -- $@ $arg
    esac
done

# Check flags
while getopts "P:e:d:h:k:s:" flag
do
    case $flag in
        P) root=$OPTARG;;
        e) env=$OPTARG;;
        d) domain=$OPTARG;;
        h) host=$OPTARG;;
        k) key=$OPTARG;;
        s) secret=$OPTARG
    esac
done


[ ! -z $domain ] && echo "Domain: $domain"
[ ! -z $host ] && echo "Host: $host"

# Config root
[ -z $root ] && root=`pwd`
cd $root

# If config file exists, try to assign variables
if [ -f "$root/$config" ]
then
    [ -z $env ] && env=`jq -r ".env" $root/$config`
    
    [ -z $domain ] && domain=`jq -r ".$env.godaddy.domain" $root/$config`
    
    [ -z $host ] && host=`jq -r ".$env.godaddy.host" $root/$config`
    
    [ -z $key ] && key=`jq -r ".$env.godaddy.key" $root/$config`

    [ -z $secret ] && secret=`jq -r ".$env.godaddy.secret" $root/$config`
fi

# Check if env exists
while [ -z $env ] || [[ $env = "null" ]]
do
    read -p "Please enter environment: " env
    if [ ! -z $env ] && [[ $env != "null" ]]
    then
        break
    fi
done

echo "Date: $(date)"
[ ! -z $env ] && echo "Environment: $env"
[ ! -z $domain ] && echo "Domain: $domain"
[ ! -z $host ] && echo "Host: $host"

# If ddns.json exists, try to assign variables
if [ -f "$root/$ddns" ]
then
    current_ip=`jq -r ".currentIP" $ddns`
    [[ $current_ip = "null" ]] && current_ip=""
    
    last_ip=`jq -r ".lastIP" $ddns`
    [[ $last_ip = "null" ]] && last_ip="$current_ip"
fi

# Load IP detection configuration from air.json config file
# Use the same config file that the rest of the system uses
AIR_CONFIG_FILE="${root}/${config}"  # This is air.json

# Default fallback configuration
IP_DETECTION_TIMEOUT=5
IP_DETECTION_DNS_TIMEOUT=3
DNS_IP_SERVICES=(
    "myip.opendns.com@resolver1.opendns.com"
    "myip.opendns.com@resolver2.opendns.com"
)
HTTP_IP_SERVICES=(
    "https://checkip.amazonaws.com"
    "https://ipv4.icanhazip.com"
)

# Try to load from air.json if it exists and jq is available
if [ -f "$AIR_CONFIG_FILE" ] && command -v jq >/dev/null 2>&1; then
    # Parse IP config from air.json
    if jq -e '.ip' "$AIR_CONFIG_FILE" >/dev/null 2>&1; then
        # Parse timeouts (convert ms to seconds for bash)
        timeout_ms=$(jq -r '.ip.timeout // 5000' "$AIR_CONFIG_FILE")
        dns_timeout_ms=$(jq -r '.ip.dnstimeout // 3000' "$AIR_CONFIG_FILE")
        IP_DETECTION_TIMEOUT=$((timeout_ms / 1000))
        IP_DETECTION_DNS_TIMEOUT=$((dns_timeout_ms / 1000))
        
        # Parse DNS services
        DNS_IP_SERVICES=()
        while IFS= read -r line; do
            [ -n "$line" ] && DNS_IP_SERVICES+=("$line")
        done < <(jq -r '.ip.dns[]? | "\(.hostname)@\(.resolver)"' "$AIR_CONFIG_FILE" 2>/dev/null)
        
        # Parse HTTP services  
        HTTP_IP_SERVICES=()
        while IFS= read -r url; do
            [ -n "$url" ] && HTTP_IP_SERVICES+=("$url")
        done < <(jq -r '.ip.http[]?.url' "$AIR_CONFIG_FILE" 2>/dev/null)
        
        # If arrays are empty after parsing, keep defaults
        [ ${#DNS_IP_SERVICES[@]} -eq 0 ] && DNS_IP_SERVICES=("myip.opendns.com@resolver1.opendns.com" "myip.opendns.com@resolver2.opendns.com")
        [ ${#HTTP_IP_SERVICES[@]} -eq 0 ] && HTTP_IP_SERVICES=("https://checkip.amazonaws.com" "https://ipv4.icanhazip.com")
    fi
fi

# Allow environment variables to override config
IP_DETECTION_TIMEOUT=${IP_DETECTION_TIMEOUT_OVERRIDE:-$IP_DETECTION_TIMEOUT}
IP_DETECTION_DNS_TIMEOUT=${IP_DETECTION_DNS_TIMEOUT_OVERRIDE:-$IP_DETECTION_DNS_TIMEOUT}

# IP validation regex
IP_REGEX="^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$"

# Validate IP address format
validate_ip() {
    local ip="$1"
    if [[ $ip =~ $IP_REGEX ]]; then
        # Additional validation for valid IP ranges
        IFS='.' read -ra ADDR <<< "$ip"
        for i in "${ADDR[@]}"; do
            if [[ $i -gt 255 ]]; then
                return 1
            fi
        done
        # Exclude private/reserved ranges
        if [[ ${ADDR[0]} -eq 10 ]] || 
           [[ ${ADDR[0]} -eq 172 && ${ADDR[1]} -ge 16 && ${ADDR[1]} -le 31 ]] ||
           [[ ${ADDR[0]} -eq 192 && ${ADDR[1]} -eq 168 ]] ||
           [[ ${ADDR[0]} -eq 127 ]] ||
           [[ ${ADDR[0]} -eq 0 ]] ||
           [[ ${ADDR[0]} -ge 224 ]]; then
            return 1
        fi
        return 0
    fi
    return 1
}

# Try DNS-based IP detection
get_ip_via_dns() {
    local service_info="$1"
    local hostname=$(echo "$service_info" | cut -d'@' -f1)
    local resolver=$(echo "$service_info" | cut -d'@' -f2)
    local ip=""
    
    # Try dig first
    if command -v dig >/dev/null 2>&1; then
        ip=$(timeout $IP_DETECTION_DNS_TIMEOUT dig +short "$hostname" @"$resolver" 2>/dev/null | head -n1)
        if validate_ip "$ip"; then
            echo "$ip"
            return 0
        fi
    fi
    
    # Try nslookup as fallback
    if command -v nslookup >/dev/null 2>&1; then
        ip=$(timeout $IP_DETECTION_DNS_TIMEOUT nslookup "$hostname" "$resolver" 2>/dev/null | grep -A1 "Name:" | tail -n1 | awk '{print $2}')
        if validate_ip "$ip"; then
            echo "$ip"
            return 0
        fi
    fi
    
    return 1
}

# Try HTTP-based IP detection
get_ip_via_http() {
    local service="$1"
    local tool="$2"
    local ip=""
    
    case "$tool" in
        "curl")
            if command -v curl >/dev/null 2>&1; then
                ip=$(timeout $IP_DETECTION_TIMEOUT curl --max-time $IP_DETECTION_TIMEOUT -s "$service" 2>/dev/null | tr -d '\n\r' | grep -o '[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}' | head -n1)
            fi
            ;;
        "wget")
            if command -v wget >/dev/null 2>&1; then
                ip=$(timeout $IP_DETECTION_TIMEOUT wget --timeout=$IP_DETECTION_TIMEOUT -qO- "$service" 2>/dev/null | tr -d '\n\r' | grep -o '[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}' | head -n1)
            fi
            ;;
    esac
    
    if validate_ip "$ip"; then
        echo "$ip"
        return 0
    fi
    return 1
}

# Main IP detection function
get_public_ip() {
    local ip=""
    local method=""
    
    echo "Attempting to detect public IP address..." >&2
    
    # Method 1: Try DNS-based detection (fastest and most reliable)
    for dns_service in "${DNS_IP_SERVICES[@]}"; do
        echo "Trying DNS method: $dns_service" >&2
        ip=$(get_ip_via_dns "$dns_service")
        if [[ $? -eq 0 && -n "$ip" ]]; then
            method="DNS ($dns_service)"
            echo "✓ IP detected via $method: $ip" >&2
            echo "$ip"
            return 0
        fi
    done
    
    # Method 2: Try HTTP-based detection with curl
    for http_service in "${HTTP_IP_SERVICES[@]}"; do
        echo "Trying HTTP method (curl): $http_service" >&2
        ip=$(get_ip_via_http "$http_service" "curl")
        if [[ $? -eq 0 && -n "$ip" ]]; then
            method="HTTP-curl ($http_service)"
            echo "✓ IP detected via $method: $ip" >&2
            echo "$ip"
            return 0
        fi
    done
    
    # Method 3: Try HTTP-based detection with wget as final fallback
    for http_service in "${HTTP_IP_SERVICES[@]}"; do
        echo "Trying HTTP method (wget): $http_service" >&2
        ip=$(get_ip_via_http "$http_service" "wget")
        if [[ $? -eq 0 && -n "$ip" ]]; then
            method="HTTP-wget ($http_service)"
            echo "✓ IP detected via $method: $ip" >&2
            echo "$ip"
            return 0
        fi
    done
    
    echo "✗ All IP detection methods failed" >&2
    return 1
}

new_ip=$(get_public_ip)

[ ! -z $new_ip ] && echo "IP: $new_ip"

if [ ! -z $key ] && [ ! -z $secret ]
then
    current_ip=`curl -s -X GET "https://api.godaddy.com/v1/domains/$domain/records/A/$host" -H "Authorization: sso-key $key:$secret" | cut -d'[' -f 2 | cut -d']' -f 1 | jq -r '.data'`
fi

if [ ! -z $current_ip ] && [ ! -z $new_ip ] && [ $new_ip != $current_ip ] && [ ! -z $key ] && [ ! -z $secret ] && [ ! -z $domain ] && [ ! -z $host ]
then
    curl -s -X PUT "https://api.godaddy.com/v1/domains/$domain/records/A/$host" -H "Authorization: sso-key $key:$secret" -H "Content-Type: application/json" -d "[{\"data\": \"$new_ip\"}]"
    last_ip=$current_ip
    current_ip=$new_ip
    echo "IP address updated."
else
    echo "IP address not changed. No need to update."
fi

echo "{\"lastIP\": \"$last_ip\", \"currentIP\": \"$current_ip\", \"newIP\": \"$new_ip\", \"datetime\": \"`date`\", \"timestamp\": \"`date +%s%3N`\"}" > $root/ddns.json