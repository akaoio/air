/**
 * Config Class Tests - Foundation Phase
 * Tests all 6 Config methods with comprehensive coverage
 */

import { Config } from '../../src/Config/index.js'
import { TestSetup } from '../shared/testSetup.js'
import { configMocks } from '../mocks/configMocks.js'
import * as fs from 'fs'
import * as path from 'path'

// Mock fs module
jest.mock('fs')
jest.mock('../../src/Logger/index.js', () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}))

const mockedFs = fs as jest.Mocked<typeof fs>

describe('Config Class', () => {
    let testSetup: TestSetup
    let testDir: string
    
    beforeEach(() => {
        testSetup = new TestSetup('config-test')
        testDir = testSetup.createTestDir('config')
        jest.clearAllMocks()
    })
    
    afterEach(() => {
        testSetup.cleanup()
    })
    
    describe('Constructor', () => {
        test('should create Config instance with valid parameters', () => {
            const configPath = path.join(testDir, 'air.json')
            const config = new Config(configPath)
            
            expect(config).toBeInstanceOf(Config)
        })
        
        test('should create Config instance with default path', () => {
            const config = new Config()
            
            expect(config).toBeInstanceOf(Config)
        })
        
        test('should handle custom config path', () => {
            const customPath = path.join(testDir, 'custom.json')
            const config = new Config(customPath)
            
            expect(config).toBeInstanceOf(Config)
        })
    })
    
    describe('load() method', () => {
        test('should load valid configuration file', () => {
            const configPath = path.join(testDir, 'air.json')
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(configMocks.valid.basic))
            
            const config = new Config(configPath)
            const result = config.load()
            
            expect(result).toEqual(configMocks.valid.basic)
            expect(mockedFs.readFileSync).toHaveBeenCalledWith(configPath, 'utf8')
        })
        
        test('should handle missing config file', () => {
            const configPath = path.join(testDir, 'air.json')
            mockedFs.existsSync.mockReturnValue(false)
            
            const config = new Config(configPath)
            const result = config.load()
            
            expect(result).toEqual(null)
            expect(mockedFs.readFileSync).not.toHaveBeenCalled()
        })
        
        test('should handle corrupted JSON file', () => {
            const configPath = path.join(testDir, 'air.json')
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('{ invalid json')
            
            const config = new Config(configPath)
            const result = config.load()
            
            expect(result).toBeNull()
        })
        
        test('should handle file read permission error', () => {
            const configPath = path.join(testDir, 'air.json')
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockImplementation(() => {
                throw new Error('EACCES: permission denied')
            })
            
            const config = new Config(configPath)
            const result = config.load()
            
            expect(result).toBeNull()
        })
        
        test('should handle empty config file', () => {
            const configPath = path.join(testDir, 'air.json')
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('')
            
            const config = new Config(configPath)
            const result = config.load()
            
            expect(result).toBeNull()
        })
    })
    
    describe('save() method', () => {
        test('should save configuration to file', () => {
            const configPath = path.join(testDir, 'air.json')
            mockedFs.mkdirSync.mockImplementation(() => undefined)
            mockedFs.writeFileSync.mockImplementation(() => {})
            
            const config = new Config(configPath)
            const result = config.save(configMocks.valid.basic)
            
            expect(result).toBe(true)
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                configPath,
                JSON.stringify(configMocks.valid.basic, null, 2)
            )
        })
        
        test('should handle write permission error', () => {
            const configPath = path.join(testDir, 'air.json')
            mockedFs.mkdirSync.mockImplementation(() => undefined)
            mockedFs.writeFileSync.mockImplementation(() => {
                throw new Error('EACCES: permission denied')
            })
            
            const config = new Config(configPath)
            const result = config.save(configMocks.valid.basic)
            
            expect(result).toBe(false)
        })
        
        test('should handle disk space error', () => {
            const configPath = path.join(testDir, 'air.json')
            mockedFs.mkdirSync.mockImplementation(() => undefined)
            mockedFs.writeFileSync.mockImplementation(() => {
                throw new Error('ENOSPC: no space left on device')
            })
            
            const config = new Config(configPath)
            const result = config.save(configMocks.valid.basic)
            
            expect(result).toBe(false)
        })
        
        test('should create directory if not exists', () => {
            const configPath = path.join(testDir, 'air.json')
            mockedFs.mkdirSync.mockImplementation(() => undefined)
            mockedFs.writeFileSync.mockImplementation(() => {})
            
            const config = new Config(configPath)
            const result = config.save(configMocks.valid.basic)
            
            expect(result).toBe(true)
            expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.dirname(configPath), { recursive: true })
        })
    })
    
    describe('merge() method', () => {
        test('should merge configurations correctly', () => {
            const config = new Config()
            
            const base = { 
                root: '/tmp/test',
                bash: '/bin/bash',
                name: 'base', 
                port: 8765,
                domain: 'localhost'
            }
            const override = { 
                name: 'override',
                port: 9000,
                debug: true 
            }
            
            const result = config.merge(base, override)
            
            expect(result).toEqual({
                root: '/tmp/test',
                bash: '/bin/bash',
                name: 'override',
                port: 9000,
                domain: 'localhost',
                debug: true
            })
        })
        
        test('should handle deep nested merging', () => {
            const config = new Config()
            
            const base = configMocks.edge.deepNested
            const override = {
                nested: {
                    level1: {
                        level2: {
                            level3: {
                                value: 'overridden',
                                newValue: 'added'
                            }
                        }
                    }
                }
            }
            
            const result = config.merge(base, override) as any
            
            expect(result.nested.level1.level2.level3.value).toBe('overridden')
            expect(result.nested.level1.level2.level3.newValue).toBe('added')
        })
        
        test('should handle array merging', () => {
            const config = new Config()
            
            const base = { peers: ['peer1', 'peer2'] }
            const override = { peers: ['peer3', 'peer4'] }
            
            const result = config.merge(base, override) as any
            
            expect(result.peers).toEqual(['peer3', 'peer4'])
        })
        
        test('should handle null and undefined values', () => {
            const config = new Config()
            
            const base = { name: 'test', value: 'original' }
            const override = { value: null, newValue: undefined }
            
            const result = config.merge(base, override) as any
            
            expect(result.value).toBeNull()
            expect(result.newValue).toBeUndefined()
        })
    })
    
    describe('defaults() method', () => {
        test('should provide default configuration', () => {
            const config = new Config()
            const defaults = config.defaults()
            
            expect(defaults).toHaveProperty('name')
            expect(defaults).toHaveProperty('root')
            expect(defaults).toHaveProperty('bash')
            expect(defaults).toHaveProperty('port')
            expect(defaults).toHaveProperty('domain')
        })
        
        test('should provide consistent default values', () => {
            const config = new Config()
            const defaults1 = config.defaults()
            const defaults2 = config.defaults()
            
            expect(defaults1).toEqual(defaults2)
        })
    })
    
    describe('validate() method', () => {
        test('should validate correct configuration', () => {
            const config = new Config()
            const isValid = config.validate(configMocks.valid.basic)
            
            expect(isValid).toBe(true)
        })
        
        test('should reject configuration with missing name', () => {
            const config = new Config()
            const isValid = config.validate(configMocks.invalid.missingName)
            
            expect(isValid).toBe(false)
        })
        
        test('should reject configuration with invalid port', () => {
            const config = new Config()
            const isValid = config.validate(configMocks.invalid.invalidPort)
            
            expect(isValid).toBe(false)
        })
        
        test('should reject configuration with invalid peers array', () => {
            const config = new Config()
            const isValid = config.validate(configMocks.invalid.invalidPeers)
            
            expect(isValid).toBe(false)
        })
        
        test('should handle empty configuration', () => {
            const config = new Config()
            const isValid = config.validate(configMocks.edge.empty as any)
            
            expect(isValid).toBe(false)
        })
        
        test('should validate SSL configuration in production', () => {
            const config = new Config()
            const isValid = config.validate(configMocks.valid.production)
            
            expect(isValid).toBe(true)
        })
        
        test('should reject configuration with empty name', () => {
            const config = new Config()
            const isValid = config.validate(configMocks.invalid.emptyName as any)
            
            expect(isValid).toBe(false)
        })

        test('should detect missing environment config', () => {
            const config = new Config()
            const testConfig = {
                name: 'test',
                env: 'production',
                root: '/test',
                // Missing production config
            }
            const isValid = config.validate(testConfig)
            
            expect(isValid).toBe(false)
        })

        test('should validate port as non-number', () => {
            const config = new Config()
            const testConfig = {
                name: 'test',
                env: 'production',
                root: '/test',
                production: {
                    port: 'not-a-number',
                    domain: 'test.com'
                }
            }
            const isValid = config.validate(testConfig)
            
            expect(isValid).toBe(false)
        })

        test('should validate port out of range', () => {
            const config = new Config()
            const testConfig = {
                name: 'test',
                env: 'production',
                root: '/test',
                production: {
                    port: 70000,
                    domain: 'test.com'
                }
            }
            const isValid = config.validate(testConfig)
            
            expect(isValid).toBe(false)
        })

        test('should detect missing domain', () => {
            const config = new Config()
            const testConfig = {
                name: 'test',
                env: 'production',
                root: '/test',
                production: {
                    port: 8080
                    // Missing domain
                }
            }
            const isValid = config.validate(testConfig)
            
            expect(isValid).toBe(false)
        })
    })
    
    describe('Integration Tests', () => {
        test('should handle full configuration lifecycle', () => {
            const configPath = path.join(testDir, 'air.json')
            mockedFs.existsSync.mockReturnValue(false)
            mockedFs.mkdirSync.mockImplementation(() => undefined)
            mockedFs.writeFileSync.mockImplementation(() => {})
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(configMocks.valid.basic))
            
            const config = new Config(configPath)
            
            // Start with defaults
            const defaults = config.defaults()
            expect(config.validate(defaults)).toBe(true)
            
            // Save configuration
            config.save(defaults)
            expect(mockedFs.writeFileSync).toHaveBeenCalled()
            
            // Modify existsSync for load test
            mockedFs.existsSync.mockReturnValue(true)
            
            // Load and validate
            const loaded = config.load()
            expect(loaded).not.toBeNull()
            if (loaded) {
                expect(config.validate(loaded)).toBe(true)
            }
        })
        
        test('should handle configuration merging workflow', () => {
            const config = new Config()
            
            const defaults = config.defaults()
            const overrides = { debug: true, custom: 'value' }
            
            const merged = config.merge(defaults, overrides) as any
            expect(config.validate(merged)).toBe(true)
            expect(merged.debug).toBe(true)
            expect(merged.custom).toBe('value')
            expect(merged.port).toBe(defaults.port) // Preserved from defaults
        })
    })
})