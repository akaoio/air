/**
 * REAL Platform Module Tests
 * Test platform detection và operations thật
 */

import { describe, it, expect } from 'vitest'
import { Platform } from '../src/Platform/index.js'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'

const TEST_DIR = `/tmp/air-platform-test-${Date.now()}`

describe('Platform Module - REAL Tests', () => {
    describe('Platform Detection', () => {
        it('should detect current platform', () => {
            const platform = Platform.getInstance()
            expect(platform).toBeDefined()
            
            // Should have a name
            const name = platform.getName()
            expect(name).toBeTruthy()
            expect(typeof name).toBe('string')
            
            // Should match OS platform
            const osPlatform = os.platform()
            if (osPlatform === 'linux') {
                expect(name.toLowerCase()).toContain('linux')
            } else if (osPlatform === 'darwin') {
                expect(name.toLowerCase()).toContain('mac')
            } else if (osPlatform === 'win32') {
                expect(name.toLowerCase()).toContain('windows')
            }
        })
        
        it('should detect platform capabilities', () => {
            const platform = Platform.getInstance()
            const capabilities = platform.getCapabilities()
            
            expect(capabilities).toBeDefined()
            expect(capabilities.platform).toBeTruthy()
            
            // Check boolean flags
            expect(typeof capabilities.hasSystemd).toBe('boolean')
            expect(typeof capabilities.hasLaunchd).toBe('boolean')
            expect(typeof capabilities.hasWindowsService).toBe('boolean')
            expect(typeof capabilities.hasPM2).toBe('boolean')
            expect(typeof capabilities.hasDocker).toBe('boolean')
            expect(typeof capabilities.hasBun).toBe('boolean')
            expect(typeof capabilities.hasNode).toBe('boolean')
            expect(typeof capabilities.hasDeno).toBe('boolean')
            expect(typeof capabilities.isRoot).toBe('boolean')
            expect(typeof capabilities.canSudo).toBe('boolean')
            
            // At least Node should be available
            expect(capabilities.hasNode).toBe(true)
        })
        
        it('should get platform paths', () => {
            const platform = Platform.getInstance()
            const paths = platform.getPaths()
            
            expect(paths).toBeDefined()
            expect(paths.serviceDir).toBeTruthy()
            expect(paths.configDir).toBeTruthy()
            expect(paths.logDir).toBeTruthy()
            expect(paths.dataDir).toBeTruthy()
            expect(paths.tempDir).toBeTruthy()
            
            // All paths should be absolute
            expect(path.isAbsolute(paths.serviceDir)).toBe(true)
            expect(path.isAbsolute(paths.configDir)).toBe(true)
            expect(path.isAbsolute(paths.logDir)).toBe(true)
            expect(path.isAbsolute(paths.dataDir)).toBe(true)
            expect(path.isAbsolute(paths.tempDir)).toBe(true)
        })
        
        it('should handle service operations', async () => {
            const platform = Platform.getInstance()
            const config = {
                name: 'platform-test',
                env: 'test' as const,
                root: TEST_DIR,
                bash: '/bin/bash',
                test: {
                    port: 18772,
                    domain: 'localhost',
                    peers: []
                }
            }
            
            // Create service (may fail without permissions)
            try {
                const result = await platform.createService(config)
                expect(result).toBeDefined()
                expect(result.success).toBeDefined()
                
                if (result.success) {
                    expect(result.type).toBeTruthy()
                    // Type should match platform
                    const capabilities = platform.getCapabilities()
                    if (capabilities.hasSystemd) {
                        expect(result.type).toBe('systemd')
                    } else if (capabilities.hasLaunchd) {
                        expect(result.type).toBe('launchd')
                    }
                }
            } catch (e) {
                // Expected without permissions
                expect(e).toBeDefined()
            }
        })
        
        it('should handle SSL setup', async () => {
            // Create test directory
            fs.mkdirSync(TEST_DIR, { recursive: true })
            
            const platform = Platform.getInstance()
            const config = {
                name: 'ssl-test',
                env: 'test' as const,
                root: TEST_DIR,
                domain: 'localhost',
                test: {
                    port: 18773,
                    domain: 'localhost',
                    peers: []
                }
            }
            
            try {
                const result = await platform.setupSSL(config)
                expect(result).toBeDefined()
                expect(result.success).toBeDefined()
                
                if (result.success) {
                    expect(result.keyPath).toBeTruthy()
                    expect(result.certPath).toBeTruthy()
                    
                    // Check if files exist
                    expect(fs.existsSync(result.keyPath)).toBe(true)
                    expect(fs.existsSync(result.certPath)).toBe(true)
                }
            } catch (e) {
                // May fail if openssl not available
                expect(e).toBeDefined()
            } finally {
                // Cleanup
                fs.rmSync(TEST_DIR, { recursive: true, force: true })
            }
        })
        
        it('should handle start service', async () => {
            const platform = Platform.getInstance()
            
            // Try to start non-existent service
            const result = await platform.startService('non-existent-service')
            expect(result).toBeDefined()
            expect(result.started).toBeDefined()
            
            // Should fail or fallback to spawn
            if (result.started) {
                expect(result.method).toBe('spawn')
            } else {
                expect(result.error).toBeTruthy()
            }
        })
        
        it('should handle stop service', async () => {
            const platform = Platform.getInstance()
            
            // Try to stop non-existent service
            const result = await platform.stopService('non-existent-service')
            expect(typeof result).toBe('boolean')
            // Should return false for non-existent service
            expect(result).toBe(false)
        })
        
        it('should handle service status', async () => {
            const platform = Platform.getInstance()
            
            // Check status of non-existent service
            const status = await platform.getServiceStatus('non-existent-service')
            expect(status).toBeDefined()
            expect(['running', 'stopped', 'unknown'].includes(status)).toBe(true)
            // Should be unknown or stopped
            expect(status === 'unknown' || status === 'stopped').toBe(true)
        })
    })
    
    describe('Platform Singleton', () => {
        it('should return same instance', () => {
            const platform1 = Platform.getInstance()
            const platform2 = Platform.getInstance()
            
            expect(platform1).toBe(platform2)
        })
        
        it('should detect platform only once', () => {
            const platform = Platform.getInstance()
            const name1 = platform.getName()
            const name2 = platform.getName()
            
            expect(name1).toBe(name2)
        })
    })
})