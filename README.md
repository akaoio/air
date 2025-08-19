# Air - Distributed GUN Database System

> **Version**: 2.0.0  
> **Status**: Production Ready  
> **Runtime**: Bun, Node.js (with or without TypeScript)

Air is a production-ready distributed database system built on [GUN](https://github.com/amark/gun), providing peer-to-peer synchronization, automatic SSL management, and dynamic DNS updates. Written in TypeScript for type safety and modern development experience.

## Features

- 🚀 **Multi-runtime Support**: Runs on Bun (native TypeScript) or Node.js (TypeScript via tsx or compiled JavaScript)
- 🔐 **Automatic SSL**: Let's Encrypt integration with auto-renewal
- 🌐 **Dynamic DNS**: GoDaddy DDNS support for dynamic IPs
- 🔄 **P2P Synchronization**: Real-time data sync across peers
- 🔑 **SEA Cryptography**: Built-in authentication and encryption
- 📦 **TypeScript First**: Full type safety with modern TypeScript
- 🔧 **Zero Config**: Works out of the box with sensible defaults
- 🔄 **Auto-restart**: Resilient with exponential backoff
- 🚦 **PID Management**: Prevents duplicate instances

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/akaoio/air.git
cd air

# Install dependencies
npm install

# Run interactive installer (optional)
./install.sh
```

### Running Air

```bash
# With Bun (fastest, native TypeScript)
bun run src/main.ts

# With Node.js + TypeScript
npx tsx src/main.ts

# With Node.js (compiled JavaScript)
npm run build:prod
node dist/main.js

# Development mode (with hot reload on Bun)
npm run dev
```

### Using as a Module

```typescript
import { db } from '@akaoio/air'

const main = async () => {
    await db.start()
    
    // Access GUN instance
    const { gun, user, sea } = db
    
    // Your application logic
    user.get('data').put({ message: 'Hello, distributed world!' })
}

main()
```

## Configuration

Air uses a cascading configuration system with the following precedence:
1. Command-line arguments (highest priority)
2. Environment variables
3. Configuration file (`air.json`)
4. Default values (lowest priority)

### Configuration File (air.json)

```json
{
    "name": "my-peer",
    "env": "production",
    "production": {
        "domain": "peer.example.com",
        "port": 443,
        "ssl": {
            "key": "/path/to/privkey.pem",
            "cert": "/path/to/cert.pem"
        },
        "peers": ["wss://peer1.com/gun", "wss://peer2.com/gun"],
        "godaddy": {
            "domain": "example.com",
            "host": "peer",
            "key": "api_key",
            "secret": "api_secret"
        }
    }
}
```

### Environment Variables

```bash
export NAME=my-peer
export ENV=production
export DOMAIN=peer.example.com
export PORT=443
export SSL_KEY=/path/to/privkey.pem
export SSL_CERT=/path/to/cert.pem
```

### Command-Line Arguments

```bash
node dist/main.js /root/path /bash/path production my-peer example.com 443
```

## Architecture

### TypeScript Structure

```
src/
├── main.ts          # Entry point
├── index.ts         # Module exports
├── db.ts            # Database factory
├── Peer.ts          # Core peer class
├── config.ts        # Configuration management
├── process.ts       # Process management
├── status.ts        # Status reporting
├── network.ts       # Network utilities
├── paths.ts         # Path resolution
└── types/           # TypeScript type definitions
    └── index.ts     # Type exports
```

### Core Components

- **Peer**: Manages server, GUN instance, and peer connections
- **ConfigManager**: Handles configuration loading and merging
- **ProcessManager**: PID file management and port detection
- **StatusReporter**: Heartbeat and status updates
- **Network**: IP detection and DDNS updates

## Building

### Development Build

```bash
# TypeScript type checking only
npm run build:node

# Bun bundling
npm run build:bun
```

### Production Build

```bash
# Compile TypeScript to JavaScript ES modules
npm run build:prod

# Output is in dist/ directory
ls dist/
```

### Build Configuration

The project uses two TypeScript configurations:

- `tsconfig.json` - Strict configuration for development and type checking
- `tsconfig.prod.json` - Permissive configuration for production builds

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Run with Bun
bun test
```

## Deployment

### Systemd Service

```bash
# Install as systemd service
sudo ./install.sh --systemd

# Service management
sudo systemctl start air-my-peer
sudo systemctl status air-my-peer
sudo systemctl enable air-my-peer
```

### Docker

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install
CMD ["bun", "run", "src/main.ts"]
```

### Production Deployment

1. **Build for production**:
   ```bash
   npm run build:prod
   ```

2. **Deploy compiled JavaScript**:
   ```bash
   # Copy only necessary files
   rsync -av dist/ package.json node_modules/ user@server:/path/to/air/
   ```

3. **Run on server**:
   ```bash
   node /path/to/air/dist/main.js
   ```

## API Reference

### Database Instance

```typescript
import { db } from '@akaoio/air'

// Start the peer
await db.start()

// Access GUN instance
db.gun.get('data').put({ key: 'value' })

// Access authenticated user
db.user.get('private').put({ secret: 'data' })

// Use SEA for cryptography
const pair = await db.sea.pair()
const encrypted = await db.sea.encrypt('data', pair)
```

### Peer Methods

```typescript
const peer = new Peer(options)

// Lifecycle
await peer.start()     // Initialize and start
await peer.restart()   // Restart with backoff
await peer.stop()      // Graceful shutdown

// Configuration
peer.read()           // Read configuration
peer.write(config)    // Write configuration
await peer.sync()     // Sync from remote

// Status
peer.alive()          // Send heartbeat
await peer.ip.get()   // Get public IP
await peer.status.ddns() // Update DDNS
```

## Monitoring

### Status Updates

Air automatically reports:
- **Heartbeat**: Every 60 seconds
- **IP Status**: Every 5 minutes
- **DDNS Updates**: Every 5 minutes
- **Config Sync**: Every hour

### Accessing Status

```javascript
// Via GUN
gun.user().get('status').get('alive').on(data => {
    console.log('Peer status:', data)
})

// Via StatusReporter
const status = statusReporter.getStatus()
console.log('Current status:', status)
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Find process using port
   lsof -i:8765
   # Or check PID file
   ls -la .air-*.pid
   ```

2. **TypeScript compilation errors**:
   ```bash
   # Use permissive build
   npx tsc -p tsconfig.prod.json
   ```

3. **Module resolution issues**:
   - Ensure all relative imports have `.js` extensions
   - Use `"module": "NodeNext"` in tsconfig.json

4. **Multiple instances**:
   ```bash
   # Remove stale PID files
   rm .air-*.pid
   ```

### Debugging

```bash
# Enable debug output
DEBUG=* node dist/main.js

# Check logs
journalctl -u air-my-peer -f

# Test configuration
node -e "console.log(require('./dist/config').default.read())"
```

## Development

### Code Style

- TypeScript with modern ES2020+ features
- Single-word function names or dot notation
- No camelCase in function names
- Comprehensive type definitions
- Error handling with try/catch

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Build: `npm run build:prod`
6. Submit a pull request

### Project Structure Rules

- **Source files**: All TypeScript in `src/`
- **Compiled output**: JavaScript in `dist/`
- **Temporary files**: Use `tmp/` directory only
- **Type definitions**: In `src/types/`
- **Tests**: In `test/` directory

## Migration from v1.x

### Breaking Changes

- Now written in TypeScript (was JavaScript)
- Requires `.js` extensions in imports
- New build step for Node.js deployment
- Updated configuration structure

### Migration Steps

1. Backup your `air.json` configuration
2. Update to v2.0.0
3. Run `npm install`
4. Build: `npm run build:prod`
5. Update deployment scripts to use `dist/main.js`

## Performance

### Benchmarks

- **Startup time**: ~500ms (Bun), ~800ms (Node.js)
- **Memory usage**: ~50MB base
- **Peer connections**: Tested with 100+ peers
- **Data throughput**: 10MB/s+ local network

### Optimization Tips

1. Use Bun for best performance
2. Enable SSL for production
3. Configure appropriate peer limits
4. Use SSD for data storage
5. Implement data pagination

## Security

### Best Practices

- Always use SSL in production
- Rotate SEA keys periodically
- Validate peer connections
- Implement rate limiting
- Monitor status endpoints
- Use environment variables for secrets

### SSL/TLS

Air supports automatic SSL certificate management:

```bash
# Auto-provision with Let's Encrypt
./install.sh --ssl --domain peer.example.com

# Manual configuration
echo "SSL_KEY=/etc/letsencrypt/live/peer.example.com/privkey.pem" >> .env
echo "SSL_CERT=/etc/letsencrypt/live/peer.example.com/fullchain.pem" >> .env
```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- GitHub Issues: [Report bugs](https://github.com/akaoio/air/issues)
- Documentation: [Wiki](https://github.com/akaoio/air/wiki)
- Community: [Discussions](https://github.com/akaoio/air/discussions)

## Credits

Built on top of:
- [GUN](https://gun.eco) - Distributed graph database
- [SEA](https://gun.eco/docs/SEA) - Security, Encryption, Authorization
- [Bun](https://bun.sh) - Fast JavaScript runtime
- [TypeScript](https://www.typescriptlang.org) - Type-safe JavaScript

---

Made with ❤️ by the Air team