# Air International Standards Compliance

## 🌍 Standards Implemented

## 🎯 Dual-Mode Operation

Air operates in two distinct modes based on usage context:

### Module Mode

```bash

```

**Characteristics:**

### Super-Peer Mode

```bash

```

**Characteristics:**

## 🔒 Singleton Pattern

### Lock Files

- **Location**:
- **Format**:

### PID Files

- **Location**:
- **Format**:
- **Description**:
- **Usage**:

### Instance Management

```typescript
// Check if Air is running
const status = checkSingletonStatus("air")
if (status.isRunning) {
    console.log(`Air is running (PID: ${status.pid})`)
}

// Acquire exclusive lock
const lock = acquireLock("air")
if (lock.acquired) {
    // Air instance is now running exclusively
}
```

## 🔄 Legacy Migration

Air automatically migrates from legacy configurations:

### Migration Process

1. **Detection**: Check for `air.json` in current directory (super-peer mode)
2. **Migration**: Copy to XDG-compliant location
3. **Preservation**: Keep original with migration note
4. **Cleanup**: Remove old PID files and state

### Example Migration

```
BEFORE (Legacy):
./air.json                    # Configuration
./.air.pid                    # PID file
./logs/                       # Logs

AFTER (XDG Compliant):
~/.config/air/air.json        # Configuration (migrated)
~/.local/state/air/air.pid    # PID file
~/.local/state/air/logs/      # Logs
./air.json                    # Legacy (with migration note)
```

## 📋 API Usage

### Configuration System

```typescript
import { Config } from "@akaoio/air"

// Automatic mode detection and XDG compliance
const config = new Config()
const airConfig = config.loadXDG()

console.log(airConfig._runtime.mode) // 'module' or 'super-peer'
console.log(airConfig._runtime.xdgCompliant) // true
console.log(airConfig._runtime.configPath) // Actual config file path
```

### Path Detection

```typescript
import { detectAirMode, getXDGDirectories } from "@akaoio/air"

// Get current runtime mode
const mode = detectAirMode()
console.log(`Running in ${mode.mode} mode`)
console.log(`Config: ${mode.configPath}`)

// Get XDG directories
const xdg = getXDGDirectories()
console.log(`Air config: ${xdg.airConfig}`)
```

### Singleton Management

```typescript
import { acquireLock, checkSingletonStatus } from "@akaoio/air"

// Check before starting
const status = checkSingletonStatus("my-air-instance")
if (!status.canAcquire) {
    throw new Error(`Instance already running: PID ${status.pid}`)
}

// Acquire exclusive lock
const lock = acquireLock("my-air-instance")
// Air instance now running exclusively
```

## 🛠 Directory Structure

### Super-Peer Mode (XDG Compliant)

```
~/.config/air/
├── air.json              # Main configuration
└── instances/
    ├── production.json   # Environment-specific configs
    └── staging.json

~/.local/share/air/
├── data/                 # Application data
├── plugins/              # Installed plugins
└── keys/                 # Cryptographic keys

~/.local/state/air/
├── logs/                 # Application logs
│   ├── air.log
│   └── error.log
├── air.pid              # Process ID
├── air.lock             # Singleton lock
└── state.json           # Runtime state

~/.cache/air/
├── temp/                # Temporary files
└── cache/               # Cache data

/run/user/{uid}/air/     # Runtime (if available)
├── air.sock             # Unix socket
└── temp/                # Runtime temporary files
```

### Module Mode (Project-Local)

```
my-project/
├── air.json             # Configuration
└── .air/
    ├── data/            # Data files
    ├── state/           # PID, logs, state
    │   ├── logs/
    │   ├── air.pid
    │   └── air.lock
    ├── cache/           # Cache files
    └── runtime/         # Runtime files
```

## 🌐 Cross-Platform Compatibility

| Platform | Config | Data | State | Cache | Runtime |
| -------- | ------ | ---- | ----- | ----- | ------- |

## ✅ Compliance Benefits

## 🚀 Getting Started

### For Development (Module Mode)

```bash
cd my-project
npm install @akaoio/air
npx air install  # Creates ./air.json
```

### For Production (Super-Peer Mode)

```bash
git clone https://github.com/akaoio/air
cd air
npm install
npm run air:install  # Creates ~/.config/air/air.json
```

### Testing Compliance

```bash
# Test the international standards implementation
npx tsx script/test-xdg.ts

# Check current mode and paths
node -e "console.log(require('./src/Path/xdg.js').detectAirMode())"
```

Air is now a truly international-scale product, compliant with global standards and suitable for enterprise deployment worldwide! 🌍✨

---

_Generated with ❤️ by @akaoio/composer v_

_This documentation is automatically generated from atomic YAML files in `src/doc/` - modify the source atoms, not this file directly._
