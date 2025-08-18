# Air - GUN Database Wrapper Codebase Documentation

> **Last Updated**: December 2024  
> **Version**: 1.0.0  
> **Status**: Production Ready

## Project Overview

Air is a production-ready wrapper for the GUN distributed graph database that provides peer-to-peer synchronization, automatic SSL management, and dynamic DNS updates. It is built on a custom enhanced version of GUN from akaoio/gun.

## Quick Reference for AI Assistants

When working with this codebase:
1. **Function naming convention**: All functions must use single-word names. Related functions are grouped using dot notation.
   - Single-word functions: `read()`, `write()`, `sync()`, `init()`, `restart()`, `start()`, `run()`, `online()`, `activate()`
   - Grouped functions: `ip.get()`, `ip.validate()`, `status.ddns()`, `status.ip()`, `status.alive()`
   - No camelCase, underscores, or hyphens in function names
2. **Test everything**: Run `npm test` before committing changes
3. **PID file management**: Air uses PID files to prevent duplicate instances
4. **Configuration precedence**: CLI arguments > environment variables > configuration file > defaults
5. **Restart behavior**: Exponential backoff with jitter (5s, 10s, 20s, 40s, 60s max)

## Architecture & Core Components

### Main Entry Points

-   `main.js` - Application entry point that initializes and starts the database
-   `index.js` - Module export file for using Air as a library
-   `db.js` - Database instance factory that creates the Peer instance

### Core Class: Peer (Peer.js)

The `Peer` class is the heart of the application, managing:

-   HTTP/HTTPS server creation with SSL support
-   GUN database initialization and peer connections
-   Configuration management (reading/writing air.json)
-   Automatic restart on crashes (maximum 5 attempts with exponential backoff)
-   User authentication using GUN SEA cryptographic pairs
-   Public IP detection using multiple methods (DNS and HTTP)
-   Dynamic DNS updates for GoDaddy
-   Remote configuration synchronization
-   Heartbeat/alive status reporting

Key methods in Peer.js:

**Core Methods (single-word naming):**
-   `start()` - Main initialization sequence (sync → run → online)
-   `init()` - Server initialization with error handling and restart logic
-   `restart()` - Handles server restart attempts with progressive delays
-   `run()` - Initializes GUN instance and user authentication
-   `online()` - Authenticates user and starts status reporting loops
-   `activate()` - Links peer to system hub
-   `read()` - Reads configuration from air.json file
-   `write()` - Writes configuration to air.json file
-   `sync()` - Syncs configuration from remote URL (runs every hour)

**IP Detection Methods (grouped with dot notation):**
-   `ip.get()` - Main IP detection method with fallbacks
-   `ip.validate()` - Validates IP address format and range
-   `ip.dns()` - DNS-based IP detection (dig/nslookup)
-   `ip.http()` - HTTP-based IP detection
-   `ip.config()` - Returns IP detection configuration

**Status Methods (grouped with dot notation):**
-   `status.ddns()` - Updates GoDaddy DNS records (runs every 5 minutes)
-   `status.ip()` - Reports current public IP (runs every 5 minutes)
-   `status.alive()` - Sends heartbeat status (runs every minute)

**Process Management (single-word naming):**
-   `checkpid()` - Checks for running instances via PID file
-   `cleanpid()` - Removes PID file on exit
-   `findport()` - Finds process using specific port

**Internal Helper Methods (single-word naming):**
-   `getip()` - Internal method for IP detection
-   `dnsip()` - Internal DNS IP detection
-   `httpip()` - Internal HTTP IP detection
-   `configip()` - Internal IP config getter
-   `validateip()` - Internal IP validation
-   `ddns()` - Internal DDNS update
-   `updateip()` - Internal IP update
-   `alive()` - Internal alive status

### Utilities

-   `libs/utils.js` - Contains `merge()` function for deep merging configuration objects

## Configuration

