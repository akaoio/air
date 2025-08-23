# Air Test Suite Documentation

## Overview

The Air project includes a comprehensive test suite that validates all functionality, commands, and modules.

## Test Commands

### Quick Test
```bash
npm run test:quick
```
Fast validation of essential functionality. Runs in seconds.

### Official Test Suite
```bash
npm run test:official
# or
npm run test:suite
```
Comprehensive testing of all Air components including:
- All package.json scripts
- UI components (Viewport, BeautifulConsole)
- Core modules (Config, Process, DDNS, Paths)
- Script commands with help output
- Environment variables
- Build outputs

Generates a detailed report in `test-report.json`.

### Other Test Commands
```bash
npm test              # Run basic tests
npm run test:build    # Test build formats
npm run test:coverage # Run coverage tests
npm run test:all      # Run all tests
```

## UI Components

The Air UI system has two modes:

1. **Ink (React-based)** - For terminals with raw mode support
2. **BeautifulConsole** - Fallback for Termux/SSH/non-TTY environments

### Building UI Components
```bash
npm run build:ui
```
This compiles TypeScript UI files to JavaScript for runtime import.

### Viewport System

The Viewport manager provides runtime terminal detection:
- Zero hardcoded sizes
- Dynamic width/height detection
- Mobile/Termux detection
- RGB/Unicode support detection
- Responsive breakpoints (xs/sm/md/lg/xl)

## Test Structure

```
test/
├── official-test-suite.ts  # Comprehensive test suite
├── quick-test.ts           # Fast essential tests
├── universal.test.ts       # Cross-runtime tests
├── build-formats.test.ts   # Build format tests
└── README.md              # This file
```

## Running Status Command

The status command works across all environments:

```bash
# With Bun (fastest)
bun script/status-modern.ts

# With TSX
tsx script/status-modern.ts
npx tsx script/status-modern.ts

# With npm (tries all methods)
npm run status

# Non-interactive mode
npm run status -- --non-interactive

# JSON output
npm run status -- --non-interactive --json
```

## Troubleshooting

### "viewport is not defined" Error
Run `npm run build:ui` to compile UI components.

### TypeScript Errors
Some TypeScript warnings are expected. Use `npm run typecheck` to see them.

### Bun Not Found
The scripts fallback to tsx automatically when Bun isn't available.

## Environment Variables

- `AIR_ENV` - Set environment (development/production/test)
- `TERMUX_VERSION` - Detected automatically on Termux
- `COLORTERM` - Used for RGB color support detection

## Test Reports

After running `npm run test:official`, check:
- Console output for summary
- `test-report.json` for detailed results

## CI/CD Integration

For CI/CD pipelines, use:
```bash
npm run test:quick && npm run build:prod
```

This ensures quick validation and successful builds.