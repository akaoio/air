# Air Battle Test Suite

This directory contains Battle framework tests for the Air project, providing real PTY emulation for accurate terminal application testing.

## What is Battle?

Battle is a universal terminal testing framework that uses real pseudo-terminals (PTY) instead of pipes, revealing bugs that traditional testing misses. It provides:

- **Real PTY emulation** - Tests run in actual terminals, not fake pipes
- **Interactive testing** - Can test prompts, inputs, and terminal UI
- **Replay system** - Record and replay test sessions for debugging
- **Screenshots** - Capture terminal state at any point

## Test Structure

```
test/battle/
├── index.ts              # Main test runner
├── scripts.battle.ts     # Tests for non-interactive commands
├── interactive.battle.ts # Tests for interactive prompts
└── README.md            # This file
```

## Running Tests

```bash
# Run all Battle tests
npm run test:battle

# Run specific test suites
npm run test:battle:scripts      # Non-interactive command tests
npm run test:battle:interactive  # Interactive prompt tests

# Run with verbose output
tsx test/battle/index.ts --verbose
```

## Why Battle vs Traditional Tests?

### Traditional Pipe Testing (Bun test)
```javascript
// ❌ Misses real terminal behavior
const result = execSync('air install --non-interactive')
expect(result.toString()).toContain('success')
```

### Battle PTY Testing
```javascript
// ✅ Tests actual terminal behavior
const battle = new Battle()
await battle.run(async (b) => {
    b.spawn('air', ['install'])
    await b.expect('Enter name:')
    b.sendKey('my-air')
    b.sendKey('enter')
    // ... more interactions
})
```

## Test Coverage

### Scripts Test Suite (`scripts.battle.ts`)
- ✅ Install command (non-interactive mode)
- ✅ Install command help
- ✅ Status command
- ✅ DDNS command
- ✅ Logs command
- ✅ Uninstall command

### Interactive Test Suite (`interactive.battle.ts`)
- ✅ Interactive install with prompts
- ✅ Interactive uninstall with confirmation
- ✅ Interactive config updates
- ✅ CI environment detection
- ✅ Keyboard interruption (Ctrl+C)

## Key Differences from Bun Tests

| Feature | Bun Tests | Battle Tests |
|---------|-----------|--------------|
| Terminal Type | Fake pipes | Real PTY |
| Interactive Testing | Limited | Full support |
| ANSI Sequences | Stripped | Preserved |
| TTY Detection | `isatty() = false` | `isatty() = true` |
| Debugging | Console logs | Replay files |

## Debugging Failed Tests

When tests fail, Battle creates replay files in the `logs/` directory:

```bash
# View replay files
ls logs/replay-*.json

# Play back a test session
battle replay logs/replay-1234567890.json

# Export to HTML for browser viewing
battle replay export logs/replay-1234567890.json --format html
```

## Writing New Battle Tests

### Basic Pattern
```typescript
async function testMyFeature() {
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 10000,
        verbose: false 
    })
    
    const result = await battle.run(async (b) => {
        // Spawn the command
        b.spawn('node', ['script/my-script.js'])
        
        // Wait for output
        await b.wait(500)
        
        // Check for expected text
        await b.expect('Expected output')
        
        // Send keyboard input
        b.sendKey('y')
        b.sendKey('enter')
        
        // Take a screenshot for debugging
        b.screenshot('my-test-screenshot')
    })
    
    console.log(result.success ? '✓ PASS' : `✗ FAIL: ${result.error}`)
}
```

### Interactive Testing Pattern
```typescript
// Test interactive prompts
await battle.run(async (b) => {
    b.spawn('air', ['install'])
    
    // Answer prompts
    await b.expect('name:')
    b.sendKey('my-instance')
    b.sendKey('enter')
    
    await b.expect('port:')
    b.sendKey('8765')
    b.sendKey('enter')
    
    // Verify completion
    await b.expect('Installation complete')
})
```

## Common Issues

### Tests Hanging
- Increase timeout: `new Battle({ timeout: 30000 })`
- Add explicit waits: `await b.wait(1000)`
- Check for blocking prompts

### Pattern Not Found
- Clean ANSI codes from output
- Use regex for flexible matching: `await b.expect(/success/i)`
- Add more wait time before expecting

### Environment Issues
- Set proper working directory: `cwd: projectRoot`
- Pass environment variables: `env: { AIR_ROOT: testRoot }`
- Ensure test isolation with unique names/ports

## Benefits of Battle Testing

1. **Catches Real Bugs** - Reveals TTY-specific issues
2. **Interactive Testing** - Tests user prompts and inputs
3. **Replay Debugging** - Record and replay failed tests
4. **Cross-Platform** - Works on Linux, macOS, Windows
5. **Self-Testing** - Battle tests itself for reliability

## Migration from Bun Tests

The original Bun tests remain in:
- `test/scripts.test.ts`
- `test/interactive.test.ts`

Battle tests provide additional coverage for:
- Terminal-specific behavior
- Interactive command flows
- Real PTY edge cases

Both test suites can coexist and complement each other.

## Performance Considerations

Battle tests are slower than pipe tests due to real PTY overhead:
- Spawn: ~15ms vs ~5ms
- I/O: ~10μs vs <1μs
- Overall: ~3-10× slower

This overhead is worth it for catching real bugs that pipe testing misses.

## Contributing

When adding new Air commands or features:
1. Add corresponding Battle tests
2. Test both interactive and non-interactive modes
3. Use meaningful test names
4. Clean up test environments
5. Document any special requirements

## Resources

- [Battle Framework Documentation](https://github.com/akaoio/battle)
- [PTY vs Pipe Testing](https://github.com/akaoio/battle/blob/main/CLAUDE.md)
- [Air Project Documentation](../../README.md)