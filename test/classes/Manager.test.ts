/**
 * Manager Class Tests - Comprehensive Coverage
 * Tests all Manager methods with proper mocking
 */

import { Manager } from '../../src/Manager/index.js'
import fs from 'fs'
import path from 'path'

// Mock external dependencies
jest.mock('fs')
jest.mock('../../src/Logger/index.js', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}))
jest.mock('../../src/Path/index.js', () => ({
    getpaths: jest.fn((rootArg, bashArg) => ({
        root: rootArg || '/tmp/test',
        bash: bashArg || '/tmp/test/script',
        config: '/tmp/test/air.json'
    }))
}))
jest.mock('../../src/lib/utils.js', () => ({
    merge: jest.fn((target, source) => ({ ...target, ...source }))
}))

const mockedFs = fs as jest.Mocked<typeof fs>

describe('Manager Class', () => {
    let tmpDir: string
    
    beforeEach(() => {
        tmpDir = '/tmp/test-manager'
        jest.clearAllMocks()
        
        // Reset process.env
        process.env = {}
        
        // Setup default fs mocks
        mockedFs.existsSync.mockReturnValue(false)
        mockedFs.readFileSync.mockReturnValue('')
        mockedFs.writeFileSync.mockImplementation(() => {})
        mockedFs.mkdirSync.mockImplementation(() => {})
    })

    describe('Constructor', () => {
        test('should create Manager instance with options', () => {
            const options = {
                rootArg: '/custom/root',
                bashArg: '/custom/bash',
                configFile: '/custom/config.json'
            }
            
            const manager = new Manager(options)
            
            expect(manager).toBeInstanceOf(Manager)
            expect(manager['options']).toEqual(options)
            expect(manager['config']).toBeNull()
        })
        
        test('should create instance with empty options', () => {
            const manager = new Manager()
            
            expect(manager).toBeInstanceOf(Manager)
            expect(manager['options']).toEqual({})
            expect(manager['config']).toBeNull()
        })
        
        test('should store configFile option properly', () => {
            const configFile = '/test/air.json'
            const manager = new Manager({ configFile })
            
            expect(manager['configFile']).toBe(configFile)
        })
    })

    describe('read() method', () => {
        test('should read config when file exists', () => {
            const mockConfig = {
                name: 'test-air',
                port: 8765,
                domain: 'localhost'
            }
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig))
            
            const manager = new Manager()
            const result = manager.read()
            
            expect(mockedFs.existsSync).toHaveBeenCalled()
            expect(mockedFs.readFileSync).toHaveBeenCalled()
            expect(result).toBeDefined()
        })
        
        test('should use defaults when file does not exist', () => {
            mockedFs.existsSync.mockReturnValue(false)
            
            const manager = new Manager()
            const result = manager.read()
            
            expect(mockedFs.existsSync).toHaveBeenCalled()
            expect(result).toBeDefined()
            expect(result.name).toBeDefined()
        })
        
        test('should handle JSON parse errors', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('invalid json')
            
            const manager = new Manager()
            const result = manager.read()
            
            // Should fallback to defaults on error
            expect(result).toBeDefined()
        })
        
        test('should use custom options', () => {
            const options = {
                rootArg: '/custom/root',
                bashArg: '/custom/bash',
                configFile: '/custom/config.json'
            }
            
            const manager = new Manager()
            manager.read(options)
            
            expect(mockedFs.existsSync).toHaveBeenCalled()
        })
    })

    describe('write() method', () => {
        test('should write config to file', () => {
            const config = {
                name: 'test-air',
                port: 8765,
                domain: 'localhost'
            }
            
            mockedFs.existsSync.mockReturnValue(true)
            
            const manager = new Manager()
            const result = manager.write(config)
            
            expect(mockedFs.writeFileSync).toHaveBeenCalled()
            expect(result).toBe(true)
        })
        
        test('should create directory if not exists', () => {
            const config = { name: 'test' }
            
            mockedFs.existsSync.mockReturnValue(false)
            
            const manager = new Manager()
            manager.write(config)
            
            expect(mockedFs.mkdirSync).toHaveBeenCalled()
            expect(mockedFs.writeFileSync).toHaveBeenCalled()
        })
        
        test('should handle write errors', () => {
            const config = { name: 'test' }
            
            mockedFs.writeFileSync.mockImplementation(() => {
                throw new Error('Write error')
            })
            
            const manager = new Manager()
            const result = manager.write(config)
            
            expect(result).toBe(false)
        })
        
        test('should use custom options', () => {
            const config = { name: 'test' }
            const options = {
                configFile: '/custom/config.json'
            }
            
            const manager = new Manager()
            manager.write(config, options)
            
            expect(mockedFs.writeFileSync).toHaveBeenCalled()
        })
    })

    describe('sync() method', () => {
        beforeEach(() => {
            // Mock fetch for sync tests
            global.fetch = jest.fn()
        })
        
        test('should sync config from URL successfully', async () => {
            const remoteConfig = {
                name: 'remote-air',
                port: 9000,
                peers: ['peer1', 'peer2']
            }
            
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve(remoteConfig)
            }
            ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({ name: 'local' }))
            
            const manager = new Manager()
            const result = await manager.sync('https://example.com/config.json')
            
            expect(global.fetch).toHaveBeenCalledWith('https://example.com/config.json', expect.any(Object))
            expect(result).toBeDefined()
        })
        
        test('should handle sync rate limiting', async () => {
            // First call sets lastSync
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({ name: 'test' })
            }
            ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
            
            const manager = new Manager()
            await manager.sync('https://example.com/config.json')
            
            // Immediate second call should be rate limited
            const result = await manager.sync('https://example.com/config.json')
            
            expect(global.fetch).toHaveBeenCalledTimes(1)
        })
        
        test('should handle fetch errors', async () => {
            ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
            
            const manager = new Manager()
            const result = await manager.sync('https://example.com/config.json')
            
            expect(result).toBeNull()
        })
        
        test('should handle HTTP errors', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found'
            }
            ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
            
            const manager = new Manager()
            const result = await manager.sync('https://example.com/config.json')
            
            expect(result).toBeNull()
        })
        
        test('should timeout long requests', async () => {
            ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))
            
            const manager = new Manager()
            const result = await manager.sync('https://example.com/config.json')
            
            expect(result).toBeNull()
        }, 15000)
    })

    describe('defaults() method', () => {
        test('should return default config', () => {
            const manager = new Manager()
            const defaults = manager.defaults()
            
            expect(defaults).toBeDefined()
            expect(defaults.name).toBeDefined()
            expect(defaults.port).toBeDefined()
            expect(defaults.domain).toBeDefined()
            expect(Array.isArray(defaults.peers)).toBe(true)
            expect(defaults.ip).toBeDefined()
        })
        
        test('should use custom options for defaults', () => {
            const options = {
                rootArg: '/custom/root',
                bashArg: '/custom/bash'
            }
            
            const manager = new Manager()
            const defaults = manager.defaults(options)
            
            expect(defaults).toBeDefined()
            expect(defaults.root).toBeDefined()
            expect(defaults.bash).toBeDefined()
        })
        
        test('should include ip configuration', () => {
            const manager = new Manager()
            const defaults = manager.defaults()
            
            expect(defaults.ip).toBeDefined()
            expect(defaults.ip.timeout).toBe(5000)
            expect(defaults.ip.dnsTimeout).toBe(3000)
            expect(defaults.ip.userAgent).toBe('Air-GUN-Peer/2.0')
            expect(Array.isArray(defaults.ip.dns)).toBe(true)
            expect(Array.isArray(defaults.ip.http)).toBe(true)
        })
    })

    describe('validate() method', () => {
        test('should validate config with env and name', () => {
            const config = {
                env: 'test',
                name: 'test-air',
                test: {
                    port: 8765,
                    domain: 'localhost'
                }
            }
            
            const manager = new Manager()
            const result = manager.validate(config)
            
            expect(result).toBeDefined()
            expect(result.valid).toBe(true)
            expect(Array.isArray(result.errors)).toBe(true)
        })
        
        test('should reject config without env', () => {
            const config = {
                name: 'test-air'
            }
            
            const manager = new Manager()
            const result = manager.validate(config)
            
            expect(result.valid).toBe(false)
            expect(result.errors).toContain('Environment not specified')
        })
        
        test('should reject config without name', () => {
            const config = {
                env: 'test'
            }
            
            const manager = new Manager()
            const result = manager.validate(config)
            
            expect(result.valid).toBe(false)
            expect(result.errors).toContain('Name not specified')
        })
        
        test('should reject config with invalid port', () => {
            const config = {
                env: 'test',
                name: 'test-air',
                test: {
                    port: 99999
                }
            }
            
            const manager = new Manager()
            const result = manager.validate(config)
            
            expect(result.valid).toBe(false)
            expect(result.errors).toContain('Invalid port number')
        })
        
        test('should validate SSL files for production', () => {
            mockedFs.existsSync.mockReturnValue(false)
            
            const config = {
                env: 'production',
                name: 'prod-air',
                production: {
                    port: 443,
                    ssl: {
                        key: '/path/to/key.pem',
                        cert: '/path/to/cert.pem'
                    }
                }
            }
            
            const manager = new Manager()
            const result = manager.validate(config)
            
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.includes('SSL key file not found'))).toBe(true)
            expect(result.errors.some(e => e.includes('SSL cert file not found'))).toBe(true)
        })
        
        test('should use options for validation', () => {
            const config = {
                env: 'test',
                name: 'test-air',
                test: { port: 8765 }
            }
            
            const options = {
                config: config
            }
            
            const manager = new Manager()
            const result = manager.validate(config, options)
            
            expect(result).toBeDefined()
        })
    })

    describe('mergeenv() method', () => {
        test('should merge root-level environment variables', () => {
            process.env.ROOT = '/custom/root'
            process.env.BASH = '/custom/bash'
            process.env.ENV = 'production'
            process.env.NAME = 'env-air'
            process.env.SYNC = 'https://config.example.com'
            
            const config = {
                name: 'original-air',
                env: 'test'
            }
            
            const manager = new Manager()
            const result = manager.mergeenv(config)
            
            expect(result.root).toBe('/custom/root')
            expect(result.bash).toBe('/custom/bash')
            expect(result.env).toBe('production')
            expect(result.name).toBe('env-air')
            expect(result.sync).toBe('https://config.example.com')
        })
        
        test('should merge environment-specific variables', () => {
            process.env.PORT = '9000'
            process.env.DOMAIN = 'example.com'
            
            const config = {
                env: 'test',
                test: {
                    port: 8765,
                    domain: 'localhost'
                }
            }
            
            const manager = new Manager()
            const result = manager.mergeenv(config)
            
            expect(result.test.port).toBe(9000)
            expect(result.test.domain).toBe('example.com')
        })
        
        test('should merge SSL configuration', () => {
            process.env.SSL_KEY = '/path/to/key.pem'
            process.env.SSL_CERT = '/path/to/cert.pem'
            
            const config = {
                env: 'production',
                production: {}
            }
            
            const manager = new Manager()
            const result = manager.mergeenv(config)
            
            expect(result.production.ssl).toBeDefined()
            expect(result.production.ssl.key).toBe('/path/to/key.pem')
            expect(result.production.ssl.cert).toBe('/path/to/cert.pem')
        })
        
        test('should merge SEA pair configuration', () => {
            process.env.PUB = 'public-key'
            process.env.PRIV = 'private-key'
            process.env.EPUB = 'encryption-public'
            process.env.EPRIV = 'encryption-private'
            
            const config = {
                env: 'test',
                test: {}
            }
            
            const manager = new Manager()
            const result = manager.mergeenv(config)
            
            expect(result.test.pair).toBeDefined()
            expect(result.test.pair.pub).toBe('public-key')
            expect(result.test.pair.priv).toBe('private-key')
            expect(result.test.pair.epub).toBe('encryption-public')
            expect(result.test.pair.epriv).toBe('encryption-private')
        })
        
        test('should merge peers configuration', () => {
            process.env.PEERS = 'peer1.com,peer2.com,peer3.com'
            
            const config = {
                env: 'test',
                test: {}
            }
            
            const manager = new Manager()
            const result = manager.mergeenv(config)
            
            expect(result.test.peers).toEqual(['peer1.com', 'peer2.com', 'peer3.com'])
        })
        
        test('should handle missing environment config', () => {
            process.env.PORT = '9000'
            
            const config = {
                env: 'missing'
            }
            
            const manager = new Manager()
            const result = manager.mergeenv(config)
            
            expect(result.missing).toBeDefined()
            expect(result.missing.port).toBe(9000)
        })
        
        test('should not modify original config', () => {
            process.env.NAME = 'new-name'
            
            const originalConfig = {
                name: 'original-name',
                env: 'test'
            }
            
            const manager = new Manager()
            const result = manager.mergeenv(originalConfig)
            
            expect(originalConfig.name).toBe('original-name') // Should not be modified
            expect(result.name).toBe('new-name')
        })
    })

    describe('Integration Tests', () => {
        test('should handle complete workflow', () => {
            const config = {
                name: 'test-air',
                env: 'test',
                test: {
                    port: 8765,
                    domain: 'localhost'
                }
            }
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(config))
            
            const manager = new Manager()
            
            // Read
            const readResult = manager.read()
            expect(readResult).toBeDefined()
            
            // Write
            const writeResult = manager.write(config)
            expect(writeResult).toBe(true)
            
            // Validate
            const validateResult = manager.validate(config)
            expect(validateResult.valid).toBe(true)
            
            // Defaults
            const defaultsResult = manager.defaults()
            expect(defaultsResult).toBeDefined()
            
            // Merge env
            const mergeResult = manager.mergeenv(config)
            expect(mergeResult).toBeDefined()
        })
        
        test('should handle method chaining scenarios', () => {
            const manager = new Manager()
            
            // Get defaults, merge env, validate, write
            const config = manager.defaults()
            const mergedConfig = manager.mergeenv(config)
            const validation = manager.validate(mergedConfig)
            
            expect(validation.valid).toBe(true)
            
            const writeResult = manager.write(mergedConfig)
            expect(writeResult).toBe(true)
        })
    })
    
    describe('Method delegation', () => {
        test('should delegate to constructor method', () => {
            const options = { rootArg: '/test' }
            const manager = new Manager(options)
            
            expect(manager['options']).toEqual(options)
        })
        
        test('should delegate to read method', () => {
            const manager = new Manager()
            const result = manager.read()
            
            expect(result).toBeDefined()
        })
        
        test('should delegate to write method', () => {
            const manager = new Manager()
            const config = { name: 'test' }
            const result = manager.write(config)
            
            expect(typeof result).toBe('boolean')
        })
        
        test('should delegate to defaults method', () => {
            const manager = new Manager()
            const result = manager.defaults()
            
            expect(result).toBeDefined()
        })
        
        test('should delegate to validate method', () => {
            const manager = new Manager()
            const config = { env: 'test', name: 'test', test: { port: 8765 } }
            const result = manager.validate(config)
            
            expect(result).toBeDefined()
            expect(typeof result.valid).toBe('boolean')
        })
        
        test('should delegate to mergeenv method', () => {
            const manager = new Manager()
            const config = { name: 'test' }
            const result = manager.mergeenv(config)
            
            expect(result).toBeDefined()
        })
    })
})