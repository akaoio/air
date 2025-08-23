/**
 * Installer Class Tests - System Phase
 * Tests all 4 Installer methods with comprehensive coverage
 */

import { Installer } from '../../src/Installer/index.js'
import { TestSetup } from '../shared/testSetup.js'
import { installerOptionMocks, airConfigMocks, installerTestUtils } from '../mocks/installerMocks.js'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// Mock modules
jest.mock('os')
jest.mock('fs')
jest.mock('path')
jest.mock('child_process')
jest.mock('../../src/Platform/index.js')

const mockedOs = os as jest.Mocked<typeof os>
const mockedFs = fs as jest.Mocked<typeof fs>
const mockedPath = path as jest.Mocked<typeof path>
const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>

// Import Platform mock
import { Platform } from '../../src/Platform/index.js'
import { MockPlatformStrategy, platformMockResults } from '../mocks/platformMocks.js'
const mockedPlatform = Platform as jest.Mocked<typeof Platform>

describe('Installer Class', () => {
    let testSetup: TestSetup
    let originalProcess: typeof process
    let originalBun: any
    
    beforeEach(() => {
        testSetup = new TestSetup('installer-test')
        
        // Save original global objects
        originalProcess = process
        originalBun = (global as any).Bun
        
        // Setup default path mocks
        mockedPath.join.mockImplementation((...paths: string[]) => paths.join('/'))
        mockedPath.resolve.mockImplementation((pathStr: string) => 
            pathStr.startsWith('/') ? pathStr : `/current/${pathStr}`
        )
        
        jest.clearAllMocks()
    })
    
    afterEach(() => {
        testSetup.cleanup()
        // Restore original globals
        Object.defineProperty(global, 'process', { value: originalProcess, configurable: true })
        if (originalBun) {
            (global as any).Bun = originalBun
        } else {
            delete (global as any).Bun
        }
    })
    
    describe('Constructor', () => {
        test('should create Installer instance with default options', () => {
            // Mock process environment
            Object.defineProperty(process, 'cwd', { 
                value: () => '/test/directory',
                configurable: true 
            })
            Object.defineProperty(process, 'platform', { 
                value: 'linux',
                configurable: true 
            })
            Object.defineProperty(process, 'getuid', { 
                value: () => 1000,
                configurable: true 
            })
            
            mockedExecSync.mockImplementation(() => '')
            
            const installer = new Installer()
            
            expect(installer).toBeInstanceOf(Installer)
            expect(installer['options']).toEqual({})
            expect(installer['context']).toEqual(expect.objectContaining({
                rootDir: '/test/directory',
                isRoot: false,
                platform: 'linux',
                hasSystemd: true,
                hasBun: false,
                hasNode: true
            }))
        })
        
        test('should create Installer instance with custom options', () => {
            Object.defineProperty(process, 'cwd', { 
                value: () => '/custom/directory',
                configurable: true 
            })
            Object.defineProperty(process, 'platform', { 
                value: 'linux',
                configurable: true 
            })
            Object.defineProperty(process, 'getuid', { 
                value: () => 0,
                configurable: true 
            })
            
            mockedExecSync.mockImplementation(() => '')
            
            const options = installerOptionMocks.basic
            const installer = new Installer(options)
            
            expect(installer['options']).toEqual(options)
            expect(installer['context'].isRoot).toBe(true)
        })
        
        test('should detect Bun runtime when available', () => {
            // Mock Bun global
            (global as any).Bun = { version: '1.0.0' }
            
            Object.defineProperty(process, 'cwd', { 
                value: () => '/bun/project',
                configurable: true 
            })
            Object.defineProperty(process, 'platform', { 
                value: 'linux',
                configurable: true 
            })
            Object.defineProperty(process, 'getuid', { 
                value: () => 1000,
                configurable: true 
            })
            
            mockedExecSync.mockImplementation(() => '')
            
            const installer = new Installer()
            
            expect(installer['context'].hasBun).toBe(true)
        })
        
        test('should detect systemd on Linux', () => {
            Object.defineProperty(process, 'platform', { 
                value: 'linux',
                configurable: true 
            })
            Object.defineProperty(process, 'getuid', { 
                value: () => 1000,
                configurable: true 
            })
            
            mockedExecSync.mockImplementation((command: string) => {
                if (command.includes('which systemctl')) return '/bin/systemctl'
                return ''
            })
            
            const installer = new Installer()
            
            expect(installer['context'].hasSystemd).toBe(true)
        })
        
        test('should handle missing systemd gracefully', () => {
            Object.defineProperty(process, 'platform', { 
                value: 'linux',
                configurable: true 
            })
            Object.defineProperty(process, 'getuid', { 
                value: () => 1000,
                configurable: true 
            })
            
            mockedExecSync.mockImplementation(() => {
                throw new Error('systemctl: command not found')
            })
            
            const installer = new Installer()
            
            expect(installer['context'].hasSystemd).toBe(false)
        })
        
        test('should handle Windows environment', () => {
            Object.defineProperty(process, 'cwd', { 
                value: () => 'C:\\windows\\project',
                configurable: true 
            })
            Object.defineProperty(process, 'platform', { 
                value: 'win32',
                configurable: true 
            })
            Object.defineProperty(process, 'getuid', { 
                value: undefined,
                configurable: true 
            })
            
            const installer = new Installer()
            
            expect(installer['context']).toEqual(expect.objectContaining({
                platform: 'win32',
                isRoot: false,
                hasSystemd: false
            }))
        })
        
        test('should handle macOS environment', () => {
            Object.defineProperty(process, 'platform', { 
                value: 'darwin',
                configurable: true 
            })
            Object.defineProperty(process, 'getuid', { 
                value: () => 501,
                configurable: true 
            })
            
            const installer = new Installer()
            
            expect(installer['context']).toEqual(expect.objectContaining({
                platform: 'darwin',
                hasSystemd: false
            }))
        })
    })
    
    describe('check() method', () => {
        test('should return complete system info on Linux with all tools', () => {
            mockedOs.platform.mockReturnValue('linux')
            mockedOs.hostname.mockReturnValue('test-linux')
            
            Object.defineProperty(process, 'version', { 
                value: 'v18.17.0',
                configurable: true 
            })
            Object.defineProperty(process, 'env', { 
                value: {},
                configurable: true 
            })
            
            mockedExecSync.mockImplementation((command: string) => {
                switch (true) {
                    case command.includes('npm --version'):
                        return '9.6.7'
                    case command.includes('git --version'):
                        return 'git version 2.34.1'
                    case command.includes('sudo -n true'):
                        return ''
                    case command.includes('systemctl --version'):
                        return 'systemd 248'
                    default:
                        return ''
                }
            })
            
            const installer = new Installer()
            const systemInfo = installer.check()
            
            installerTestUtils.validateSystemInfo(systemInfo)
            expect(systemInfo).toEqual(expect.objectContaining({
                nodeVersion: 'v18.17.0',
                npmVersion: '9.6.7',
                gitVersion: 'git version 2.34.1',
                platform: 'linux',
                hostname: 'test-linux',
                hasSudo: true,
                hasSystemd: true,
                isLinux: true,
                isWindows: false,
                isMac: false,
                isTermux: false
            }))
        })
        
        test('should handle missing npm gracefully', () => {
            mockedOs.platform.mockReturnValue('linux')
            mockedOs.hostname.mockReturnValue('test-linux')
            
            Object.defineProperty(process, 'version', { 
                value: 'v18.17.0',
                configurable: true 
            })
            
            mockedExecSync.mockImplementation((command: string) => {
                if (command.includes('npm --version')) {
                    throw new Error('npm: command not found')
                }
                if (command.includes('git --version')) {
                    return 'git version 2.34.1'
                }
                if (command.includes('sudo -n true')) {
                    throw new Error('sudo: password required')
                }
                if (command.includes('systemctl --version')) {
                    throw new Error('systemctl: command not found')
                }
                return ''
            })
            
            const installer = new Installer()
            const systemInfo = installer.check()
            
            expect(systemInfo.npmVersion).toBeUndefined()
            expect(systemInfo.gitVersion).toBe('git version 2.34.1')
            expect(systemInfo.hasSudo).toBe(false)
            expect(systemInfo.hasSystemd).toBe(false)
        })
        
        test('should handle missing git gracefully', () => {
            mockedOs.platform.mockReturnValue('linux')
            mockedOs.hostname.mockReturnValue('test-linux')
            
            mockedExecSync.mockImplementation((command: string) => {
                if (command.includes('git --version')) {
                    throw new Error('git: command not found')
                }
                if (command.includes('npm --version')) {
                    return '9.6.7'
                }
                return ''
            })
            
            const installer = new Installer()
            const systemInfo = installer.check()
            
            expect(systemInfo.gitVersion).toBeUndefined()
            expect(systemInfo.npmVersion).toBe('9.6.7')
        })
        
        test('should detect Windows correctly', () => {
            mockedOs.platform.mockReturnValue('win32')
            mockedOs.hostname.mockReturnValue('TEST-WINDOWS')
            
            mockedExecSync.mockImplementation((command: string) => {
                if (command.includes('npm --version')) return '9.6.7'
                if (command.includes('git --version')) return 'git version 2.41.0.windows.1'
                return ''
            })
            
            const installer = new Installer()
            const systemInfo = installer.check()
            
            expect(systemInfo).toEqual(expect.objectContaining({
                platform: 'win32',
                hostname: 'TEST-WINDOWS',
                isWindows: true,
                isLinux: false,
                isMac: false,
                hasSudo: false,
                hasSystemd: false
            }))
        })
        
        test('should detect macOS correctly', () => {
            mockedOs.platform.mockReturnValue('darwin')
            mockedOs.hostname.mockReturnValue('Test-MacBook')
            
            mockedExecSync.mockImplementation((command: string) => {
                if (command.includes('sudo -n true')) return ''
                if (command.includes('npm --version')) return '9.6.7'
                if (command.includes('git --version')) return 'git version 2.39.3 (Apple Git-146)'
                return ''
            })
            
            const installer = new Installer()
            const systemInfo = installer.check()
            
            expect(systemInfo).toEqual(expect.objectContaining({
                platform: 'darwin',
                isMac: true,
                isLinux: false,
                isWindows: false,
                hasSudo: true,
                hasSystemd: false
            }))
        })
        
        test('should detect Termux environment', () => {
            mockedOs.platform.mockReturnValue('linux')
            mockedOs.hostname.mockReturnValue('localhost')
            
            Object.defineProperty(process, 'env', { 
                value: { PREFIX: '/data/data/com.termux/files/usr' },
                configurable: true 
            })
            
            mockedExecSync.mockImplementation(() => {
                throw new Error('Command not found')
            })
            
            const installer = new Installer()
            const systemInfo = installer.check()
            
            expect(systemInfo.isTermux).toBe(true)
            expect(systemInfo.isLinux).toBe(true)
            expect(systemInfo.hasSudo).toBe(false)
            expect(systemInfo.hasSystemd).toBe(false)
        })
        
        test('should handle all tool availability checks failing', () => {
            mockedOs.platform.mockReturnValue('linux')
            mockedOs.hostname.mockReturnValue('minimal-system')
            
            mockedExecSync.mockImplementation(() => {
                throw new Error('Command not found')
            })
            
            const installer = new Installer()
            const systemInfo = installer.check()
            
            expect(systemInfo.npmVersion).toBeUndefined()
            expect(systemInfo.gitVersion).toBeUndefined()
            expect(systemInfo.hasSudo).toBe(false)
            expect(systemInfo.hasSystemd).toBe(false)
            expect(systemInfo.isLinux).toBe(true)
        })
    })
    
    describe('detect() method', () => {
        test('should detect existing air.json configuration', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(airConfigMocks.development))
            mockedPath.join.mockReturnValue('/test/root/air.json')
            
            const installer = new Installer()
            const config = installer.detect('/test/root')
            
            expect(config).toEqual(airConfigMocks.development)
            expect(mockedPath.join).toHaveBeenCalledWith('/test/root', 'air.json')
            expect(mockedFs.existsSync).toHaveBeenCalledWith('/test/root/air.json')
            expect(mockedFs.readFileSync).toHaveBeenCalledWith('/test/root/air.json', 'utf8')
        })
        
        test('should return null when air.json does not exist', () => {
            mockedFs.existsSync.mockReturnValue(false)
            mockedPath.join.mockReturnValue('/test/root/air.json')
            
            const installer = new Installer()
            const config = installer.detect('/test/root')
            
            expect(config).toBeNull()
            expect(mockedFs.readFileSync).not.toHaveBeenCalled()
        })
        
        test('should handle corrupted air.json gracefully', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('{ invalid json')
            mockedPath.join.mockReturnValue('/test/root/air.json')
            
            const installer = new Installer()
            const config = installer.detect('/test/root')
            
            expect(config).toBeNull()
        })
        
        test('should handle file read errors gracefully', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockImplementation(() => {
                throw new Error('EACCES: permission denied')
            })
            mockedPath.join.mockReturnValue('/test/root/air.json')
            
            const installer = new Installer()
            const config = installer.detect('/test/root')
            
            expect(config).toBeNull()
        })
        
        test('should detect production configuration', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(airConfigMocks.production))
            mockedPath.join.mockReturnValue('/opt/air/air.json')
            
            const installer = new Installer()
            const config = installer.detect('/opt/air')
            
            expect(config).toEqual(airConfigMocks.production)
            expect(config!.env).toBe('production')
            expect((config as any)!.production.godaddy).toBeDefined()
        })
        
        test('should handle empty air.json file', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('{}')
            
            const installer = new Installer()
            const config = installer.detect('/test/root')
            
            expect(config).toEqual({})
        })
        
        test('should work with different root paths', () => {
            const testPaths = [
                '/home/user/project',
                '/opt/air',
                'C:\\Program Files\\Air',
                '/data/data/com.termux/files/home/air'
            ]
            
            testPaths.forEach((rootPath, index) => {
                mockedFs.existsSync.mockReturnValue(true)
                mockedFs.readFileSync.mockReturnValue(JSON.stringify({ name: `test-${index}` }))
                mockedPath.join.mockReturnValue(`${rootPath}/air.json`)
                
                const installer = new Installer()
                const config = installer.detect(rootPath)
                
                expect(config).toEqual({ name: `test-${index}` })
                expect(mockedPath.join).toHaveBeenCalledWith(rootPath, 'air.json')
            })
        })
    })
    
    describe('configure() method', () => {
        test('should generate development configuration with minimal options', () => {
            Object.defineProperty(process, 'cwd', { 
                value: () => '/current/directory',
                configurable: true 
            })
            Object.defineProperty(process, 'env', { 
                value: { SHELL: '/bin/bash' },
                configurable: true 
            })
            
            const installer = new Installer()
            const config = installer.configure({})
            
            installerTestUtils.validateAirConfig(config)
            expect(config).toEqual(expect.objectContaining({
                root: '/current/directory',
                bash: '/bin/bash',
                env: 'development',
                name: 'air',
                sync: undefined
            }))
            
            expect(config.development).toEqual({
                domain: 'localhost',
                port: 8765,
                peers: []
            })
        })
        
        test('should generate production configuration with custom options', () => {
            const options = {
                name: 'prod-air',
                env: 'production',
                root: '/opt/air',
                bash: '/bin/zsh',
                domain: 'mysite.com',
                port: 9000,
                sync: 'wss://sync.mysite.com/gun',
                godaddy: {
                    domain: 'mysite.com',
                    host: '@',
                    key: 'prod-key',
                    secret: 'prod-secret'
                }
            }
            
            const installer = new Installer()
            const config = installer.configure(options)
            
            expect(config).toEqual(expect.objectContaining({
                root: '/opt/air',
                bash: '/bin/zsh',
                env: 'production',
                name: 'prod-air',
                sync: 'wss://sync.mysite.com/gun'
            }))
            
            expect(config.production).toEqual(expect.objectContaining({
                domain: 'mysite.com',
                port: 9000,
                godaddy: options.godaddy
            }))
        })
        
        test('should use fallback values when environment is not set', () => {
            Object.defineProperty(process, 'cwd', { 
                value: () => '/fallback',
                configurable: true 
            })
            Object.defineProperty(process, 'env', { 
                value: { SHELL: undefined },
                configurable: true 
            })
            
            const installer = new Installer()
            const config = installer.configure({})
            
            expect(config.root).toBe('/fallback')
            expect(config.bash).toBe('/bin/bash')
            expect(config.env).toBe('development')
        })
        
        test('should not add GoDaddy config in development environment', () => {
            const options = {
                env: 'development',
                godaddy: {
                    domain: 'test.com',
                    host: '@',
                    key: 'test-key',
                    secret: 'test-secret'
                }
            }
            
            const installer = new Installer()
            const config = installer.configure(options)
            
            expect((config as any).development.godaddy).toBeUndefined()
            expect((config as any).production.godaddy).toBeUndefined()
        })
        
        test('should include IP configuration by default', () => {
            const installer = new Installer()
            const config = installer.configure({})
            
            expect(config.ip).toEqual({
                timeout: 5000,
                dnsTimeout: 2000,
                userAgent: 'Air/2.0',
                dns: [
                    { hostname: 'resolver1.opendns.com', resolver: 'myip.opendns.com' },
                    { hostname: '8.8.8.8', resolver: 'o-o.myaddr.l.google.com' }
                ],
                http: [
                    { url: 'https://icanhazip.com', format: 'text' },
                    { url: 'https://api.ipify.org', format: 'text' }
                ]
            })
        })
        
        test('should handle custom domain and port for development', () => {
            const options = {
                env: 'development',
                domain: 'dev.local',
                port: 3000
            }
            
            const installer = new Installer()
            const config = installer.configure(options)
            
            expect(config.development).toEqual({
                domain: 'dev.local',
                port: 3000,
                peers: []
            })
        })
        
        test('should handle custom domain and port for production', () => {
            const options = {
                env: 'production',
                domain: 'prod.example.com',
                port: 8080
            }
            
            const installer = new Installer()
            const config = installer.configure(options)
            
            expect(config.production).toEqual({
                domain: 'prod.example.com',
                port: 8080,
                peers: []
            })
        })
        
        test('should use default domains when not specified', () => {
            const installer = new Installer()
            
            const devConfig = installer.configure({ env: 'development' })
            expect((devConfig as any).development.domain).toBe('localhost')
            
            const prodConfig = installer.configure({ env: 'production' })
            expect((prodConfig as any).production.domain).toBe('example.com')
        })
        
        test('should handle Windows-style paths', () => {
            const options = {
                root: 'C:\\Air\\Project',
                bash: 'C:\\Windows\\System32\\cmd.exe'
            }
            
            const installer = new Installer()
            const config = installer.configure(options)
            
            expect(config.root).toBe('C:\\Air\\Project')
            expect(config.bash).toBe('C:\\Windows\\System32\\cmd.exe')
        })
    })
    
    describe('Integration Tests', () => {
        test('should handle complete installation workflow', () => {
            // Setup complete environment
            Object.defineProperty(process, 'cwd', { 
                value: () => '/project/root',
                configurable: true 
            })
            Object.defineProperty(process, 'platform', { 
                value: 'linux',
                configurable: true 
            })
            Object.defineProperty(process, 'getuid', { 
                value: () => 1000,
                configurable: true 
            })
            Object.defineProperty(process, 'env', { 
                value: { SHELL: '/bin/bash' },
                configurable: true 
            })
            
            mockedOs.platform.mockReturnValue('linux')
            mockedOs.hostname.mockReturnValue('test-server')
            
            mockedExecSync.mockImplementation((command: string) => {
                if (command.includes('which systemctl')) return '/bin/systemctl'
                if (command.includes('npm --version')) return '9.6.7'
                if (command.includes('git --version')) return 'git version 2.34.1'
                if (command.includes('sudo -n true')) return ''
                if (command.includes('systemctl --version')) return 'systemd 248'
                return ''
            })
            
            // No existing config
            mockedFs.existsSync.mockReturnValue(false)
            mockedPath.join.mockReturnValue('/project/root/air.json')
            
            const installer = new Installer({ name: 'integration-test', env: 'production' })
            
            // Check system
            const systemInfo = installer.check()
            expect(systemInfo.hasSystemd).toBe(true)
            expect(systemInfo.hasSudo).toBe(true)
            
            // Detect existing config
            const existingConfig = installer.detect('/project/root')
            expect(existingConfig).toBeNull()
            
            // Generate new config
            const newConfig = installer.configure({
                name: 'integration-test',
                env: 'production',
                domain: 'test.example.com'
            })
            
            expect(newConfig.name).toBe('integration-test')
            expect(newConfig.env).toBe('production')
            expect((newConfig as any).production.domain).toBe('test.example.com')
        })
        
        test('should handle existing installation detection', () => {
            // Setup existing installation
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'existing-installation',
                env: 'production',
                root: '/opt/air'
            }))
            
            const installer = new Installer()
            const existingConfig = installer.detect('/opt/air')
            
            expect(existingConfig).toEqual(expect.objectContaining({
                name: 'existing-installation',
                env: 'production',
                root: '/opt/air'
            }))
        })
        
        test('should handle different system environments', () => {
            const environments = [
                {
                    platform: 'linux',
                    hasSystemd: true,
                    hasSudo: true,
                    expectedFeatures: { systemd: true, sudo: true }
                },
                {
                    platform: 'win32', 
                    hasSystemd: false,
                    hasSudo: false,
                    expectedFeatures: { systemd: false, sudo: false }
                },
                {
                    platform: 'darwin',
                    hasSystemd: false,
                    hasSudo: true,
                    expectedFeatures: { systemd: false, sudo: true }
                }
            ]
            
            environments.forEach(({ platform, hasSystemd, hasSudo, expectedFeatures }) => {
                mockedOs.platform.mockReturnValue(platform as NodeJS.Platform)
                
                mockedExecSync.mockImplementation((command: string) => {
                    if (command.includes('sudo -n true') && !hasSudo) {
                        throw new Error('sudo not available')
                    }
                    if (command.includes('systemctl --version') && !hasSystemd) {
                        throw new Error('systemctl not available')
                    }
                    return 'success'
                })
                
                const installer = new Installer()
                const systemInfo = installer.check()
                
                expect(systemInfo.hasSystemd).toBe(expectedFeatures.systemd)
                expect(systemInfo.hasSudo).toBe(expectedFeatures.sudo)
                expect(systemInfo.platform).toBe(platform)
            })
        })
        
        test('should maintain consistency between methods', () => {
            // Setup consistent environment
            const projectRoot = '/consistent/project'
            
            Object.defineProperty(process, 'cwd', { 
                value: () => projectRoot,
                configurable: true 
            })
            
            mockedPath.join.mockImplementation((...paths) => paths.join('/'))
            
            const installer = new Installer({ name: 'consistent-test' })
            
            // Check that all methods work with same context
            expect(installer['context'].rootDir).toBe(projectRoot)
            
            const config = installer.configure({ root: projectRoot })
            expect(config.root).toBe(projectRoot)
            
            mockedFs.existsSync.mockReturnValue(false)
            const detection = installer.detect(projectRoot)
            expect(detection).toBeNull()
            expect(mockedPath.join).toHaveBeenCalledWith(projectRoot, 'air.json')
        })
    })

    describe('save()', () => {
        test('should save configuration to file', () => {
            const installer = new Installer()
            const config = airConfigMocks.default
            
            mockedFs.mkdirSync.mockImplementation(() => undefined)
            mockedFs.writeFileSync.mockImplementation(() => undefined)
            mockedPath.join.mockReturnValue('/project/air.json')
            mockedPath.dirname.mockReturnValue('/project')
            
            installer.save(config)
            
            expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/project', { recursive: true })
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                '/project/air.json',
                JSON.stringify(config, null, 2)
            )
        })

        test('should handle save errors', () => {
            const installer = new Installer()
            const config = airConfigMocks.default
            
            mockedFs.mkdirSync.mockImplementation(() => {
                throw new Error('Permission denied')
            })
            mockedPath.join.mockReturnValue('/protected/air.json')
            mockedPath.dirname.mockReturnValue('/protected')
            
            expect(() => installer.save(config)).toThrow('Permission denied')
        })
    })

    describe('ssl()', () => {
        test('should setup SSL with valid config', async () => {
            const mockStrategy = new MockPlatformStrategy(platformMockResults.success)
            mockedPlatform.getInstance.mockReturnValue({
                setupSSL: mockStrategy.setupSSL.bind(mockStrategy)
            } as any)
            
            const installer = new Installer()
            const config = airConfigMocks.withSSL
            
            const result = await installer.ssl(config)
            
            expect(result).toBe(true)
            expect(config.ssl).toEqual({
                key: '/ssl/key.pem',
                cert: '/ssl/cert.pem'
            })
        })

        test('should return false when SSL setup fails', async () => {
            const mockStrategy = new MockPlatformStrategy(platformMockResults.failure)
            mockedPlatform.getInstance.mockReturnValue({
                setupSSL: mockStrategy.setupSSL.bind(mockStrategy)
            } as any)
            
            const installer = new Installer()
            const config = airConfigMocks.withSSL
            
            const result = await installer.ssl(config)
            
            expect(result).toBe(false)
        })

        test('should handle SSL config without ssl property', async () => {
            const mockStrategy = new MockPlatformStrategy(platformMockResults.success)
            mockedPlatform.getInstance.mockReturnValue({
                setupSSL: mockStrategy.setupSSL.bind(mockStrategy)
            } as any)
            
            const installer = new Installer()
            const config = airConfigMocks.default
            
            const result = await installer.ssl(config)
            
            expect(result).toBe(true)
        })
    })

    describe('service()', () => {
        test('should create service with systemd', async () => {
            const mockStrategy = new MockPlatformStrategy(platformMockResults.success)
            mockedPlatform.getInstance.mockReturnValue({
                createService: mockStrategy.createService.bind(mockStrategy)
            } as any)
            
            const installer = new Installer()
            const config = airConfigMocks.default
            
            const result = await installer.service(config)
            
            expect(result.created).toBe(true)
            expect(result.enabled).toBe(true)
        })

        test('should handle Windows platform', async () => {
            const mockStrategy = new MockPlatformStrategy(platformMockResults.windows)
            mockedPlatform.getInstance.mockReturnValue({
                createService: mockStrategy.createService.bind(mockStrategy)
            } as any)
            
            const installer = new Installer()
            const config = airConfigMocks.default
            
            const result = await installer.service(config)
            
            expect(result.created).toBe(true)
            expect(result.enabled).toBe(true)
        })

        test('should handle service creation errors', async () => {
            const mockStrategy = new MockPlatformStrategy(platformMockResults.failure)
            mockedPlatform.getInstance.mockReturnValue({
                createService: mockStrategy.createService.bind(mockStrategy)
            } as any)
            
            const installer = new Installer()
            const config = airConfigMocks.default
            
            const result = await installer.service(config)
            
            expect(result.created).toBe(false)
            expect(result.enabled).toBe(false)
            expect(result.error).toContain('Permission denied')
        })
    })

    describe('start()', () => {
        test('should start service successfully', async () => {
            const mockStrategy = new MockPlatformStrategy(platformMockResults.success)
            mockedPlatform.getInstance.mockReturnValue({
                startService: mockStrategy.startService.bind(mockStrategy)
            } as any)
            
            const installer = new Installer()
            const config = airConfigMocks.default
            
            const result = await installer.start(config)
            
            expect(result.started).toBe(true)
            expect(result.pid).toBe(12345)
        })

        test('should handle fallback start method', async () => {
            const mockStrategy = new MockPlatformStrategy(platformMockResults.noSystemd)
            mockedPlatform.getInstance.mockReturnValue({
                startService: mockStrategy.startService.bind(mockStrategy)
            } as any)
            
            const installer = new Installer()
            const config = airConfigMocks.default
            
            const result = await installer.start(config)
            
            expect(result.started).toBe(true)
        })

        test('should handle start failures', async () => {
            const mockStrategy = new MockPlatformStrategy(platformMockResults.failure)
            mockedPlatform.getInstance.mockReturnValue({
                startService: mockStrategy.startService.bind(mockStrategy)
            } as any)
            
            const installer = new Installer()
            const config = airConfigMocks.default
            
            const result = await installer.start(config)
            
            expect(result.started).toBe(false)
            expect(result.error).toContain('Service not found')
        })
    })
})