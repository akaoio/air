# Air - Advanced GUN Database Wrapper

Air is a production-ready wrapper for [GUN](https://github.com/amark/gun) that simplifies running distributed graph database instances with advanced features. Built on a custom enhanced version of GUN from [akaoio/gun](https://github.com/akaoio/gun), Air provides seamless peer-to-peer synchronization, automatic SSL certificate management, and dynamic DNS updates.

## Key Features

### Core Database Features
- **Distributed Graph Database**: Built on advanced GUN implementation with enhanced features
- **Peer-to-Peer Sync**: Automatic connection to peer networks with configurable endpoints
- **SEA Encryption**: Built-in cryptographic authentication using GUN SEA
- **Real-time Data**: Live synchronization across all connected peers

### Infrastructure Management
- **Auto SSL/TLS**: Automatic Let's Encrypt certificate installation and renewal
- **Dynamic DNS**: GoDaddy DNS A-record auto-updates for dynamic IP addresses
- **System Service**: Systemd service integration with auto-restart capabilities
- **Process Management**: Built-in crash recovery with configurable restart limits

### Network & Deployment
- **Dual Protocol Support**: HTTP/HTTPS server with automatic detection
- **Port Configuration**: Flexible port assignment with environment-specific settings
- **Network Config Sync**: Remote configuration synchronization from URLs
- **Multi-Environment**: Production/development environment configurations

## Requirements

- Node.js (tested with modern versions)
- Linux system with systemd (Raspberry OS, Ubuntu)
- For SSL: Port 80/443 access and domain name
- For DDNS: GoDaddy domain with API credentials
- For auto-updates: Git repository access

## Installation

### Standalone Super Peer

Clone the repository and run the interactive installer:

```bash
git clone https://github.com/akaoio/air.git
cd air
sudo ./install.sh
```

The installer will prompt you for:
- Environment (production/development)
- Peer name and port
- Domain name
- SSL certificate setup
- GoDaddy DDNS configuration
- External peer connections

### Command Line Options

The installer supports non-interactive installation with command-line arguments:

```bash
sudo ./install.sh \
  --env production \
  --name mypeer \
  --port 8765 \
  --domain example.com \
  --ssl \
  --godaddy_cron \
  --update \
  --peers "wss://peer1.com/gun,wss://peer2.com/gun"
```

### NodeJS Module

Use Air as a module in your Node.js applications:

```javascript
import { db } from "./index.js"

const main = async () => {
    await db.start()
    
    // Access GUN instance and utilities
    const { GUN, gun, sea, user } = db
    
    // Your application logic here
    user.get('profile').put({ name: 'Alice' })
}

main()
```

## Configuration

Air uses `air.json` for configuration with environment-specific sections:

```json
{
    "root": "/path/to/air",
    "bash": "/path/to/scripts",
    "env": "production",
    "name": "mypeer",
    "sync": "https://config.example.com/network.json",
    "production": {
        "domain": "peer.example.com",
        "port": 443,
        "ssl": {
            "key": "/etc/letsencrypt/live/peer.example.com/privkey.pem",
            "cert": "/etc/letsencrypt/live/peer.example.com/cert.pem"
        },
        "godaddy": {
            "domain": "example.com",
            "host": "peer",
            "key": "your_api_key",
            "secret": "your_api_secret"
        },
        "peers": [
            "wss://peer1.example.com/gun",
            "wss://peer2.example.com/gun"
        ],
        "pair": {
            "pub": "...",
            "priv": "...",
            "epub": "...",
            "epriv": "..."
        }
    }
}
```

## Management Scripts

### System Updates
```bash
./update.sh --root /path/to/air --name mypeer
```
Automatically pulls Git updates, updates npm packages, renews SSL certificates, and restarts services.

### DNS Management
```bash
./ddns.sh --domain example.com --host peer --key API_KEY --secret API_SECRET
```
Updates GoDaddy DNS A-records with current public IP address.

### Service Removal
```bash
./uninstall.sh --name mypeer
```
Removes systemd service and cleans up cron jobs.

## Advanced Features

### Automatic Restart Recovery
The Peer class includes built-in crash recovery:
- Configurable restart attempts (default: 5)
- Progressive delay between restarts
- Server error and close event handling
- Process exit on max restart failures

### Network Status Reporting
Air automatically reports peer status:
- Public IP address updates every 5 minutes
- Heartbeat/alive status every minute
- DDNS synchronization every 5 minutes
- Network configuration sync every hour

### Cryptographic Identity
Each peer maintains a cryptographic identity:
- SEA key pair generation and storage
- User authentication with persistent keys
- Secure data signing and encryption
- Cross-peer identity verification

## Architecture

- `Peer.js`: Core peer implementation with server management
- `db.js`: Database instance factory
- `main.js`: Application entry point
- `libs/utils.js`: Configuration merging utilities
- `install.sh`: Interactive installation script
- `update.sh`: Automated update management
- `ddns.sh`: Dynamic DNS update service
- `uninstall.sh`: Clean removal utility

## Development

Air is actively developed with the main branch serving as the development branch. The codebase uses ES6 modules with modern JavaScript features.

### Dependencies
- `gun`: Custom enhanced version from [akaoio/gun](https://github.com/akaoio/gun)
- `node-fetch`: HTTP client for external API calls

## License

MIT License - see package.json for details.

## Links

- **GUN Database**: https://github.com/amark/gun
- **Enhanced GUN**: https://github.com/akaoio/gun  
- **Documentation**: Coming soon
