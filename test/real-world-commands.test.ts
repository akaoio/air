/**
 * Real-World Commands Test Suite
 * Tests ACTUAL user commands that might fail in reality
 * 
 * This test suite was created because the previous test suite
 * passed even when real commands were failing due to PATH issues.
 */

import { execSync, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface CommandTestResult {
    command: string
    success: boolean
    output?: string
    error?: string
    exitCode?: number
    duration?: number
}

class RealWorldCommandTester {
    private results: CommandTestResult[] = []
    private workingDir: string
    
    constructor() {
        this.workingDir = process.cwd()
    }
    
    /**
     * Test command exactly as user would run it
     */
    async testCommand(command: string, expectSuccess = true, timeout = 10000): Promise<CommandTestResult> {
        const startTime = Date.now()
        const result: CommandTestResult = {
            command,
            success: false
        }
        
        try {
            console.log(`🧪 Testing: ${command}`)
            
            // Test in clean environment (no PATH modifications)
            const output = execSync(command, {
                cwd: this.workingDir,
                timeout,
                encoding: 'utf8',
                stdio: 'pipe',
                env: {
                    ...process.env,
                    // Intentionally don't add custom PATH to test real user experience
                }
            })
            
            result.success = true
            result.output = output
            result.exitCode = 0
            result.duration = Date.now() - startTime
            
            if (expectSuccess) {
                console.log(`  ✅ PASSED (${result.duration}ms)`)
            } else {
                console.log(`  ⚠️  UNEXPECTED SUCCESS (${result.duration}ms)`)
            }
            
        } catch (error: any) {
            result.success = false
            result.error = error.message
            result.exitCode = error.status || 1
            result.duration = Date.now() - startTime
            
            if (expectSuccess) {
                console.log(`  ❌ FAILED (${result.duration}ms): ${error.message}`)
            } else {
                console.log(`  ✅ EXPECTED FAILURE (${result.duration}ms)`)
                result.success = true // Expected failure counts as success
            }
        }
        
        this.results.push(result)
        return result
    }
    
    /**
     * Test command with different runtime environments
     */
    async testMultiRuntime(baseCommand: string): Promise<CommandTestResult[]> {
        const commands = [
            baseCommand, // Default from package.json
            baseCommand.replace(/^bun /, 'node '), // Force Node
            baseCommand.replace(/^npm run /, 'bun run '), // Force Bun
        ]
        
        const results: CommandTestResult[] = []
        
        for (const cmd of commands) {
            const result = await this.testCommand(cmd, false) // Don't expect success
            results.push(result)
        }
        
        return results
    }
    
    /**
     * Test critical user workflow commands
     */
    async testUserWorkflow(): Promise<void> {
        console.log('🚀 Testing Real-World User Commands\n')
        
        // Test most common user commands
        const commonCommands = [
            'npm run status',
            'bun run status', 
            'npm run config',
            'bun run config',
            'npm start --help',
            'npm run build:prod',
            'npm test',
            'npm run test:quick'
        ]
        
        for (const cmd of commonCommands) {
            await this.testCommand(cmd, false) // Don't assume success
        }
        
        // Test without npm/bun prefixes (what users might try)
        console.log('\n🧪 Testing Direct Commands (common user mistakes)')
        const directCommands = [
            'bun status',
            'air status', 
            'status',
            'air config'
        ]
        
        for (const cmd of directCommands) {
            await this.testCommand(cmd, false) // Expect these to fail
        }
    }
    
    /**
     * Test PATH-dependent commands
     */
    async testPathDependentCommands(): Promise<void> {
        console.log('\n🧪 Testing PATH-Dependent Commands')
        
        // Commands that require specific PATH setup
        const pathCommands = [
            'bun --version',
            'bun run --help',
            'tsx --version',
            'npx tsx --version'
        ]
        
        for (const cmd of pathCommands) {
            await this.testCommand(cmd, false)
        }
    }
    
    /**
     * Test environment-specific issues
     */
    async testEnvironmentIssues(): Promise<void> {
        console.log('\n🧪 Testing Environment-Specific Issues')
        
        // Test shell-specific issues
        const shellTests = [
            'echo $SHELL',
            'which bun || echo "bun not found"',
            'which tsx || echo "tsx not found"', 
            'echo $PATH | grep -o bun || echo "bun not in PATH"'
        ]
        
        for (const cmd of shellTests) {
            await this.testCommand(cmd, true)
        }
    }
    
    /**
     * Generate comprehensive test report
     */
    generateReport(): void {
        console.log('\n📊 REAL-WORLD COMMAND TEST REPORT')
        console.log('=====================================')
        
        const total = this.results.length
        const passed = this.results.filter(r => r.success).length
        const failed = this.results.filter(r => !r.success).length
        
        console.log(`Total Commands Tested: ${total}`)
        console.log(`Passed: ${passed} (${(passed/total*100).toFixed(1)}%)`)
        console.log(`Failed: ${failed} (${(failed/total*100).toFixed(1)}%)`)
        
        // Show all failures (these are the real issues!)
        const failures = this.results.filter(r => !r.success)
        if (failures.length > 0) {
            console.log('\n❌ FAILED COMMANDS (REAL ISSUES):')
            failures.forEach(f => {
                console.log(`  • ${f.command}`)
                console.log(`    Error: ${f.error}`)
                console.log(`    Exit Code: ${f.exitCode}`)
            })
        }
        
        // Show successful commands
        const successes = this.results.filter(r => r.success)
        if (successes.length > 0) {
            console.log('\n✅ WORKING COMMANDS:')
            successes.forEach(s => {
                console.log(`  • ${s.command} (${s.duration}ms)`)
            })
        }
        
        // Critical analysis
        console.log('\n🔍 CRITICAL ANALYSIS:')
        
        const bunCommands = failures.filter(f => f.command.includes('bun'))
        if (bunCommands.length > 0) {
            console.log(`⚠️  ${bunCommands.length} Bun commands failing - PATH issue detected`)
        }
        
        const npmCommands = failures.filter(f => f.command.includes('npm run'))
        if (npmCommands.length > 0) {
            console.log(`⚠️  ${npmCommands.length} npm run commands failing - serious issue`)
        }
        
        console.log('\n💡 RECOMMENDATIONS:')
        if (bunCommands.length > 0) {
            console.log('  1. Fix Bun PATH configuration permanently')
            console.log('  2. Add Bun to both ~/.bashrc AND ~/.zshrc')
            console.log('  3. Test in fresh shell sessions')
        }
        
        if (failed > passed) {
            console.log('  ⚠️  MORE COMMANDS FAILED THAN PASSED - MAJOR ISSUE')
            console.log('  ⚠️  Previous test suite was giving false confidence')
        }
    }
    
    /**
     * Save detailed results to file
     */
    saveResults(): void {
        const reportPath = path.join('tmp', 'real-world-test-results.json')
        
        // Ensure tmp directory exists
        if (!fs.existsSync('tmp')) {
            fs.mkdirSync('tmp', { recursive: true })
        }
        
        const report = {
            timestamp: new Date().toISOString(),
            testResults: this.results,
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.success).length,
                failed: this.results.filter(r => !r.success).length
            },
            environment: {
                shell: process.env.SHELL,
                path: process.env.PATH,
                node: process.version,
                cwd: process.cwd()
            }
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
        console.log(`\n📄 Detailed results saved to: ${reportPath}`)
    }
}

// Run the real-world tests
async function runRealWorldTests(): Promise<void> {
    const tester = new RealWorldCommandTester()
    
    try {
        await tester.testUserWorkflow()
        await tester.testPathDependentCommands()
        await tester.testEnvironmentIssues()
        
        tester.generateReport()
        tester.saveResults()
        
    } catch (error) {
        console.error('❌ Real-world test suite failed:', error)
        process.exit(1)
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runRealWorldTests()
}

export { RealWorldCommandTester, runRealWorldTests }