/**
 * BunBattle - Bun-native terminal testing framework
 * A Bun-compatible implementation of Battle framework
 */

import { spawn, sleep } from "bun"
import { BunPTYSimple } from "./BunPTY.js"
import fs from "fs"
import path from "path"

export interface BunBattleOptions {
    cwd?: string
    env?: Record<string, string>
    timeout?: number
    verbose?: boolean
    cols?: number
    rows?: number
}

export interface TestResult {
    success: boolean
    error?: string
    duration: number
    output: string
    screenshots: string[]
    replayPath?: string
}

export class BunBattle {
    private options: BunBattleOptions
    private pty: BunPTYSimple | null = null
    public output: string = ""
    private screenshots: string[] = []
    private startTime: number = 0
    private events: any[] = []
    
    constructor(options: BunBattleOptions = {}) {
        this.options = {
            cwd: options.cwd || process.cwd(),
            env: options.env || process.env,
            timeout: options.timeout || 30000,
            verbose: options.verbose || false,
            cols: options.cols || 80,
            rows: options.rows || 24
        }
    }
    
    /**
     * Spawn a command in PTY-like environment
     */
    spawn(command: string, args: string[] = []): void {
        if (this.options.verbose) {
            console.log(`[BunBattle] Spawning: ${command} ${args.join(' ')}`)
        }
        
        this.pty = new BunPTYSimple()
        this.pty.spawn(command, args)
        
        // Record spawn event
        this.events.push({
            type: 'spawn',
            timestamp: Date.now() - this.startTime,
            data: { command, args }
        })
    }
    
    /**
     * Send keyboard input
     */
    sendKey(key: string): void {
        if (!this.pty) {
            throw new Error("No process spawned")
        }
        
        const keyMap: Record<string, string> = {
            'enter': '\r',
            'escape': '\x1b',
            'tab': '\t',
            'backspace': '\x7f',
            'up': '\x1b[A',
            'down': '\x1b[B',
            'right': '\x1b[C',
            'left': '\x1b[D',
            'home': '\x1b[H',
            'end': '\x1b[F',
            'pageup': '\x1b[5~',
            'pagedown': '\x1b[6~',
            'delete': '\x1b[3~'
        }
        
        const data = keyMap[key.toLowerCase()] || key
        this.pty.write(data)
        
        // Record key event
        this.events.push({
            type: 'key',
            timestamp: Date.now() - this.startTime,
            data: key
        })
        
        if (this.options.verbose) {
            console.log(`[BunBattle] Sent key: ${key}`)
        }
    }
    
    /**
     * Wait for a pattern in output
     */
    async expect(pattern: string | RegExp, timeout?: number): Promise<boolean> {
        if (!this.pty) {
            throw new Error("No process spawned")
        }
        
        const actualTimeout = timeout || this.options.timeout || 5000
        const result = await this.pty.expect(pattern, actualTimeout)
        
        // Update output
        this.output = this.pty.getOutput()
        
        // Record expect event
        this.events.push({
            type: 'expect',
            timestamp: Date.now() - this.startTime,
            data: { pattern: pattern.toString(), found: result }
        })
        
        if (!result) {
            throw new Error(`Expected pattern not found: ${pattern}`)
        }
        
        if (this.options.verbose) {
            console.log(`[BunBattle] Found pattern: ${pattern}`)
        }
        
        return result
    }
    
    /**
     * Wait for a specific duration
     */
    async wait(ms: number): Promise<void> {
        if (this.options.verbose) {
            console.log(`[BunBattle] Waiting ${ms}ms`)
        }
        
        await sleep(ms)
        
        // Update output if PTY exists
        if (this.pty) {
            this.output = this.pty.getOutput()
        }
    }
    
