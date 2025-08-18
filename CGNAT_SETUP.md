# Air Setup Behind CGNAT

## Problem
Your ISP uses CGNAT (Carrier-Grade NAT), which means:
- Your modem gets private IP: 100.93.205.124
- Multiple customers share public IP: 1.55.167.221
- Port forwarding won't work for IPv4
- Let's Encrypt SSL won't work with standard setup

## Solutions

### 1. IPv6 Setup (If your domain supports IPv6)
```bash
# Your IPv6: 2405:4802:1d77:ec10:c274:2bff:fefb:5fb

# Add AAAA record in DNS:
your-domain.com → 2405:4802:1d77:ec10:c274:2bff:fefb:5fb

# Test IPv6:
curl -6 http://[2405:4802:1d77:ec10:c274:2bff:fefb:5fb]:8765
```

### 2. Cloudflare Tunnel (Recommended for production)
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Setup tunnel
cloudflared tunnel login
cloudflared tunnel create air
cloudflared tunnel route dns air your-domain.com
cloudflared tunnel run --url http://localhost:8765 air

# Create service
sudo tee /etc/systemd/system/cloudflared.service > /dev/null <<EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/local/bin/cloudflared tunnel run --url http://localhost:8765 air
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### 3. Tailscale VPN (For private access)
```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Connect
sudo tailscale up

# Access via Tailscale IP (100.x.x.x)
```

### 4. Use GUN's built-in relay
Since Air is a GUN database, you can connect through public GUN relays:
```javascript
// In your app
const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://gunjs.herokuapp.com/gun',
    'ws://localhost:8765/gun' // Your local Air
  ]
})
```

## Testing Connectivity

### Check if behind CGNAT:
```bash
# If WAN IP starts with these, you're behind CGNAT:
# 100.64.0.0 - 100.127.255.255 (RFC 6598)
# 10.0.0.0 - 10.255.255.255
# 172.16.0.0 - 172.31.255.255
# 192.168.0.0 - 192.168.255.255
```

### Test IPv6:
```bash
# Check IPv6 connectivity
ping6 google.com

# Get IPv6 address
ip -6 addr show

# Test IPv6 access
curl -6 ifconfig.me
```

## Air Configuration for CGNAT

Edit `air.json`:
```json
{
  "production": {
    "domain": "localhost",  // Use localhost for CGNAT
    "port": 8765,
    "peers": [
      "https://gun-manhattan.herokuapp.com/gun",
      "https://gunjs.herokuapp.com/gun"
    ]
  }
}
```

## Notes
- CGNAT blocks incoming connections on IPv4
- Use IPv6, tunnels, or VPN for external access
- Air still works locally on LAN (192.168.1.100)
- Other devices on LAN can connect to ws://192.168.1.100:8765