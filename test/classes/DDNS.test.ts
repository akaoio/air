/**
 * DDNS Class Tests - Comprehensive Coverage
 * Tests all DDNS methods with 100% coverage
 */

import { DDNS } from '../../src/DDNS/index.js'
import { TestSetup } from '../shared/testSetup.js'
import type { DDNSConfig, DDNSState, IPResult } from '../../src/DDNS/types.js'
import * as fs from 'fs'

// Mock fs module
jest.mock('fs')
const mockedFs = fs as jest.Mocked<typeof fs>

// Mock fetch
const mockedFetch = jest.fn() as jest.MockedFunction<any>

describe('DDNS Class', () => {
    let testSetup: TestSetup
    let testDir: string
    
    beforeEach(() => {
        testSetup = new TestSetup('ddns-test')
        testDir = testSetup.createTestDir('ddns')
        global.fetch = mockedFetch
        jest.clearAllMocks()
    })
    
    afterEach(() => {
        testSetup.cleanup()
    })
    
    describe('Constructor', () => {
        test('should create DDNS instance without config', () => {
            const ddns = new DDNS()
            
            expect(ddns).toBeInstanceOf(DDNS)
        })
        
        test('should create DDNS instance with valid config', () => {
            const config: DDNSConfig = {
                domains: ['example.com', 'test.com'],
                godaddy: {
                    key: 'test-key',
                    secret: 'test-secret'
                }
            }
            
            const ddns = new DDNS(config)
            
            expect(ddns).toBeInstanceOf(DDNS)
        })
        
        test('should create DDNS instance with minimal config', () => {
            const config: DDNSConfig = {
                domains: ['example.com']
            }
            
            const ddns = new DDNS(config)
            
            expect(ddns).toBeInstanceOf(DDNS)
        })
        
        test('should handle empty config object', () => {
            const config: DDNSConfig = {}
            
            const ddns = new DDNS(config)
            
            expect(ddns).toBeInstanceOf(DDNS)
        })
    })
    
    describe('detect() method', () => {
        test('should detect IPv4 address successfully', async () => {
            // Mock successful IPv4 detection
            mockedFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('1.2.3.4')
            } as Response)
            
            const ddns = new DDNS()
            const result = await ddns.detect()
            
            expect(result).toHaveProperty('ipv4')
            expect(result).toHaveProperty('ipv6')
            expect(result.ipv4).toBe('1.2.3.4')
        })
        
        test('should detect IPv6 address successfully', async () => {
            // Mock successful IPv6 detection
            mockedFetch
                .mockResolvedValueOnce({
                    ok: true,
                    text: () => Promise.resolve('1.2.3.4')
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    text: () => Promise.resolve('2001:db8::1')
                } as Response)
            
            const ddns = new DDNS()
            const result = await ddns.detect()
            
            expect(result.ipv4).toBe('1.2.3.4')
            expect(result.ipv6).toBe('2001:db8::1')
        })
        
        test('should handle detection failure gracefully', async () => {
            // Mock detection failure
            mockedFetch.mockRejectedValue(new Error('Network error'))
            
            const ddns = new DDNS()
            const result = await ddns.detect()
            
            expect(result.ipv4).toBeNull()
            expect(result.ipv6).toBeNull()
        })
        
        test('should handle invalid response format', async () => {
            // Mock invalid response
            mockedFetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            } as Response)
            
            const ddns = new DDNS()
            const result = await ddns.detect()
            
            expect(result.ipv4).toBeNull()
            expect(result.ipv6).toBeNull()
        })
        
        test('should handle timeout scenarios', async () => {
            // Mock timeout
            mockedFetch.mockImplementation(() => 
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 100)
                )
            )
            
            const ddns = new DDNS()
            
            await expect(ddns.detect()).resolves.toHaveProperty('ipv4', null)
        })
    })
    
    describe('update() method', () => {
        test('should update DNS records successfully', async () => {
            const config = {
                root: testDir,
                bash: '/bin/bash',
                name: 'test-peer',
                port: 443,
                domain: 'example.com',
                godaddy: {
                    key: 'test-key',
                    secret: 'test-secret'
                }
            }
            
            const ips: IPResult = {
                ipv4: '1.2.3.4',
                ipv6: '2001:db8::1'
            }
            
            // Mock successful GoDaddy API response
            mockedFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            } as Response)
            
            const ddns = new DDNS({
                domains: ['example.com'],
                godaddy: config.godaddy
            })
            
            const result = await ddns.update(config as any, ips)
            
            expect(Array.isArray(result)).toBe(true)
            expect(result).toHaveLength(1)
            expect(result?.[0]).toHaveProperty('domain', 'example.com')
            expect(result?.[0]).toHaveProperty('success', true)
        })
        
        test('should handle missing GoDaddy configuration', async () => {
            const config = {
                root: testDir,
                bash: '/bin/bash',
                name: 'test-peer',
                port: 443,
                domain: 'example.com'
            }
            
            const ips: IPResult = {
                ipv4: '1.2.3.4',
                ipv6: null
            }
            
            const ddns = new DDNS({
                domains: ['example.com']
            })
            
            const result = await ddns.update(config as any, ips)
            
            expect(result).toHaveLength(0)
        })
        
        test('should handle GoDaddy API errors', async () => {
            const config = {
                root: testDir,
                bash: '/bin/bash',
                name: 'test-peer',
                port: 443,
                domain: 'example.com',
                godaddy: {
                    key: 'test-key',
                    secret: 'test-secret'
                }
            }
            
            const ips: IPResult = {
                ipv4: '1.2.3.4',
                ipv6: null
            }
            
            // Mock API error
            mockedFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            } as Response)
            
            const ddns = new DDNS({
                domains: ['example.com'],
                godaddy: config.godaddy
            })
            
            const result = await ddns.update(config as any, ips)
            
            expect(result).toHaveLength(1)
            expect(result?.[0]).toHaveProperty('success', false)
            expect(result?.[0]).toHaveProperty('domain', 'example.com')
        })
        
        test('should handle multiple domains', async () => {
            const config = {
                root: testDir,
                bash: '/bin/bash',
                name: 'test-peer',
                port: 443,
                domain: 'example.com',
                godaddy: {
                    key: 'test-key',
                    secret: 'test-secret'
                }
            }
            
            const ips: IPResult = {
                ipv4: '1.2.3.4',
                ipv6: '2001:db8::1'
            }
            
            // Mock successful responses for multiple domains
            mockedFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                } as Response)
            
            const ddns = new DDNS({
                domains: ['example.com', 'test.com'],
                godaddy: config.godaddy
            })
            
            const result = await ddns.update(config as any, ips)
            
            expect(result).toHaveLength(2)
            expect(result?.every(r => r.success)).toBe(true)
        })
        
        test('should handle network errors during update', async () => {
            const config = {
                root: testDir,
                bash: '/bin/bash',
                name: 'test-peer',
                port: 443,
                domain: 'example.com',
                godaddy: {
                    key: 'test-key',
                    secret: 'test-secret'
                }
            }
            
            const ips: IPResult = {
                ipv4: '1.2.3.4',
                ipv6: null
            }
            
            // Mock network error
            mockedFetch.mockRejectedValue(new Error('Network error'))
            
            const ddns = new DDNS({
                domains: ['example.com'],
                godaddy: config.godaddy
            })
            
            const result = await ddns.update(config as any, ips)
            
            expect(result).toHaveLength(1)
            expect(result?.[0]).toHaveProperty('success', false)
        })
    })
    
    describe('load() method', () => {
        test('should load existing state from file', () => {
            const mockState: DDNSState = {
                lastUpdate: '2024-01-01T00:00:00.000Z',
                ipv4: '1.2.3.4',
                ipv6: '2001:db8::1',
                domains: ['example.com']
            }
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockState))
            
            const ddns = new DDNS()
            const result = ddns.load()
            
            expect(result).toEqual(mockState)
            expect(mockedFs.readFileSync).toHaveBeenCalledWith(
                expect.stringContaining('ddns.json'),
                'utf8'
            )
        })
        
        test('should return null when state file does not exist', () => {
            mockedFs.existsSync.mockReturnValue(false)
            
            const ddns = new DDNS()
            const result = ddns.load()
            
            expect(result).toBeNull()
            expect(mockedFs.readFileSync).not.toHaveBeenCalled()
        })
        
        test('should handle corrupted state file', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('{ invalid json')
            
            const ddns = new DDNS()
            
            expect(() => ddns.load()).toThrow()
        })
        
        test('should handle file read errors', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockImplementation(() => {
                throw new Error('Permission denied')
            })
            
            const ddns = new DDNS()
            
            expect(() => ddns.load()).toThrow('Permission denied')
        })
    })
    
    describe('save() method', () => {
        test('should save state to file', () => {
            const mockState: DDNSState = {
                lastUpdate: '2024-01-01T00:00:00.000Z',
                ipv4: '1.2.3.4',
                ipv6: '2001:db8::1',
                domains: ['example.com']
            }
            
            mockedFs.writeFileSync.mockImplementation(() => {})
            mockedFs.mkdirSync.mockImplementation(() => undefined)
            
            const ddns = new DDNS()
            ddns.save(mockState)
            
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('ddns.json'),
                JSON.stringify(mockState, null, 2)
            )
        })
        
        test('should create directory if it does not exist', () => {
            const mockState: DDNSState = {
                lastUpdate: '2024-01-01T00:00:00.000Z'
            }
            
            mockedFs.existsSync.mockReturnValue(false)
            mockedFs.mkdirSync.mockImplementation(() => undefined)
            mockedFs.writeFileSync.mockImplementation(() => {})
            
            const ddns = new DDNS()
            ddns.save(mockState)
            
            expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
                expect.any(String),
                { recursive: true }
            )
        })
        
        test('should handle write errors', () => {
            const mockState: DDNSState = {
                lastUpdate: '2024-01-01T00:00:00.000Z'
            }
            
            mockedFs.writeFileSync.mockImplementation(() => {
                throw new Error('Disk full')
            })
            
            const ddns = new DDNS()
            
            expect(() => ddns.save(mockState)).toThrow('Disk full')
        })
    })
    
    describe('Integration Tests', () => {
        test('should handle complete DDNS workflow', async () => {
            const config = {
                root: testDir,
                bash: '/bin/bash',
                name: 'test-peer',
                port: 443,
                domain: 'example.com',
                godaddy: {
                    key: 'test-key',
                    secret: 'test-secret'
                }
            }
            
            // Mock successful IP detection
            mockedFetch
                .mockResolvedValueOnce({
                    ok: true,
                    text: () => Promise.resolve('1.2.3.4')
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    text: () => Promise.resolve('2001:db8::1')
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                } as Response)
            
            // Mock file operations
            mockedFs.existsSync.mockReturnValue(false)
            mockedFs.mkdirSync.mockImplementation(() => undefined)
            mockedFs.writeFileSync.mockImplementation(() => {})
            
            const ddns = new DDNS({
                domains: ['example.com'],
                godaddy: config.godaddy
            })
            
            // Detect IPs
            const ips = await ddns.detect()
            expect(ips.ipv4).toBe('1.2.3.4')
            expect(ips.ipv6).toBe('2001:db8::1')
            
            // Update DNS
            const updateResults = await ddns.update(config as any, ips)
            expect(updateResults).toHaveLength(1)
            expect(updateResults?.[0]?.success).toBe(true)
            
            // Save state
            const state: DDNSState = {
                lastUpdate: new Date().toISOString(),
                ipv4: ips.ipv4 || undefined,
                ipv6: ips.ipv6 || undefined,
                domains: ['example.com']
            }
            
            ddns.save(state)
            expect(mockedFs.writeFileSync).toHaveBeenCalled()
        })
        
        test('should handle error recovery scenarios', async () => {
            const ddns = new DDNS()
            
            // Test detection failure recovery
            mockedFetch.mockRejectedValueOnce(new Error('Network error'))
            const ips = await ddns.detect()
            expect(ips.ipv4).toBeNull()
            
            // Test load failure recovery
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockImplementation(() => {
                throw new Error('File corrupted')
            })
            
            expect(() => ddns.load()).toThrow('File corrupted')
        })
    })
})