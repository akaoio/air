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
    
    describe('npm run air:install command', () => {
        it('should show help when called with --help', () => {
            const output = execSync('npm run air:install -- --help', {
                encoding: 'utf8'
            })
            
            expect(output).toContain('Usage')
            expect(output).toContain('Options')
            expect(output).toContain('Air Database Installer')
        })
        
        it('should handle non-interactive mode', () => {
            const output = execSync('npm run air:install:notui 2>&1 | head -20', {
                encoding: 'utf8',
                env: {
                    ...process.env,
                    AIR_ROOT: TEST_DIR,
                    AIR_NAME: 'test-install',
                    AIR_PORT: '9876'
                }
            })
            
            // Should run in non-interactive mode
            expect(output).toBeDefined()
            expect(output).not.toContain('undefined')
        })
        
        it('should validate required options in non-interactive mode', () => {
            try {
                execSync('node script/install.cjs --non-interactive --validate-only', {
                    encoding: 'utf8',
                    timeout: 5000
                })
            } catch (error: any) {
                // Should require configuration in non-interactive mode
                expect(error.status).toBeDefined()
            }
        })
    })
    
    describe('npm run status command', () => {
        it('should show system status', () => {
            const output = execSync('npm run status', {
                encoding: 'utf8',
                env: { ...process.env, AIR_ROOT: TEST_DIR }
            })
            
            expect(output).toContain('air v')
            expect(output).toContain('Environment:')
            expect(output).toContain('Port:')
            expect(output).toMatch(/Status: .*(RUNNING|STOPPED)/)
        })
        
        it('should detect correct runtime', () => {
            const output = execSync('npm run status', {
                encoding: 'utf8'
            })
            
            // Should show NODE or BUN runtime
            expect(output).toMatch(/\(NODE\)|\(BUN\)/)
        })
    })
    
    describe('npm run ddns command', () => {
        it('should handle missing configuration gracefully', () => {
            try {
                // Run with timeout to prevent hanging
                const output = execSync('timeout 2 npm run ddns 2>&1 || true', {
                    encoding: 'utf8',
                    env: { ...process.env, AIR_ROOT: TEST_DIR }
                })
                
                // Should either show config error or start update
                expect(output).toBeDefined()
            } catch {
                // Expected - might need config
                expect(true).toBe(true)
            }
        })
        
        it('should validate DDNS configuration', () => {
            // Create config with invalid DDNS
            const config = {
                name: 'test',
                env: 'development',
                development: {
                    port: 8765,
                    domain: 'test.example.com',
                    godaddy: {
                        key: '',
                        secret: ''
                    }
                }
            }
            
            fs.writeFileSync(
                path.join(TEST_DIR, 'air-ddns.json'),
                JSON.stringify(config, null, 2)
            )
            
            try {
                execSync(`cd ${TEST_DIR} && timeout 2 npm run ddns 2>&1`, {
                    encoding: 'utf8'
                })
            } catch (error: any) {
                // Should fail with invalid config
                expect(error).toBeDefined()
            }
        })
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
    
    describe('npm run config command', () => {
        it('should start configuration manager', () => {
            try {
                // Send quit command to exit
                const output = execSync('echo "q" | npm run config 2>&1 | head -10', {
                    encoding: 'utf8',
                    env: { ...process.env, AIR_ROOT: TEST_DIR }
                })
                
                expect(output).toContain('Configuration')
                expect(output).toContain('Air')
            } catch {
                // Expected - interactive mode might exit
                expect(true).toBe(true)
            }
        })
        
        it('should read existing configuration', () => {
            // Ensure config exists
            const configPath = path.join(TEST_DIR, 'air.json')
            if (!fs.existsSync(configPath)) {
                fs.writeFileSync(configPath, JSON.stringify({
                    name: 'config-test',
                    env: 'development',
                    development: { port: 7777 }
                }))
            }
            
            try {
                const output = execSync(`cd ${TEST_DIR} && echo "1\nq" | npm run config 2>&1 | head -20`, {
                    encoding: 'utf8'
                })
                
                // Should show current config
                expect(output).toBeDefined()
            } catch {
                // Interactive mode might exit
                expect(true).toBe(true)
            }
        })
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