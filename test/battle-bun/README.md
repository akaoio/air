# BunBattle - Bun-Native Terminal Testing Framework

A Bun-compatible implementation of the Battle testing framework that runs natively in Bun runtime without requiring Node.js or node-pty.

## 🎯 The Problem

The original Battle framework requires Node.js because it depends on `node-pty`, a native C++ addon that doesn't work with Bun. This means you can't run Battle tests directly with Bun, even though Battle can test Bun applications.

## 💡 The Solution

BunBattle provides two approaches to enable terminal testing in Bun:

### 1. **BunPTY with FFI** (Advanced)
Uses Bun's Foreign Function Interface to call system PTY functions directly:
- Direct calls to POSIX PTY functions (`posix_openpt`, `grantpt`, `unlockpt`)
- Terminal control via `ioctl` and `tcsetattr`
- Real PTY allocation without node-pty

### 2. **BunPTYSimple** (Practical)
Simulates PTY-like behavior using Bun's native spawn:
- Uses `Bun.spawn()` with environment tricks
- Captures stdout/stderr for testing
- Good enough for most testing scenarios

## 📊 Comparison

| Feature | Original Battle | BunBattle | 
|---------|----------------|-----------|
| Runtime | Node.js only | Bun native |
| Real PTY | ✅ Full PTY via node-pty | ⚠️ Simulated PTY |
| Interactive Testing | ✅ Full support | ⚠️ Limited support |
| ANSI Sequences | ✅ Preserved | ⚠️ Partial |
| TTY Detection | ✅ `isatty() = true` | ❌ `isatty() = false` |
| Performance | Slower (Node.js) | Faster (Bun) |
| Replay System | ✅ Full replay | ✅ Full replay |
| Screenshots | ✅ Terminal state | ✅ Output capture |

## 🚀 Usage

### Running with Bun

```bash
# Run BunBattle tests directly with Bun!
bun test/battle-bun/test.ts

# Original Battle still requires Node.js
tsx test/battle/index.ts  # Node.js required
```

### Writing Tests

```typescript
import { BunBattle } from "./BunBattle.js"

const battle = new BunBattle({ 
    verbose: false,
    timeout: 10000 
})

const result = await battle.run(async (b) => {
    // Spawn a command
    b.spawn('echo', ['Hello from Bun!'])
    
    // Wait for output
    await b.wait(100)
    
    // Check for expected text
    await b.expect('Hello from Bun!')
    
    // Send keyboard input
    b.sendKey('y')
    b.sendKey('enter')
    
    // Take a screenshot
    b.screenshot('test-output')
})

console.log(result.success ? '✓ PASS' : `✗ FAIL: ${result.error}`)
```

## 🔧 Implementation Details

### BunPTY FFI Approach

```typescript
// Using Bun's FFI to call system PTY functions
const lib = dlopen("libc.so.6", {
    posix_openpt: {
        args: [FFIType.i32],
        returns: FFIType.i32
    },
    // ... other PTY functions
})

// Open a real PTY
const masterFd = lib.symbols.posix_openpt(O_RDWR | O_NOCTTY)
```

### BunPTYSimple Approach

```typescript
// Simulating PTY with Bun.spawn
this.process = spawn({
    cmd: [command, ...args],
    env: {
        TERM: "xterm-256color",
        COLUMNS: "80",
        LINES: "24",
        FORCE_COLOR: "1"
    },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe"
})
```

## ⚠️ Limitations

### What BunBattle Can't Do (Yet)

1. **Real TTY Detection**: Programs checking `isatty()` will detect they're not in a real terminal
2. **Complex Interactive Programs**: Programs like `vim` or `less` won't work properly
3. **Terminal Control Sequences**: Advanced terminal control (cursor positioning, etc.) is limited
4. **Signal Handling**: PTY signal propagation (SIGWINCH, etc.) not supported

### What BunBattle Can Do Well

1. **Basic Command Testing**: ✅ Perfect for testing CLI tools
2. **Simple Prompts**: ✅ Can handle basic interactive prompts
3. **Output Validation**: ✅ Full output capture and pattern matching
4. **Replay System**: ✅ Records all events for debugging
5. **Fast Execution**: ✅ Bun's speed advantage

## 🎯 When to Use What

### Use BunBattle When:
- You want to run tests with Bun (faster)
- Testing simple CLI commands
- Basic interactive prompts are enough
- You don't need real PTY features

### Use Original Battle When:
- Testing complex terminal UIs
- Need real PTY behavior
- Testing programs that check `isatty()`
- Full ANSI sequence support needed

## 🔮 Future Improvements

### Potential Enhancements:

1. **Complete FFI PTY Implementation**: Fully implement PTY via FFI for real terminal emulation
2. **WebAssembly PTY**: Compile a PTY library to WASM for Bun
3. **Native Bun PTY Support**: Wait for Bun to add native PTY support
4. **Hybrid Approach**: Use Node.js child process for PTY when needed

## 📦 File Structure

```
test/battle-bun/
├── BunPTY.ts       # PTY implementation (FFI + Simple)
├── BunBattle.ts    # Main Battle framework for Bun
├── test.ts         # Test suite
└── README.md       # This file
```

## 🎓 Key Takeaways

1. **BunBattle proves Bun can run Battle-like tests** without Node.js
2. **FFI opens doors** for native functionality in Bun
3. **Simulated PTY is good enough** for 80% of testing needs
4. **Both frameworks can coexist** - use the right tool for the job

## 🚦 Test Results

Running `bun test/battle-bun/test.ts`:
- ✅ Simple echo command
- ⚠️ Interactive bash (limited)
- ✅ Air install command
- ✅ Bun runtime test
- ✅ Screenshot functionality

**Success Rate: 80%** - Good enough for most testing scenarios!

## 🤝 Contributing

To improve BunBattle:

1. **Enhance FFI PTY**: Complete the FFI implementation for real PTY
2. **Add More Key Mappings**: Expand keyboard input support
3. **Improve Pattern Matching**: Better ANSI sequence handling
4. **Create Test Helpers**: Add convenience methods

## 📝 License

Same as the Air project - MIT

---

*BunBattle - Because Bun deserves native testing too!* 🚀