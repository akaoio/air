# Air - GUN Database System Codebase Documentation for AI Assistants

> **Last Updated**: December 2024  
> **Version**: 2.0.0  
> **Language**: TypeScript
> **Status**: Production Ready

## Project Overview

Air is a production-ready distributed database system built on GUN, providing peer-to-peer synchronization, automatic SSL management, and dynamic DNS updates. The codebase has been fully migrated to TypeScript for type safety and modern development practices.

## Critical Information for AI Assistants

### TypeScript and ES Modules

**IMPORTANT**: This project uses TypeScript with ES modules for Node.js. When working with imports:

1. **All relative imports MUST have `.js` extensions** even though source files are `.ts`:
   ```typescript
   // CORRECT - even though the file is config.ts
   import { ConfigManager } from './config.js'
   
   // WRONG - will fail in Node.js
   import { ConfigManager } from './config'
   ```

2. **Why this works**: TypeScript understands that `'./config.js'` refers to `./config.ts` during compilation, and the output will actually be `./config.js`

3. **Build configurations**:
   - `tsconfig.json` - Strict configuration for development
   - `tsconfig.prod.json` - Permissive configuration for production builds with `"module": "NodeNext"`

### Runtime Support

Air supports three runtime environments:
1. **Bun**: Native TypeScript execution (fastest)
2. **Node.js with TypeScript**: Using tsx for development
3. **Node.js without TypeScript**: Compiled JavaScript in `dist/` directory

### Function Naming Convention

**STRICT RULE**: All functions must use single-word names. Related functions are grouped using dot notation:
- Single-word functions: `read()`, `write()`, `sync()`, `init()`, `restart()`
- Grouped functions: `ip.get()`, `ip.validate()`, `status.ddns()`, `status.alive()`
- **NEVER** use camelCase, underscores, or hyphens in function names

## Architecture & Core Components

### Directory Structure

```
src/                  # TypeScript source files
├── main.ts          # Entry point
├── index.ts         # Module exports
├── db.ts            # Database factory
├── Peer.ts          # Core peer class
├── config.ts        # Configuration management
├── process.ts       # Process management
├── status.ts        # Status reporting
├── network.ts       # Network utilities
├── paths.ts         # Path resolution
├── lib/
│   └── utils.ts     # Utility functions
└── types/
    └── index.ts     # TypeScript type definitions

dist/                # Compiled JavaScript output
├── *.js            # Compiled ES modules
└── lib/
    └── utils.js    # Compiled utilities

test/               # Test files (JavaScript)
├── runner.js       # Test runner
├── unit/          # Unit tests
└── integration/   # Integration tests
```

### Core Classes and Their Responsibilities

#### Peer Class (src/Peer.ts)

The main class managing the distributed database instance:

```typescript
export class Peer implements IPeer {
    // Core methods (single-word naming)
    async start()      // Main initialization
    async restart()    // Restart with backoff
    async init()       // Server initialization
    async run()        // GUN initialization
    async online()     // User authentication
    async sync()       // Config synchronization
    
    // IP methods (dot notation grouping)
    ip = {
        get: async () => IPResult
        validate: (ip: string) => boolean
        dns: async () => string | null
        http: async () => string | null
    }
    
    // Status methods (dot notation grouping)
    status = {
        ddns: async () => void
        ip: async () => void
        alive: () => void
    }
}
```

#### ConfigManager (src/config.ts)

Handles configuration with precedence: CLI > ENV > file > defaults

```typescript
export class ConfigManager {
    read(): AirConfig
    write(config: AirConfig): void
    merge(...configs: Partial<AirConfig>[]): AirConfig
}
```

#### ProcessManager (src/process.ts)

PID file management and port conflict detection:

```typescript
export class ProcessManager {
    checkpid(): boolean
    cleanpid(): void
    find(port: number): ProcessInfo | null
}
```

#### StatusReporter (src/status.ts)

Status reporting to GUN database:

```typescript
export class StatusReporter {
    start(): void
    stop(): void
    alive(): void
    ip(): Promise<void>
    ddns(): Promise<void>
}
```

#### Network (src/network.ts)

IP detection and DDNS updates:

```typescript
class Network {
    get(): Promise<IPResult>
    validate(ip: string): boolean
    update(config: AirConfig, ips: IPResult): Promise<UpdateResult[]>
}
```

## Type System

### Main Types (src/types/index.ts)

```typescript
interface AirConfig {
    name: string
    env: Environment
    root?: string
    bash?: string
    sync?: string
    [env: string]: EnvironmentConfig | any
}

interface EnvironmentConfig {
    domain?: string
    port: number
    ssl?: SSLConfig
    peers?: string[]
    pair?: SEAPair
    godaddy?: GoDaddyConfig
}

type Environment = 'production' | 'development'
type Runtime = 'bun' | 'node' | 'deno'
```

## Building and Compilation

### Development

```bash
# Run with Bun (native TypeScript)
bun run src/main.ts

# Run with Node.js + tsx
npx tsx src/main.ts

# Development with hot reload (Bun)
npm run dev
```

### Production Build

```bash
# Compile TypeScript to JavaScript
npm run build:prod
# This runs: npx tsc -p tsconfig.prod.json

# Run compiled JavaScript
node dist/main.js
```

### Build Configuration Details

**tsconfig.prod.json** (for production builds):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "noImplicitAny": false,
    "skipLibCheck": true
  }
}
```

## Testing

Tests remain in JavaScript for simplicity:

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests
```

Test coverage includes:
- Configuration precedence
- IP detection methods
- Restart logic
- PID file management
- Error scenarios

## Common Development Tasks

### Adding a New Feature

