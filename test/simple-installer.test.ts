/**
 * Simple Installer test to verify coverage works
 */

import { Installer } from '../src/Installer/index.js'

// Mock Platform module
jest.mock('../src/Platform/index.js', () => ({
    Platform: {
        getInstance: jest.fn(() => ({
            createService: jest.fn(() => Promise.resolve({ success: true, type: 'systemd' })),
            startService: jest.fn(() => Promise.resolve({ started: true, pid: 12345 })),
            setupSSL: jest.fn(() => Promise.resolve({ success: true, keyPath: '/ssl/key.pem', certPath: '/ssl/cert.pem' }))
        }))
    }
}))

describe('Simple Installer Tests', () => {
    test('service() should work with Platform mock', async () => {
        const installer = new Installer()
        const config = {
            name: 'test',
            env: 'development' as const,
            root: '/test',
            bash: '/bin/bash',
            domain: 'localhost',
            port: 8765,
            development: {
                port: 8765,
                domain: 'localhost'
            }
        }
        
        const result = await installer.service(config)
        
        expect(result.created).toBe(true)
        expect(result.enabled).toBe(true)
    })
    
    test('ssl() should work with Platform mock', async () => {
        const installer = new Installer()
        const config = {
            name: 'test',
            env: 'development' as const,
            root: '/test',
            bash: '/bin/bash',
            domain: 'localhost',
            port: 8765,
            development: {
                port: 8765,
                domain: 'localhost'
            }
        }
        
        const result = await installer.ssl(config)
        
        expect(result).toBe(true)
        expect(config.ssl).toBeDefined()
    })
    
    test('start() should work with Platform mock', async () => {
        const installer = new Installer()
        const config = {
            name: 'test',
            env: 'development' as const,
            root: '/test',
            bash: '/bin/bash',
            domain: 'localhost',
            port: 8765,
            development: {
                port: 8765,
                domain: 'localhost'
            }
        }
        
        const result = await installer.start(config)
        
        expect(result.started).toBe(true)
        expect(result.pid).toBe(12345)
    })
})