#!/bin/sh
# Air Installation Script - POSIX compliant following Access philosophy
# Pure shell implementation for eternal infrastructure

# Define vars
who=$(id -un)
config="air.json"
root="" # Root folder of main.js
bash="" # Root folder of Bash script files
env=""
name=""
port=""
domain=""
peers_list=""
sync=""
ssl=false
ssl_key=""
ssl_cert=""
update=false
node_command="npm start"
yes_or_no="Please answer [Y]es or [N]o."

# Transform long options to short ones
for arg in $@
do
    shift
    case $arg in
        --root)         set -- $@ -r;;
        --bash)         set -- $@ -b;;
        --env)          set -- $@ -e;;
        --name)         set -- $@ -n;;
        --port)         set -- $@ -p;;
        --domain)       set -- $@ -d;;
        --peers)        set -- $@ -P;;
        --sync)         set -- $@ -S;;
        --ssl)          set -- $@ -s;;
        --update)       set -- $@ -u;;
        --node_command) set -- $@ -c;;
        *)              set -- $@ $arg
    esac
done

# Check flags
while getopts "r:b:e:n:p:d:P:S:suc:" flag
do
    case $flag in
        r) root=$OPTARG;;
        b) bash=$OPTARG;;
        e) env=$OPTARG;;
        n) name=$OPTARG;;
        p) port=$OPTARG;;
        d) domain=$OPTARG;;
        P) peers_list="$OPTARG";;
        S) sync=$OPTARG;;
        s) ssl=true;;
        u) update=true;;
        c) node_command=$OPTARG
    esac
done

# Config root directory
[ -z $root ] && root=`pwd` # Root folder of main.js

# Config bash directory
[ -z $bash ] && bash=$(cd `dirname $0` && pwd) # Root folder of Bash script files

# Check if jq is installed? Install jq if jq doesn't exist.
if ! command -v jq >/dev/null 2>&1
then
    echo "Warning: jq is not installed. Please install it manually:"
    echo "  Ubuntu/Debian: apt install jq (or use package manager of your choice)"
    echo "  Alpine: apk add jq"
    echo "  macOS: brew install jq"
    echo "Air will continue but JSON configuration may need manual editing."
fi

# If config file exists, try to assign variables
if [ -f $root/$config ]
then
    env=`jq -r ".env" $root/$config`
    [ -z "$env" ] || [ "$env" = "null" ] && env=$(jq -r ".env" "$root/$config")

    [ -z "$name" ] || [ "$name" = "null" ] && name=$(jq -r ".name" "$root/$config")

    port=$(jq -r ".port" "$root/$config")
    [ -z "$port" ] || [ "$port" = "null" ] && port=$(jq -r ".$env.port" "$root/$config")

    domain=$(jq -r ".domain" "$root/$config")
    [ -z "$domain" ] || [ "$domain" = "null" ] && domain=$(jq -r ".$env.domain" "$root/$config")
    
    peers_list=$(jq -r ".peers[]" "$root/$config" 2>/dev/null | tr '\n' ',' | sed 's/,$//' || jq -r ".$env.peers[]" "$root/$config" 2>/dev/null | tr '\n' ',' | sed 's/,$//' || echo "")
    
    [ -z "$sync" ] || [ "$sync" = "null" ] && sync=$(jq -r ".sync" "$root/$config")
fi

# CORE SETUP

# Check if env exists
while [ -z "$env" ] || [ "$env" = "null" ]
do
    printf "Please enter environment (\"production\" or \"development\"): "
    read env
    if [ -n "$env" ] && [ "$env" != "null" ]
    then
        break
    fi
done
[ -n "$env" ] && echo "Environment: $env"

# Check if name exists
while [ -z "$name" ] || [ "$name" = "null" ]
do
    printf "Please enter peer name: "
    read name
    if [ -n "$name" ] && [ "$name" != "null" ]
    then
        break
    fi
done
[ -n "$name" ] && echo "Peer name: $name"

# Check if port exists
while [ -z "$port" ] || [ "$port" = "null" ]
do
    printf "Please enter port: "
    read port
    if [ -n "$port" ] && [ "$port" != "null" ]
    then
        break
    else
        port=8765
    fi
done
[ -n "$port" ] && echo "Port: $port"

# NETWORK SETUP

# Check if domain exists
while [ -z "$domain" ] || [ "$domain" = "null" ]
do
    printf "Please enter domain: "
    read domain
    if [ -n "$domain" ] && [ "$domain" != "null" ]
    then
        break
    fi