1. Create TypeScript file in `src/`
2. Use `.js` extensions for all relative imports
3. Follow single-word or dot notation naming
4. Add types to `src/types/index.ts`
5. Run `npm run build:prod` to compile
6. Test with `npm test`

### Fixing TypeScript Errors

If you encounter compilation errors:
1. Use `npx tsc -p tsconfig.prod.json` for permissive build
2. Cast problematic expressions with `as any` if needed
3. Ensure all relative imports have `.js` extensions

### Debugging

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Build with source maps
npx tsc -p tsconfig.prod.json --sourceMap

# Run with debugging
DEBUG=* node dist/main.js
```

## Important Implementation Details

### Restart Logic

- Maximum 5 attempts with exponential backoff
- Delays: 5s → 10s → 20s → 40s → 60s (capped)
- ±20% jitter to prevent thundering herd

### IP Detection Strategy

1. DNS queries (fastest)
2. HTTP requests to multiple services
3. Validates IP format and excludes private ranges

### Configuration Merging

Precedence (highest to lowest):
1. Command-line arguments
2. Environment variables
3. Configuration file (air.json)
4. Default values

### PID File Management

- Creates `.air-${name}.pid` files
- Prevents duplicate instances
- Cleans up on exit

## Migration from JavaScript (v1.x)

### What Changed

1. **Language**: JavaScript → TypeScript
2. **Imports**: Now require `.js` extensions
3. **Build step**: Required for Node.js deployment
4. **Type safety**: Full type definitions
5. **Structure**: Source in `src/`, output in `dist/`

### Key Migration Decisions

1. **Why `.js` extensions in TypeScript?**
   - Node.js ES modules require file extensions
   - TypeScript's `"module": "NodeNext"` expects this pattern
   - Avoids post-processing scripts (no monkey patches)

2. **Why two tsconfig files?**
   - `tsconfig.json`: Strict for development and IDE support
   - `tsconfig.prod.json`: Permissive for building runnable code

3. **Why keep tests in JavaScript?**
   - Simpler test runner
   - No compilation needed for tests
   - Tests verify compiled output works

## Best Practices

### When Modifying Code

1. **Always test builds**: Run `npm run build:prod` before committing
2. **Verify imports**: Ensure all relative imports use `.js` extensions
3. **Check runtime compatibility**: Test with `node dist/main.js`
4. **Follow naming convention**: Single words or dot notation only
5. **Update types**: Add new interfaces to `src/types/index.ts`
6. **Use tmp/ for temporary files**: Never create temporary files elsewhere

### TypeScript Guidelines

1. **Import extensions**: Always use `.js` for relative imports
2. **Type safety**: Add types where possible, use `any` sparingly
3. **Build errors**: Use `tsconfig.prod.json` for permissive builds
4. **Runtime detection**: Check `typeof Bun !== 'undefined'` for Bun

### Configuration Management

1. **Never commit secrets**: Use environment variables
2. **Test configuration**: Verify with `ConfigManager.read()`
3. **Backup air.json**: Before major changes
4. **Validate values**: Check for null/undefined

## Troubleshooting Guide

### Common Issues and Solutions

1. **Import errors in Node.js**
   - Ensure all relative imports have `.js` extensions
   - Check `"module": "NodeNext"` in tsconfig

2. **TypeScript compilation fails**
   - Use `tsconfig.prod.json` for production builds
   - Cast problematic expressions to `any` if needed

3. **Module not found errors**
   - Verify file exists in `src/`
   - Check import path includes `.js`
   - Ensure TypeScript compiled successfully

4. **PID file issues**
   - Remove stale `.air-*.pid` files
   - Check process not already running

## Development Workflow

### Standard Development Cycle

```bash
# 1. Make changes in src/
edit src/feature.ts

# 2. Ensure imports use .js
import { something } from './other.js'

# 3. Build
npm run build:prod

# 4. Test
npm test

# 5. Run
node dist/main.js

# 6. Commit
git add -A
git commit -m "feat: add new feature"
git push
```

### Quick Commands Reference

```bash
npm start          # Run with best available runtime
npm run dev        # Development with hot reload (Bun)
npm run build:prod # Compile TypeScript to JavaScript
npm test           # Run test suite
npm run format     # Format code with Prettier
```

## Important Notes

### File Management
- **Source files**: TypeScript in `src/`
- **Compiled output**: JavaScript in `dist/`
- **Temporary files**: MUST use `tmp/` directory
- **Configuration**: `air.json` in root
- **Tests**: JavaScript in `test/`

### Git Workflow
- `.gitignore` includes `dist/` and `tmp/`
- Commit source files, not compiled output
- Always push after fixing features

### Performance Considerations
- Bun: ~500ms startup, native TypeScript
- Node.js + tsx: ~800ms startup, TypeScript transpilation
- Node.js compiled: ~800ms startup, no transpilation overhead

## Current Status (December 2024)

### Completed
✅ Full TypeScript migration
✅ ES module configuration with .js extensions
✅ Multi-runtime support (Bun, Node+TS, Node compiled)
✅ Production build configuration
✅ Type definitions for all components
✅ No monkey patches or workarounds

### Known Limitations
- Some files excluded from strict build (syspaths.ts, permissions.ts)
- GUN types use `any` due to complex dynamic API
- Test files remain in JavaScript

### Future Improvements
- Stricter TypeScript configuration
- Better GUN type definitions
- TypeScript test migration
- Source map support in production

---

**For AI Assistants**: When working on this codebase, always remember:
1. Use `.js` extensions in all relative imports
2. Follow single-word or dot notation naming
3. Test with `npm run build:prod` before committing
4. Place temporary files in `tmp/` only
5. This is TypeScript that compiles to ES modules for Node.js