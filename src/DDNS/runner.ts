/**
 * DDNS Runner - Smart execution using Platform abstraction
 * Handles runtime detection and execution strategy
 */

import { execSync, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import type { AirConfig } from '../types/index.js'

export interface DDNSRunnerResult {
    success: boolean
    command?: string
    runtime?: string
    script?: string
    message?: string
}

export class DDNSRunner {
    private config: AirConfig
    private runtime: 'bun' | 'node' | 'deno'
    private scriptPath: string | null = null
    
    constructor(config: AirConfig) {
        this.config = config
        this.runtime = this.detectRuntime()
    }
    
    /**
     * Detect available runtime
     */
    private detectRuntime(): 'bun' | 'node' | 'deno' {
        // Check for Bun first (fastest for TypeScript)
        if (typeof Bun !== 'undefined') {
            return 'bun'
        }
        
        try {
            execSync('which bun', { stdio: 'ignore' })
            return 'bun'
        } catch {
            // Bun not available
        }
        
        // Check for Deno
        try {
            execSync('which deno', { stdio: 'ignore' })
            return 'deno'
        } catch {
            // Deno not available
        }
        
        // Default to Node.js
        return 'node'
    }
    
    /**
     * Find the DDNS script to run
     */
    private findScript(): string | null {
        const candidates = [
            // Priority 1: Compiled JavaScript in dist
            path.join(this.config.root, 'dist', 'DDNS', 'index.js'),
            path.join(this.config.root, 'dist', 'ddns.js'),
            
            // Priority 2: Compiled script
            path.join(this.config.root, 'script', 'ddns-compiled.js'),
            path.join(this.config.root, 'script', 'ddns.js'),
            
            // Priority 3: TypeScript source (only if Bun available)
            ...(this.runtime === 'bun' ? [
                path.join(this.config.root, 'script', 'ddns.ts'),
                path.join(this.config.root, 'src', 'DDNS', 'index.ts')
            ] : [])
        ]
        
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                return candidate
            }
        }
        
        return null
    }
    
    /**
     * Get the command to run DDNS
     */
    getCommand(): DDNSRunnerResult {
        const script = this.findScript()
        
        if (!script) {
            return {
                success: false,
                message: 'DDNS script not found. Please build the project: npm run build:prod'
            }
        }
        
        let command: string
        
        // Build command based on runtime and script type
        const isTypeScript = script.endsWith('.ts')
        
        if (this.runtime === 'bun') {
            // Bun can run both TS and JS directly
            command = `bun run ${script}`
        } else if (this.runtime === 'deno' && isTypeScript) {
            // Deno can run TypeScript
            command = `deno run --allow-all ${script}`
        } else if (isTypeScript) {
            // Node.js needs tsx or ts-node for TypeScript
            try {
                execSync('which tsx', { stdio: 'ignore' })
                command = `tsx ${script}`
            } catch {
                try {
                    execSync('which ts-node', { stdio: 'ignore' })
                    command = `ts-node ${script}`
                } catch {
                    return {
                        success: false,
                        message: 'TypeScript runtime not available. Install tsx: npm install -g tsx'
                    }
                }
            }
        } else {
            // JavaScript with Node.js
            command = `node ${script}`
        }
        
        this.scriptPath = script
        
        return {
            success: true,
            command,
            runtime: this.runtime,
            script
        }
    }
    
    /**
     * Get cron-compatible command
     */
    getCronCommand(): string {
        const result = this.getCommand()
        
        if (!result.success || !result.command) {
            // Fallback to a safe command that logs error
            return `echo "DDNS script not configured" >> ${this.config.root}/logs/ddns-error.log`
        }
        
        // Add environment setup for cron
        const commands: string[] = []
        
        // Set PATH for runtime
        if (this.runtime === 'bun') {
            commands.push('export BUN_INSTALL="$HOME/.bun"')
            commands.push('export PATH="$BUN_INSTALL/bin:$PATH"')
        }
        
        // Change to project directory
        commands.push(`cd ${this.config.root}`)
        
        // Run the command with logging
        const logPath = path.join(this.config.root, 'logs', 'ddns.log')
        commands.push(`${result.command} >> ${logPath} 2>&1`)
        
        // Join with && for proper execution
        return commands.join(' && ')
    }
    
    /**
     * Run DDNS update immediately
     */
    async run(): Promise<boolean> {
        const result = this.getCommand()
        
        if (!result.success || !result.command) {
            console.error(result.message)
            return false
        }
        
        try {
            console.log(`Running DDNS with ${result.runtime}: ${result.script}`)
            
            const child = spawn(result.command, {
                shell: true,
                cwd: this.config.root,
                stdio: 'inherit'
            })
            
            return new Promise((resolve) => {
                child.on('exit', (code) => {
                    resolve(code === 0)
                })
            })
        } catch (error) {
            console.error('Failed to run DDNS:', error)
            return false
        }
    }
    
    /**
     * Build DDNS script if needed
     */
    async build(): Promise<boolean> {
        // Check if TypeScript source exists
        const tsSource = path.join(this.config.root, 'script', 'ddns.ts')
        if (!fs.existsSync(tsSource)) {
            console.error('DDNS TypeScript source not found')
            return false
        }
        
        // Build to JavaScript
        const outputPath = path.join(this.config.root, 'script', 'ddns-compiled.js')
        
        try {
            if (this.runtime === 'bun') {
                // Use Bun to build
                execSync(`bun build ${tsSource} --outfile ${outputPath} --target node`, {
                    cwd: this.config.root,
                    stdio: 'inherit'
                })
            } else {
                // Use TypeScript compiler
                execSync(`npx tsc ${tsSource} --outDir script --module commonjs --target es2020`, {
                    cwd: this.config.root,
                    stdio: 'inherit'
                })
            }
            
            console.log(`✅ DDNS script built: ${outputPath}`)
            return true
        } catch (error) {
            console.error('Failed to build DDNS script:', error)
            return false
        }
    }
    
    /**
     * Get status information
     */
    getStatus(): string {
        const result = this.getCommand()
        
        const lines: string[] = []
        lines.push('📡 DDNS Runner Status')
        lines.push('─'.repeat(40))
        lines.push(`Runtime: ${this.runtime}`)
        
        if (result.success) {
            lines.push(`Script: ${result.script}`)
            lines.push(`Command: ${result.command}`)
            lines.push('✅ Ready to run')
        } else {
            lines.push(`❌ ${result.message}`)
        }
        
        return lines.join('\n')
    }
}

/**
 * Export convenience functions
 */
export function getDDNSCommand(config: AirConfig): string {
    const runner = new DDNSRunner(config)
    return runner.getCronCommand()
}

export async function runDDNS(config: AirConfig): Promise<boolean> {
    const runner = new DDNSRunner(config)
    return runner.run()
}

export async function buildDDNS(config: AirConfig): Promise<boolean> {
    const runner = new DDNSRunner(config)
    return runner.build()
}

export default DDNSRunner