### Main Configuration File: air.json

```json
{
    "root": "/path/to/air",           // Project root directory
    "bash": "/path/to/scripts",       // Script directory
    "env": "production",               // Environment (production/development)
    "name": "mypeer",                  // Peer name
    "sync": "https://...",            // Remote config sync URL (optional)
    "ip": {                           // IP detection configuration
        "timeout": 5000,
        "dnstimeout": 3000,
        "agent": "Air-GUN-Peer/1.0",
        "dns": [...],                 // DNS services for IP detection
        "http": [...]                 // HTTP services for IP detection
    },
    "production": {                   // Environment-specific config
        "domain": "peer.example.com",
        "port": 443,
        "ssl": {
            "key": "/path/to/privkey.pem",
            "cert": "/path/to/cert.pem"
        },
        "godaddy": {                  // DDNS configuration
            "domain": "example.com",
            "host": "peer",
            "key": "api_key",
            "secret": "api_secret"
        },
        "peers": ["wss://peer1.com/gun"],
        "pair": {                     // SEA cryptographic keys
            "pub": "...",
            "priv": "...",
            "epub": "...",
            "epriv": "..."
        }
    }
}
```

### Environment Variables

The application supports configuration via environment variables:

-   `ROOT` - Project root directory
-   `BASH` - Script directory
-   `ENV` - Environment (production/development)
-   `NAME` - Peer name
-   `DOMAIN` - Domain name
-   `PORT` - Server port
-   `SSL_KEY` - Path to SSL private key
-   `SSL_CERT` - Path to SSL certificate
-   `PUB`, `PRIV`, `EPUB`, `EPRIV` - SEA cryptographic keys
-   `IP_TIMEOUT` - IP detection timeout
-   `IP_DNS_TIMEOUT` - DNS query timeout
-   `IP_AGENT` - User agent for HTTP requests

### Command Line Arguments

The application accepts command-line arguments (processed sequentially):

1. `argv[2]` - root directory
2. `argv[3]` - bash directory
3. `argv[4]` - environment
4. `argv[5]` - peer name
5. `argv[6]` - domain
6. `argv[7]` - port
7. `argv[8]` - SSL key path
8. `argv[9]` - SSL cert path
9. `argv[10-13]` - SEA keys (pub, priv, epub, epriv)

## Dependencies

-   `gun` (github:akaoio/gun) - Custom enhanced GUN database
-   `node-fetch` (^3.0.0) - HTTP client for external API calls
-   `prettier` (^2.4.1) - Code formatter (dev dependency)

## Installation & Management Scripts

### install.sh

An interactive installer that configures:

