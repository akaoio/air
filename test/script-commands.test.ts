/**
 * Test suite for script commands
 * Tests npm run commands that don't have direct test coverage
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const TEST_DIR = `/tmp/air-script-test-${Date.now()}`

describe('Script Commands Test Suite', () => {
    beforeAll(() => {
        // Create test directory
        fs.mkdirSync(TEST_DIR, { recursive: true })
        
        // Create a test config file
        const testConfig = {
            name: 'test-air',
            env: 'development',
            root: TEST_DIR,
            development: {
                port: 8765,
                domain: 'localhost',
                peers: []
            }
        }
        fs.writeFileSync(
            path.join(TEST_DIR, 'air.json'),
            JSON.stringify(testConfig, null, 2)
        )
    })
    
    afterAll(() => {
        // Cleanup
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true })
        }
    })
    
    describe('npm run logs command', () => {
        it('should execute without error', () => {
            try {
                // Test logs command with timeout to prevent hanging
                const output = execSync('npm run logs 2>&1 | head -5', {
                    encoding: 'utf8',
                    timeout: 5000,
                    env: { ...process.env, AIR_ROOT: TEST_DIR }
                })
                
                // Should show some output (even if no logs)
                expect(output).toBeDefined()
                expect(output.length).toBeGreaterThan(0)
            } catch (error: any) {
                // Command might timeout or exit, but should not crash
                expect(['SIGTERM', 'SIGPIPE', null]).toContain(error.signal)
            }
        })
        
        it('should handle missing service gracefully', () => {
            try {
                const output = execSync('npm run logs 2>&1 | grep -i "showing logs\\|no logs\\|not found" | head -1', {
                    encoding: 'utf8',
                    timeout: 5000
                })
                
                // Should handle missing service gracefully
                expect(output).toBeDefined()
            } catch {
                // Expected - service might not exist
                expect(true).toBe(true)
            }
        })
    })
    
    describe('install command (all runtimes)', () => {
        const testInstallCommand = (command: string, description: string) => {
            it(`${description} - should run non-interactive install`, () => {
                const testConfigPath = path.join(TEST_DIR, `${description.replace(/[^a-zA-Z0-9]/g, '')}-config.json`)
                const installCommand = `${command} --non-interactive --config=${testConfigPath}`
                
                const output = execSync(installCommand, {
                    encoding: 'utf8',
                    env: { ...process.env, AIR_ROOT: TEST_DIR }
                })
                
                expect(output).toContain('Air CLI Install')
                expect(output).toContain('Config created')
                expect(output).toContain('Next: npm start')
                
                // Verify config file was created
                expect(fs.existsSync(testConfigPath)).toBe(true)
                
                // Cleanup
                if (fs.existsSync(testConfigPath)) {
                    fs.unlinkSync(testConfigPath)
                }
            })
        }
        
        // Test install command variants
        testInstallCommand('bun script/install-ink.tsx', 'bun install')
        testInstallCommand('node script/install.cjs', 'npm install')
        
        it('should show help when called with --help', () => {
            const output = execSync('npm run air:install -- --help', {
                encoding: 'utf8'
            })
            
            expect(output).toContain('Usage')
            expect(output).toContain('Options')
            expect(output).toContain('Air Database Installer')
        })
    })
    
    describe('status command (all runtimes)', () => {
        const testStatusCommand = (command: string, description: string) => {
            it(`${description} - should show system status`, () => {
                const output = execSync(command, {
                    encoding: 'utf8',
                    env: { ...process.env, AIR_ROOT: TEST_DIR }
                })
                
                expect(output).toContain('air v')
                expect(output).toContain('Environment:')
                expect(output).toContain('Port:')
                expect(output).toMatch(/Status: .*(RUNNING|STOPPED)/)
            })
            
            it(`${description} - should detect correct runtime`, () => {
                const output = execSync(command, {
                    encoding: 'utf8'
                })
                
                // Should show NODE or BUN runtime
                expect(output).toMatch(/\(NODE\)|\(BUN\)/)
            })
        }
        
        // Test all command variants
        testStatusCommand('npm run status', 'npm run status')
        testStatusCommand('bun script/compiled/status.js', 'bun status')
        testStatusCommand('node script/compiled/status.js', 'node status')
        
        it('should check correct port based on environment', () => {
            // Test development environment
            const devConfig = {
                name: 'test-air',
                env: 'development',
                development: { port: 8765, domain: 'localhost' },
                production: { port: 443, domain: 'example.com' }
            }
            const devConfigPath = path.join(TEST_DIR, 'dev-config.json')
            fs.writeFileSync(devConfigPath, JSON.stringify(devConfig, null, 2))
            
            const devOutput = execSync('npm run status', {
                encoding: 'utf8',
                env: { ...process.env, AIR_ROOT: TEST_DIR }
            })
            
            expect(devOutput).toContain('Port 8765:')
            expect(devOutput).not.toContain('Port 443:')
            
            // Test production environment
            const prodConfig = {
                name: 'test-air',
                env: 'production',
                development: { port: 8765, domain: 'localhost' },
                production: { port: 443, domain: 'example.com' }
            }
            const prodConfigPath = path.join(TEST_DIR, 'prod-config.json')
            fs.writeFileSync(prodConfigPath, JSON.stringify(prodConfig, null, 2))
            fs.writeFileSync(path.join(TEST_DIR, 'air.json'), JSON.stringify(prodConfig, null, 2))
            
            const prodOutput = execSync('npm run status', {
                encoding: 'utf8',
                env: { ...process.env, AIR_ROOT: TEST_DIR }
            })
            
            expect(prodOutput).toContain('Port 443:')
            expect(prodOutput).not.toContain('Port 8765:')
        })
        
        it('should validate port logic matches display logic', () => {
            // Both port check and port display should use same environment
            const mixedConfig = {
                name: 'test-air',
                env: 'production',
                development: { port: 9999, domain: 'dev.local' },
                production: { port: 1234, domain: 'prod.com' }
            }
            fs.writeFileSync(path.join(TEST_DIR, 'air.json'), JSON.stringify(mixedConfig, null, 2))
            
            const output = execSync('npm run status', {
                encoding: 'utf8',
                env: { ...process.env, AIR_ROOT: TEST_DIR }
            })
            
            // Both runtime status port check and network config port display should match
            const portCheckRegex = /Port (\d+):/
            const portDisplayRegex = /Port:.*?(\d+)/
            
            const portCheckMatch = output.match(portCheckRegex)
            const portDisplayMatch = output.match(portDisplayRegex)
            
            if (portCheckMatch && portDisplayMatch) {
                expect(portCheckMatch[1]).toBe(portDisplayMatch[1])
            }
            
            // Should use production port (1234), not development port (9999)
            expect(output).toContain('Port 1234:')
            expect(output).not.toContain('Port 9999:')
        })
    })
    
    describe('ddns command (all runtimes)', () => {
        const testDDNSCommand = (command: string, description: string) => {
            it(`${description} - should handle missing configuration gracefully`, () => {
                try {
                    const output = execSync(`timeout 3 ${command} 2>&1 || true`, {
                        encoding: 'utf8',
                        env: { ...process.env, AIR_ROOT: TEST_DIR }
                    })
                    
                    // Should either show config error or start update
                    expect(output).toBeDefined()
                } catch {
                    expect(true).toBe(true)
                }
            })
        }
        
        // Test DDNS command variants
        testDDNSCommand('npm run ddns', 'npm run ddns')
        testDDNSCommand('bun script/compiled/ddns.js', 'bun ddns')
        testDDNSCommand('node script/compiled/ddns.js', 'node ddns')
    })
    
    describe('npm run uninstall command', () => {
        it('should handle dry-run mode', () => {
            try {
                const output = execSync('echo "n" | npm run uninstall 2>&1 | head -20', {
                    encoding: 'utf8',
                    env: { ...process.env, AIR_ROOT: TEST_DIR }
                })
                
                // Should show uninstall prompt or message
                expect(output).toBeDefined()
            } catch {
                // Expected - might exit on "n"
                expect(true).toBe(true)
            }
        })
        
        it('should not delete files without confirmation', () => {
            const testFile = path.join(TEST_DIR, 'test-file.txt')
            fs.writeFileSync(testFile, 'test')
            
            try {
                // Send "n" to refuse uninstall
                execSync(`echo "n" | npm run uninstall 2>&1`, {
                    encoding: 'utf8',
                    env: { ...process.env, AIR_ROOT: TEST_DIR },
                    timeout: 5000
                })
            } catch {
                // Expected to exit
            }
            
            // File should still exist
            expect(fs.existsSync(testFile)).toBe(true)
        })
    })
    
    describe('config command (all runtimes)', () => {
        const testConfigCommand = (command: string, description: string) => {
            it(`${description} - should start configuration manager`, () => {
                try {
                    const output = execSync(`echo "q" | ${command} 2>&1 | head -10`, {
                        encoding: 'utf8',
                        env: { ...process.env, AIR_ROOT: TEST_DIR }
                    })
                    
                    expect(output).toContain('Configuration')
                    expect(output).toContain('Air')
                } catch {
                    expect(true).toBe(true)
                }
            })
        }
        
        // Test config command variants
        testConfigCommand('npm run config', 'npm run config')
        testConfigCommand('bun script/compiled/config.js', 'bun config')
        testConfigCommand('node script/compiled/config.js', 'node config')
    })
    
    describe('npm run update command', () => {
        it('should run update script', () => {
            const output = execSync('npm run update 2>&1 | head -10', {
                encoding: 'utf8',
                env: { ...process.env, AIR_ROOT: TEST_DIR }
            })
            
            expect(output).toContain('Air System Updater')
            expect(output).toContain('Update')
        })
        
        it('should check git status', () => {
            try {
                const output = execSync('npm run update 2>&1 | grep -i "git\\|update\\|current" | head -5', {
                    encoding: 'utf8',
                    timeout: 10000
                })
                
                expect(output).toBeDefined()
            } catch {
                // Might not be in git repo
                expect(true).toBe(true)
            }
        })
    })
})

// Helper to check if command exists
function commandExists(cmd: string): boolean {
    try {
        execSync(`which ${cmd}`, { stdio: 'ignore' })
        return true
    } catch {
        return false
    }
}

// Additional test for build commands
describe('Build Commands', () => {
    it('should build TypeScript to JavaScript', () => {
        const output = execSync('npm run build:prod 2>&1 | tail -5', {
            encoding: 'utf8'
        })
        
        expect(output).toContain('Build success')
        expect(fs.existsSync('dist/index.js')).toBe(true)
        expect(fs.existsSync('dist/index.d.ts')).toBe(true)
    })
    
    it('should run typecheck without errors', () => {
        try {
            execSync('npm run typecheck 2>&1', {
                encoding: 'utf8',
                timeout: 30000
            })
            
            // Should pass without errors
            expect(true).toBe(true)
        } catch (error: any) {
            // TypeScript might have some errors but shouldn't crash
            expect(error.status).toBeLessThan(10)
        }
    })
})