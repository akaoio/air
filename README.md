# Air - Advanced GUN Database Wrapper

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)
[![GUN](https://img.shields.io/badge/GUN-Distributed-blue)](https://gun.eco)

Air is a production-ready wrapper for [GUN](https://github.com/amark/gun) that simplifies running distributed graph database instances with advanced features. Built on a custom enhanced version of GUN from [akaoio/gun](https://github.com/akaoio/gun), Air provides seamless peer-to-peer synchronization, automatic SSL certificate management, and dynamic DNS updates.

## Key Features

### Core Database Features

-   **Distributed Graph Database**: Built on advanced GUN implementation with enhanced features
-   **Peer-to-Peer Sync**: Automatic connection to peer networks with configurable endpoints
-   **SEA Encryption**: Built-in cryptographic authentication using GUN SEA
-   **Real-time Data**: Live synchronization across all connected peers

### Infrastructure Management

-   **Auto SSL/TLS**: Automatic Let's Encrypt certificate installation and renewal
-   **Dynamic DNS**: GoDaddy DNS A-record auto-updates for dynamic IP addresses
-   **System Service**: Systemd service integration with auto-restart capabilities
-   **Process Management**: Built-in crash recovery with configurable restart limits

### Network & Deployment

-   **Dual Protocol Support**: HTTP/HTTPS server with automatic detection
-   **Port Configuration**: Flexible port assignment with environment-specific settings
-   **Network Config Sync**: Remote configuration synchronization from URLs
-   **Multi-Environment**: Production/development environment configurations

## Requirements

-   Node.js (tested with modern versions)
-   For systemd service: Linux system with systemd (Ubuntu, Debian, RHEL, etc.)
-   For SSL: Port 80/443 access and domain name
-   For DDNS: GoDaddy domain with API credentials
-   For auto-updates: Git repository access

## Installation

### Quick Install (Recommended - ENHANCED)

Air now features a seamless installation experience with automatic setup:

```bash
git clone https://github.com/akaoio/air.git
cd air
npm install  # Automatically prompts for setup after installation
```

**Enhanced Installation Features:**
- **🚀 Seamless Flow**: npm install automatically triggers setup wizard when needed
- **🔐 Security Hardening**: Built-in security analysis and recommendations
- **🏗️ Architecture Validation**: Prevents codebase drift with automated checks
- **✨ Smart Defaults**: Intelligent configuration based on environment detection
- **🎯 Quick Setup**: Streamlined wizard gets you running in under 60 seconds

### Post-Installation Commands

```bash
npm start           # Start Air server
npm run ui          # Start with interactive UI
npm run security    # Run security analysis
npm run arch        # Validate architecture
npm run status      # Check system status
npm run logs        # View recent logs
```

### Alternative Installation Methods

```bash
# Method 1: Use wrapper script (auto-detects best method)
./install.sh

# Method 2: Legacy bash installer (if Node.js unavailable)
./install-legacy.sh

# Method 3: Manual setup
cp air.json.example air.json
# Edit air.json with your configuration
npm start
```

### Static IP Setup for Orange Pi/Armbian

The new installer automatically configures static IP. If you need manual setup:

```bash
# Using NetworkManager (recommended)
sudo nmcli con mod eth0 ipv4.addresses 192.168.1.100/24
sudo nmcli con mod eth0 ipv4.gateway 192.168.1.1
sudo nmcli con mod eth0 ipv4.method manual
sudo nmcli con up eth0

# Or using /etc/network/interfaces
sudo nano /etc/network/interfaces
# Add:
# auto eth0
# iface eth0 inet static
#     address 192.168.1.100
#     netmask 255.255.255.0
#     gateway 192.168.1.1
```

The installer will prompt you for:

-   Environment (production/development)
-   Peer name and port
-   Domain name
-   SSL certificate setup
-   GoDaddy DDNS configuration
-   External peer connections

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
    user.get("profile").put({ name: "Alice" })
}

main()
```

### GUN SEA Support

Air exposes GUN's complete SEA (Security, Encryption, Authorization) API. All user data stored through authenticated users is automatically encrypted. See the [examples directory](examples/) for practical implementations.

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
        "peers": ["wss://peer1.example.com/gun", "wss://peer2.example.com/gun"],
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

Automatically pulls Git updates, updates npm packages, and restarts services. SSL certificates are renewed automatically via certbot's built-in cron job.

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

-   Configurable restart attempts (default: 5)
-   Progressive delay with exponential backoff (5s, 10s, 20s, 40s, 60s max)
-   Jitter (±20%) to prevent thundering herd problem
-   Server error and close event handling
-   Process exit on max restart failures

### Network Status Reporting

Air automatically reports peer status:

-   Public IP address detection and updates every 5 minutes
-   Heartbeat/alive status every minute
-   GoDaddy DNS A-record updates every 5 minutes (via cron)
-   Remote configuration sync from URL every hour

### Cryptographic Identity

Each peer maintains a cryptographic identity:

-   SEA key pair generation and storage
-   User authentication with persistent keys
-   Secure data signing and encryption
-   Cross-peer identity verification

## Project Structure

```
air/
├── Peer.js              # Core peer class with server management
├── db.js                # Database instance factory
├── main.js              # Application entry point
├── index.js             # Module exports
├── libs/utils.js        # Utility functions (merge)
├── www/index.html       # Web interface
├── examples/            # Usage examples
│   ├── sea-usage.js     # SEA cryptography examples
│   └── sea-app.js       # Encrypted notes application
├── test/                # Test suite (135+ tests)
│   ├── runner.js        # Custom test runner
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
└── *.sh                # Management scripts
```

## Testing

Air includes a comprehensive test suite covering all components and edge cases:

```bash
# Run all tests
npm test

# Test coverage includes:
# - Unit tests for Peer class, utilities, configuration
# - IP detection and validation tests
# - Integration tests for full lifecycle
# - Edge cases and error scenarios
```

The test suite uses a custom test runner with colored output and detailed statistics.

## Development

### Dependencies

-   `gun` (github:akaoio/gun): Enhanced GUN database
-   `node-fetch` (^3.0.0): HTTP client for IP detection
-   `prettier` (^2.4.1): Code formatter (dev)

### Running Locally

```bash
# Clone and install
git clone https://github.com/akaoio/air.git
cd air
npm install

# Run directly
npm start

# Run tests
npm test

# Format code
npm run format

# Configure Air interactively
npm run config
```

### Configuration Wizard

Air includes a user-friendly configuration wizard accessible via `npm run config`:

**Features:**
- **Interactive Menu**: Navigate through configuration sections easily
- **Current Value Display**: Shows existing settings with option to keep or change
- **Environment-Aware**: Separate configuration for development/production
- **Quick Setup Mode**: Run with `--quick` flag for streamlined setup
- **Validation**: Built-in validation for domains, ports, and API credentials

**Usage:**
```bash
npm run config           # Full interactive menu
npm run config --quick   # Quick setup mode
```

**Configuration Sections:**
- Basic settings (name, environment, domain, port)
- SSL configuration (certificate paths)
- Dynamic DNS (GoDaddy API settings)  
- Peer connections (add/remove peer URLs)
- Advanced options (remote sync, SEA key reset)

### Hot Configuration Reloading

Air supports seamless configuration updates without restart:

- **Lazy Loading**: Configuration reloaded automatically when `air.json` changes
- **Real-time Updates**: Changes take effect on next method call
- **Modification Tracking**: Only reloads when file modification time changes
- **No Downtime**: Server continues running while config updates

## License

MIT License - see package.json for details.

## Troubleshooting

### Port Already in Use
Air automatically detects if another instance is running:
- Checks PID file for existing process
- Detects port conflicts and provides helpful messages
- Prevents duplicate instances automatically

### SSL Certificate Issues
- Ensure ports 80/443 are accessible
- Check domain DNS is properly configured
- Verify Let's Encrypt rate limits haven't been exceeded

### IP Detection Failures
- Check network connectivity
- Verify DNS resolvers are accessible
- Ensure firewall allows outbound HTTPS requests

## Development Conventions

### Naming Convention
All functions must be single words. Related functions are grouped using dot notation:
- **Single word functions**: `read()`, `write()`, `sync()`, `init()`, `restart()`, `start()`, `run()`, `online()`, `activate()`
- **Grouped functions with dot notation**:
  - IP methods: `ip.get()`, `ip.validate()`, `ip.dns()`, `ip.http()`, `ip.config()`
  - Status methods: `status.ddns()`, `status.ip()`, `status.alive()`
  - PID management: `checkpid()`, `cleanpid()`, `findport()`

This convention keeps the API clean and avoids camelCase, underscores, or hyphens in function names.

## Contributing

Contributions are welcome! Please ensure:
1. All tests pass (`npm test`)
2. Code is formatted (`npm run format`)
3. New features include tests
4. Documentation is updated
5. Follow the single-word function naming convention (use dot notation for grouping)
6. **IMPORTANT**: All temporary files, test outputs, and development artifacts must be created in the `tmp/` directory (which is gitignored). Never create temporary files in the root or other project directories.

## Links

-   **GUN Database**: https://github.com/amark/gun
-   **Enhanced GUN**: https://github.com/akaoio/gun
-   **Repository**: https://github.com/akaoio/air
-   **Issues**: https://github.com/akaoio/air/issues