-   Environment configuration
-   SSL certificates (Let's Encrypt)
-   Systemd service
-   GoDaddy DDNS cron jobs
-   Peer connections

Supports both interactive and command-line argument modes.

### update.sh

An automated update script that:

-   Pulls Git updates
-   Updates npm packages
-   Renews SSL certificates
-   Restarts services

### ddns.sh

Updates GoDaddy DNS A records with the current public IP address.

### uninstall.sh

Removes the systemd service and cleans up cron jobs.

## Code Style & Conventions

### JavaScript Style

-   ES6 modules (`import`/`export`)
-   Modern JavaScript features (arrow functions, async/await, optional chaining)
-   Configuration precedence: Command arguments > environment variables > configuration file > defaults
-   Error handling with try/catch blocks and Promise chains
-   Automatic retry logic for critical operations


## Build & Test Commands

### Available NPM Scripts

```bash
npm start          # Start the application (runs main.js)
npm test           # Run test suite
npm run format     # Format code with Prettier
```

### Running the Application

```bash
# Development mode
npm start

# Production mode with environment variable
ENV=production npm start

# With command-line arguments
node main.js /path/to/root /path/to/bash production mypeer example.com 443
```

### Code Formatting

```bash
npm run format     # Format all files with Prettier
```

## Important Implementation Details

### Restart Logic

The Peer class implements automatic restart on server errors:

-   Maximum of 5 restart attempts
-   Progressive delay with exponential backoff:
    -   Base delay: 5 seconds
    -   Doubles with each attempt: 5s → 10s → 20s → 40s → 60s (capped at 60s)
    -   Includes ±20% jitter to prevent the thundering herd problem
-   Resets counter upon successful start
-   Exits process after maximum attempts are reached

### IP Detection Strategy

Multiple fallback methods for detecting the public IP address:

1. DNS queries using dig (fastest)
2. DNS queries using nslookup (fallback)
3. HTTP requests to multiple services
4. Validates IP format and excludes private/reserved ranges

### Configuration Merging

Deep merge strategy with the following precedence:

1. Command-line arguments (highest priority)
2. Environment variables
3. Configuration file (air.json)
4. Default values (lowest priority)

### Security Features

-   SEA cryptographic authentication
-   SSL/TLS support with automatic certificate management
-   Secure key storage in configuration
-   IP validation to prevent private IP address exposure

## Monitoring & Status

The application maintains several status update loops:

-   **Heartbeat**: Every 60 seconds (alive status)
-   **IP Update**: Every 5 minutes (public IP detection)
-   **DDNS Update**: Every 5 minutes (GoDaddy DNS)
-   **Config Sync**: Every hour (remote configuration)

All status updates are written to the authenticated GUN user node.

## Error Handling

The application includes comprehensive error handling:

-   Server errors trigger automatic restarts
-   Failed operations log errors without crashing
-   Promise rejections are caught and logged
-   Network timeouts are configurable
-   Graceful degradation when optional features fail

## Usage as a Module

```javascript
import { db } from "./index.js"

const main = async () => {
    await db.start()

    // Access GUN instance and utilities
    const { GUN, gun, sea, user } = db

    // Your application logic
    user.get("profile").put({ name: "Alice" })
}

main()
```

## GUN SEA Access

Air exposes the complete GUN SEA API through:
- `db.GUN` - GUN constructor
- `db.gun` - GUN instance  
- `db.sea` - SEA cryptographic functions
- `db.user` - Air's authenticated user (keys from air.json `[env].pair`)

Example implementations are available in the `examples/` directory.

## Environment-Specific Behavior

### Development

-   Default port: 8765
-   Default domain: localhost
-   No SSL by default
-   Simplified configuration

### Production

-   Requires domain configuration
-   Automatic SSL with Let's Encrypt
-   DDNS updates enabled
-   Full peer synchronization

## Testing

The project includes a comprehensive test suite:

```bash
npm test  # Run all tests
```

### Test Structure
- `test/runner.js` - Custom test runner with colored output
- `test/unit/` - Unit tests for individual components
  - `peer.test.js` - Peer class tests (45+ test cases)
  - `utils.test.js` - Utility function tests (30+ test cases)
  - `config.test.js` - Configuration handling tests (20+ test cases)
  - `ip.test.js` - IP detection tests (25+ test cases)
- `test/integration/` - Integration tests
  - `lifecycle.test.js` - Full lifecycle tests (15+ test cases)
- `test/fixtures/` - Test data and temporary files

### Test Coverage
- Configuration precedence and merging
- IP validation and detection methods
- Restart logic with exponential backoff
- PID file management
- Edge cases (null, undefined, malformed data)
- Error scenarios (network failures, port conflicts)
- Mock support for fetch, filesystem, process operations

## Recent Changes & Improvements

### December 2024
1. **Refactored method names**: Removed all camelCase in favor of single-word names or dot notation
2. **Added PID file management**: Prevents duplicate instances
3. **Enhanced port conflict detection**: Better error messages and process identification
4. **Comprehensive test suite**: 135+ test cases covering all components
5. **Progressive restart delay**: Exponential backoff with jitter
6. **Improved IP detection**: Multiple fallback methods (DNS, HTTP)

## Notes for Future Development

1. **Linting**: Consider adding ESLint for code consistency

2. **Type Checking**: Consider adding TypeScript or JSDoc type annotations

3. **Logging**: Currently uses console.log/error. Consider implementing structured logging.

4. **Monitoring**: Status updates are written to GUN. Consider adding external monitoring/alerting.

5. **Documentation**: API documentation for module usage could be expanded.

6. **Security**: Review cryptographic key management and consider implementing key rotation.

7. **Performance**: IP detection runs every 5 minutes. Consider caching or event-based updates.

## Common Tasks

### Adding a New Peer

Edit air.json and add the new peer to the peers array:

```json
"peers": [
    "wss://existing-peer.com/gun",
    "wss://new-peer.com/gun"
]
```

### Changing Port

Update the port in air.json under the appropriate environment:

```json
"production": {
    "port": 8080
}
```

### Enabling SSL

1. Obtain a domain and point it to the server
2. Run the installer with the --ssl flag
3. Alternatively, manually add SSL configuration to air.json

### Debugging

-   Check systemd logs: `journalctl -u air-[name]`
-   View application output: `npm start`
-   Inspect configuration: `cat air.json`
-   Check GUN data: Files in `radata/` directory
-   Check for running instances: `ls -la .air-*.pid`
-   Find process using port: `lsof -i:8765` or `netstat -tlnp | grep :8765`
-   Run tests: `npm test`

## Best Practices

### When Modifying Code
1. **Run tests first**: Execute `npm test` to ensure nothing is broken
2. **Follow the naming convention**: 
   - All functions must use single-word names (e.g., `read()`, `write()`, `sync()`)
   - Use dot notation to group related functions (e.g., `ip.get()`, `status.ddns()`)
   - Never use camelCase, underscores, or hyphens in function names
3. **Add tests for new features**: Place them in the appropriate test file
4. **Update documentation**: Update both README.md and CLAUDE.md
5. **Format code**: Run `npm run format` before committing
6. **Use tmp/ for temporary files**: ALL temporary files, test outputs, and development artifacts MUST be placed in the `tmp/` directory (which is gitignored). Never create test, report, or trash files in the root or other directories

### Configuration Management
1. **Never commit secrets**: Keep API keys in environment variables
2. **Use configuration precedence**: CLI > ENV > file for flexibility
3. **Validate configuration values**: Check for null/undefined before use
4. **Back up air.json**: Create a backup before making major changes

### Error Handling
1. **Do not suppress errors**: Log them for debugging
2. **Use try-catch blocks**: Especially for asynchronous operations
3. **Implement fallbacks**: Particularly for network operations
4. **Test error scenarios**: Include them in the test suite

### Performance Considerations
1. **IP detection caching**: Runs every 5 minutes; consider if more frequent updates are needed
2. **Restart delays**: Exponential backoff prevents resource exhaustion
3. **PID file checks**: Prevent duplicate instances and port conflicts
4. **Configuration sync interval**: Runs every hour; adjust if needed

## Important Guidelines

### Naming Conventions
- **Do not use camelCase**: All function names must be single words
- **Do not use hyphens or underscores**: Only single-word naming is allowed
- **Use dot notation for grouping**: Related functions can be grouped using dot notation (e.g., `ip.get()`, `status.alive()`)

### File Management
- **Temporary files**: All temporary files, test outputs, and development artifacts must be placed in the `tmp/` directory
- **Keep root clean**: Never create test, report, or trash files in the root directory or other project directories
- **Git ignore tmp/**: The `tmp/` directory must be included in `.gitignore`

### Development Workflow
- **Test before committing**: Always run `npm test` and ensure all tests pass before committing
- **Commit completed features**: Always commit and push when features are fixed or added
- **Maintain test coverage**: Add tests for all new features and bug fixes