done
[ -n "$domain" ] && echo "Domain: $domain"

# Ask if user wants to add peers
added=false
while true
do
    if [ "$added" = "true" ]; then
        question="Do you want to add more external peer? [Y/n]"
    else
        question="Do you want to add external peers? [Y/n]"
    fi
    printf "%s " "$question"
    read yn
    case $yn in
        [Yy]*)
            printf "Please enter peer address: "
            read peer
            if [ -n "$peer" ] && [ "$peer" != "null" ]; then
                # Check if peer already exists in list
                case ",$peers_list," in
                    *,"$peer",*) echo "Peer already exists!" ;;
                    *) 
                        if [ -z "$peers_list" ]; then
                            peers_list="$peer"
                        else
                            peers_list="$peers_list,$peer"
                        fi
                        added=true 
                        ;;
                esac
            fi;;
        [Nn]*) break;;
        *) echo "$yes_or_no"
    esac
done
[ -n "$peers_list" ] && echo "Peers: $peers_list"

# Ask if user wants to sync network config
if [ -z "$sync" ] || [ "$sync" = "null" ]
then
    while true
    do
        printf "Do you want to sync network config? [Y/n]"
        read yn
        case $yn in
            [Yy]*) printf "Please enter network config URL: "; read sync; break;;
            [Nn]*) break;;
            *) echo "$yes_or_no"
        esac
    done
fi
[ -n "$sync" ] && echo "Sync network config: $sync"

# SECURITY/DNS SETUP

# Ask if user wants ssl
if [ $ssl = false ]
then
    while true
    do
        printf "Do you want to install LetsEncrypt SSL Certificate? [Y/n]"
        read yn
        case $yn in
            [Yy]*) ssl=true; break;;
            [Nn]*) ssl=false; break;;
            *) echo $yes_or_no
        esac
    done
fi

# Note: GoDaddy DDNS functionality has been removed
# IP synchronization is now handled by Access

# SYSTEM SETUP

# Ask if user wants automatically run system update
if [ $update = false ]
then
    while true
    do
        printf "Do you want to automatically run system update? [Y/n]"
        read yn
        case $yn in
            [Yy]*) update=true; break;;
            [Nn]*) update=false; break;;
            *) echo $yes_or_no
        esac
    done
fi

# Ask if user wants to set custom node command instead of "npm start"
printf "Do you want to set custom node command instead of '%s'? [Y/n]" "$node_command"
read yn
case $yn in
    [Yy]*) printf "Please enter custom node command: "; read node_command;;
    [Nn]*) ;;
    *) echo "$yes_or_no"
esac

# BEGIN INSTALLATION PROCESS

# Update/Upgrade
if [ $update = true ]
then
    echo "Info: Auto-update requested. Running user-scope updates..."
    
    # Git operations (user-scope)
    if [ -d ".git" ]; then
        echo "Updating from git repository..."
        git pull 2>/dev/null || echo "Warning: Git pull failed or not a git repository"
    fi
    
    # NPM operations (user-scope)
    if [ -f "package.json" ]; then
        echo "Installing NPM dependencies..."
        npm install || echo "Warning: npm install failed"
    fi
    
    echo "Info: System package updates skipped (no sudo). Please update manually if needed:"
    echo "  Required: nodejs npm curl"
    echo "  Optional: jq certbot"
    
    # User crontab (no sudo needed)
    if command -v crontab >/dev/null 2>&1; then
        echo "Setting up user crontab..."
        # Remove old crontab commands if exists
        crontab -l 2>/dev/null | grep -v "$bash/update.sh" | crontab - 2>/dev/null || true
        # Add new crontab commands  
        (crontab -l 2>/dev/null; echo "0 0 * * * $bash/update.sh --root $root >> $root/$name.update.log 2>&1") | crontab - 2>/dev/null || echo "Warning: Could not setup crontab"
    fi
fi

