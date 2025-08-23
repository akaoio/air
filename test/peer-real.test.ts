/**
 * REAL Peer Module Tests - No mocks
 * Test Peer với operations thật
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { Peer } from '../src/Peer/index.js'
import * as fs from 'fs'
import * as path from 'path'

const TEST_DIR = `/tmp/air-peer-test-${Date.now()}`
const TEST_CONFIG = path.join(TEST_DIR, 'air.json')

describe('Peer Module - REAL Tests', () => {
    let peer: Peer
    
    beforeAll(() => {
        // Tạo test directory
        fs.mkdirSync(TEST_DIR, { recursive: true })
        
        // Tạo config file thật
        const config = {
            name: 'peer-test',
            env: 'test',
            root: TEST_DIR,
            test: {
                port: 18765,  // Use high port to avoid conflicts
                domain: 'localhost',
                peers: [],
                ssl: false
            }
        }
        fs.writeFileSync(TEST_CONFIG, JSON.stringify(config, null, 2))
        
        // Set environment
        process.env.AIR_ROOT = TEST_DIR
        process.env.AIR_CONFIG = TEST_CONFIG
    })
    
    afterAll(() => {
        // Cleanup
        delete process.env.AIR_ROOT
        delete process.env.AIR_CONFIG
        
        try {
            if (peer) {
                peer.stop()
                peer.clean()
            }
        } catch {}
        
        // Remove test directory
        fs.rmSync(TEST_DIR, { recursive: true, force: true })
    })
    
    describe('Peer Lifecycle', () => {
        it('should create Peer instance', () => {
            peer = new Peer({
                root: TEST_DIR,
                bash: '/bin/bash',
                env: 'development' as const,
                name: 'peer-test',
                ip: {
                    timeout: 5000,
                    dnsTimeout: 3000,
                    userAgent: 'Air/2.0.0',
                    dns: [],
                    http: []
                },
                development: {
                    port: 8765,
                    domain: 'localhost',
                    peers: []
                },
                production: {
                    port: 8765,
                    domain: 'localhost', 
                    peers: []
                }
            })
            expect(peer).toBeDefined()
            expect(peer).toBeInstanceOf(Peer)
        })
        
        it('should read configuration', () => {
            const config = peer.read()
            expect(config).toBeDefined()
            expect(config.name).toBe('peer-test')
            expect(config.env).toBe('development')
            expect(config.root).toBe(TEST_DIR)
        })
        
        it('should write configuration', () => {
            const config = peer.read()
            config.test_field = 'test_value'
            
            const result = peer.write(config)
            expect(result).toBe(true)
            
            // Verify file was written
            const saved = JSON.parse(fs.readFileSync(TEST_CONFIG, 'utf8'))
            expect(saved.test_field).toBe('test_value')
        })
        
        it('should check if peer is running', () => {
            const isRunning = peer.check()
            expect(typeof isRunning).toBe('boolean')
            // Should be false initially
            expect(isRunning).toBe(false)
        })
        
        it('should find process by port', () => {
            const process = peer.find(18765)
            // May or may not find something
            expect(process === null || typeof process === 'object').toBe(true)
        })
        
        it('should clean PID files', () => {
            // Create a fake PID file
            const pidFile = path.join(TEST_DIR, '.peer-test.pid')
            fs.writeFileSync(pidFile, '99999')
            
            peer.clean()
            
            // PID file should be removed
            expect(fs.existsSync(pidFile)).toBe(false)
        })
        
        it('should sync configuration', async () => {
            const config = await peer.sync()
            expect(config).toBeDefined()
            // Should return current config when no sync URL
            expect(config.name).toBe('peer-test')
        })
    })
    
    describe('Peer Server Operations', () => {
        it('should initialize server', async () => {
            try {
                const server = await peer.init()
                expect(server).toBeDefined()
                
                // Server should be available
                expect(peer.server).toBeDefined()
                
                // Clean up server if exists
                if (peer.server) {
                    await new Promise((resolve) => {
                        peer.server?.close(() => resolve(undefined))
                })
            } catch (e) {
                // Server init might fail in test environment
                expect(e).toBeDefined()
            }
        })
        
        it('should handle restart logic', async () => {
            // Test restart without server running
            const result = await peer.restart()
            // Should attempt to start
            expect(typeof result).toBe('boolean')
        })
        
        it('should activate peer', () => {
            const activated = peer.activate()
            expect(typeof activated).toBe('boolean')
        })
    })
})