    /**
     * Take a screenshot of current output
     */
    screenshot(name?: string): string {
        const timestamp = Date.now()
        const screenshotName = name || `screenshot-${timestamp}`
        
        // Clean ANSI codes for screenshot
        const cleanOutput = this.output.replace(/\x1b\[[0-9;]*[mGKJH]/g, '')
        
        this.screenshots.push(screenshotName)
        
        // Record screenshot event
        this.events.push({
            type: 'screenshot',
            timestamp: timestamp - this.startTime,
            data: { name: screenshotName, content: cleanOutput }
        })
        
        if (this.options.verbose) {
            console.log(`[BunBattle] Screenshot: ${screenshotName}`)
        }
        
        return cleanOutput
    }
    
    /**
     * Clean up resources
     */
    cleanup(): void {
        if (this.pty) {
            this.pty.kill()
            this.pty = null
        }
    }
    
    /**
     * Run a test function
     */
    async run(testFn: (battle: BunBattle) => Promise<void>): Promise<TestResult> {
        this.startTime = Date.now()
        let success = true
        let error: string | undefined
        
        try {
            // Run the test
            await testFn(this)
            
            // Update final output
            if (this.pty) {
                this.output = this.pty.getOutput()
            }
            
        } catch (err: any) {
            success = false
            error = err.message || String(err)
            
            if (this.options.verbose) {
                console.error(`[BunBattle] Test failed: ${error}`)
            }
            
            // Take failure screenshot
            this.screenshot('failure')
        } finally {
            // Always cleanup
            this.cleanup()
        }
        
        const duration = Date.now() - this.startTime
        
        // Save replay if there are events
        let replayPath: string | undefined
        if (this.events.length > 0) {
            replayPath = await this.saveReplay(success)
        }
        
        return {
            success,
            error,
            duration,
            output: this.output,
            screenshots: this.screenshots,
            replayPath
        }
    }
    
    /**
     * Save replay data
     */
    private async saveReplay(success: boolean): Promise<string> {
        const replayDir = path.join(this.options.cwd || '.', 'logs')
        
        // Ensure logs directory exists
        if (!fs.existsSync(replayDir)) {
            fs.mkdirSync(replayDir, { recursive: true })
        }
        
        const replayFile = path.join(replayDir, `replay-bun-${Date.now()}.json`)
        
        const replayData = {
            version: '1.0.0',
            runtime: 'bun',
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            success,
            events: this.events,
            metadata: {
                cols: this.options.cols,
                rows: this.options.rows,
                cwd: this.options.cwd,
                env: Object.keys(this.options.env || {})
            }
        }
        
        await Bun.write(replayFile, JSON.stringify(replayData, null, 2))
        
        if (this.options.verbose) {
            console.log(`[BunBattle] Replay saved: ${replayFile}`)
        }
        
        return replayFile
    }
    
    /**
     * Resize terminal (placeholder for compatibility)
     */
    resize(cols: number, rows: number): void {
        this.options.cols = cols
        this.options.rows = rows
        
        // Record resize event
        this.events.push({
            type: 'resize',
            timestamp: Date.now() - this.startTime,
            data: { cols, rows }
        })
        
        if (this.options.verbose) {
            console.log(`[BunBattle] Resize: ${cols}x${rows}`)
        }
    }
    
    /**
     * Send raw data to PTY
     */
    write(data: string): void {
        if (!this.pty) {
            throw new Error("No process spawned")
        }
        
        this.pty.write(data)
        
        // Record input event
        this.events.push({
            type: 'input',
            timestamp: Date.now() - this.startTime,
            data
        })
    }
}

/**
 * Runner for multiple test suites (Bun-native)
 */
export class BunRunner {
    private suites: Map<string, () => Promise<any>> = new Map()
    private options: BunBattleOptions
    
    constructor(options: BunBattleOptions = {}) {
        this.options = options
    }
    
    addSuite(name: string, testFn: () => Promise<any>): void {
        this.suites.set(name, testFn)
    }
    
    async run(): Promise<{ passed: number; failed: number; total: number }> {
        let passed = 0
        let failed = 0
        
        for (const [name, testFn] of this.suites) {
            console.log(`\nRunning suite: ${name}`)
            
            try {
                await testFn()
                passed++
                console.log(`✓ Suite passed: ${name}`)
            } catch (err: any) {
                failed++
                console.log(`✗ Suite failed: ${name}`)
                console.error(`  ${err.message || err}`)
            }
        }
        
        return {
            passed,
            failed,
            total: this.suites.size
        }
    }
    
    report(results: { passed: number; failed: number; total: number }): void {
        console.log('\n' + '='.repeat(50))
        console.log('Test Summary:')
        console.log(`  Total:  ${results.total}`)
        console.log(`  Passed: ${results.passed}`)
        console.log(`  Failed: ${results.failed}`)
        console.log('='.repeat(50))
    }
}

export default BunBattle