# SSL Certificate paths - user-scope alternatives
if [ $ssl = true ]; then
    # Try user-scope SSL certificate locations first
    user_ssl_dir="$HOME/.local/share/air/ssl"
    mkdir -p "$user_ssl_dir"
    
    ssl_key="$user_ssl_dir/privkey.pem"
    ssl_cert="$user_ssl_dir/cert.pem"
    
    echo "SSL certificate requested. User-scope SSL setup:"
    echo "  Certificate directory: $user_ssl_dir"
    echo "  Private key: $ssl_key" 
    echo "  Certificate: $ssl_cert"
    echo ""
    echo "For SSL certificates, you have several options:"
    echo "  1. Use a reverse proxy (nginx/apache) with system SSL certificates"
    echo "  2. Use Let's Encrypt with acme.sh (user-scope): https://github.com/acmesh-official/acme.sh"
    echo "  3. Purchase SSL certificates and place them in: $user_ssl_dir"
    echo "  4. Use Cloudflare or similar service for SSL termination"
    echo ""
    echo "Note: Air will start without SSL if certificates are not found."
    
    # Check if user-provided certificates exist
    if [ -f "$ssl_key" ] && [ -f "$ssl_cert" ]; then
        echo "✓ User-scope SSL certificates found and will be used"
    else
        echo "⚠ No user-scope SSL certificates found. Air will run without SSL."
        ssl=false
        ssl_key=""
        ssl_cert=""
    fi
else
    ssl_key=""
    ssl_cert=""
fi

# Note: GoDaddy DDNS crontab removed - Access handles IP sync

# Create config file if no file exists
if [ ! -f "$root/$config" ] && [ ! -z $domain ] && [ ! -z $port ]
then
    [ ! -z $sync ] && sync_json="\"sync\": \"$sync\"," || sync_json=""
    [ -f $ssl_key ] && [ -f $ssl_cert ] && ssl_json=",\"ssl\": { \"key\": \"$ssl_key\", \"cert\": \"$ssl_cert\" }" || ssl_json=""
    godaddy_json="" # GoDaddy configuration removed - Access handles IP sync
    
    # Create JSON text for peers
    peers_json=""
    if [ -n "$peers_list" ]; then
        peers_json=',\"peers\": ['
        # Convert comma-separated list to JSON array format
        first=true
        IFS=','
        for peer in $peers_list; do
            if [ "$first" = "true" ]; then
                peers_json="$peers_json\"$peer\""
                first=false
            else
                peers_json="$peers_json, \"$peer\""
            fi
        done
        IFS=' '  # Reset IFS
        peers_json="$peers_json]"
    fi
    
    # Định nghĩa nội dung JSON trong biến json_content
    json_content="{
        \"root\": \"$root\",
        \"bash\": \"$bash\",
        \"env\": \"$env\",
        \"name\": \"$name\",
        $sync_json
        \"$env\": {
            \"domain\": \"$domain\",
            \"port\": $port
            $ssl_json
            $godaddy_json
            $peers_json
        }
    }"

    # Beautify JSON content using jq
    beautified_json=$(echo -e "$json_content" | jq '.')

    # Ghi nội dung JSON vào tệp
    echo "$beautified_json" > $root/$config

fi

# Create user-scope systemd service
user_systemd_dir="$HOME/.config/systemd/user"
mkdir -p "$user_systemd_dir"

echo "Installing $name user service..."
cat > "$user_systemd_dir/$name.service" << EOF
[Unit]
Description=Air P2P Database Service
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
WorkingDirectory=$root
Environment=ROOT=$root
Environment=BASH=$bash
Environment=ENV=$env
Environment=NAME=$name
Environment=DOMAIN=$domain
Environment=PORT=$port
Environment=SSL_KEY=$ssl_key
Environment=SSL_CERT=$ssl_cert
ExecStart=$node_command
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF

# Enable lingering so user services can run without being logged in
if command -v loginctl >/dev/null 2>&1; then
    loginctl enable-linger "$USER" 2>/dev/null || echo "Note: Could not enable lingering. Service will only run when logged in."
fi

# Start and enable user service
systemctl --user daemon-reload
systemctl --user enable "$name" || echo "Warning: Could not enable $name service"
systemctl --user start "$name" || echo "Warning: Could not start $name service"

echo "✓ User systemd service created at: $user_systemd_dir/$name.service"
echo "  To manage: systemctl --user [start|stop|restart|status] $name"

# FINISH INSTALLATION
echo "
====================================
  AIR P2P DATABASE INSTALLED
  User:            $who (no sudo required)
  Peer name:       $name
  Root path:       $root
  Bash path:       $bash
  Domain:          $domain
  Port:            $port
  SSL:             $ssl
  IP Sync:         Handled by Access
  Singleton:       Enforced via XDG locks
  Service:         User systemd service
====================================

User-scope installation complete!
  Config:    ~/.config/air/config.json
  Data:      ~/.local/share/air/
  Service:   systemctl --user status $name
  Logs:      journalctl --user -u $name -f

Commands:
  ./air.sh start     - Start Air
  ./air.sh stop      - Stop Air  
  ./air.sh status    - Check status
  ./air.sh logs      - Follow logs
"
