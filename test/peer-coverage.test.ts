/**
 * Comprehensive Peer module tests for coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Peer } from '../src/Peer/index.js'
import * as fs from 'fs'
import * as child_process from 'child_process'

// Mock modules
vi.mock('fs')
vi.mock('child_process')
vi.mock('../src/Logger/index.js', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}))
vi.mock('../src/Config/index.js', () => ({
    Config: vi.fn().mockImplementation(() => ({
        load: vi.fn().mockReturnValue({
            name: 'test',
            env: 'development',
            root: '/test',
            development: {
                port: 8765,
                domain: 'localhost',
                peers: []
            }
        }),
        save: vi.fn(),
        validate: vi.fn().mockReturnValue({ valid: true })
    }))
}))
vi.mock('../src/Process/index.js', () => ({
    Process: vi.fn().mockImplementation(() => ({
        check: vi.fn().mockReturnValue(false),
        clean: vi.fn(),
        find: vi.fn(),
        kill: vi.fn()
    })),
    findProcess: vi.fn()
}))
vi.mock('../src/Network/index.js', () => ({
    Network: vi.fn().mockImplementation(() => ({
        get: vi.fn().mockResolvedValue({ v4: '192.168.1.1', v6: null }),
        validate: vi.fn().mockReturnValue(true),
        update: vi.fn().mockResolvedValue([])
    }))
}))
vi.mock('../src/Reporter/index.js', () => ({
    Reporter: vi.fn().mockImplementation(() => ({
        start: vi.fn(),
        stop: vi.fn(),
        alive: vi.fn(),
        ip: vi.fn(),
        ddns: vi.fn()
    }))
}))

describe('Peer Module Coverage', () => {
    let peer: Peer
    
    beforeEach(() => {
        vi.clearAllMocks()
        peer = new Peer()
    })
    
    afterEach(() => {
        vi.restoreAllMocks()
    })
    
    describe('Constructor', () => {
        it('should create Peer instance', () => {
            expect(peer).toBeDefined()
            expect(peer).toBeInstanceOf(Peer)
        })
    })
    
    describe('start() method', () => {
        it('should start the peer successfully', async () => {
            const mockServer = { 
                listen: vi.fn((port, cb) => cb()),
                close: vi.fn()
            }
            
            vi.spyOn(peer as any, 'init').mockResolvedValue(mockServer)
            vi.spyOn(peer as any, 'run').mockResolvedValue(true)
            vi.spyOn(peer as any, 'online').mockResolvedValue(true)
            
            const result = await peer.start()
            
            expect(result).toBe(true)
        })
        
        it('should handle start failure', async () => {
            vi.spyOn(peer as any, 'init').mockRejectedValue(new Error('Init failed'))
            
            const result = await peer.start()
            
            expect(result).toBe(false)
        })
    })
    
    describe('restart() method', () => {
        it('should restart with backoff on failure', async () => {
            let attempts = 0
            vi.spyOn(peer as any, 'start').mockImplementation(async () => {
                attempts++
                if (attempts < 3) return false
                return true
            })
            
            const result = await peer.restart()
            
            expect(result).toBe(true)
            expect(attempts).toBe(3)
        })
    })
    
    describe('stop() method', () => {
        it('should stop the peer', async () => {
            const mockServer = { 
                close: vi.fn((cb) => cb())
            }
            ;(peer as any).server = mockServer
            ;(peer as any).reporter = { stop: vi.fn() }
            
            const result = await peer.stop()
            
            expect(result).toBe(true)
            expect(mockServer.close).toHaveBeenCalled()
        })
    })
    
    describe('read() method', () => {
        it('should read configuration', () => {
            const config = peer.read()
            
            expect(config).toBeDefined()
            expect(config.name).toBe('test')
        })
    })
    
    describe('write() method', () => {
        it('should write configuration', () => {
            const config = {
                name: 'test',
                env: 'development' as const,
                development: {
                    port: 8765,
                    domain: 'localhost',
                    peers: []
                }
            }
            
            const result = peer.write(config)
            
            expect(result).toBe(true)
        })
    })
    
    describe('check() method', () => {
        it('should check if peer is running', () => {
            const result = peer.check()
            
            expect(result).toBe(false)
        })
    })
    
    describe('clean() method', () => {
        it('should clean PID files', () => {
            peer.clean()
            
            expect((peer as any).process.clean).toHaveBeenCalled()
        })
    })
    
    describe('find() method', () => {
        it('should find process by port', () => {
            const result = peer.find(8765)
            
            expect(result).toBeUndefined()
        })
    })
})