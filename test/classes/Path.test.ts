/**
 * Path Module Tests - System Phase
 * Tests all 5 Path methods with comprehensive coverage
 */

import Path from '../../src/Path/index.js'
import { TestSetup } from '../shared/testSetup.js'
import { pathStateMocks, airConfigMocks } from '../mocks/pathMocks.js'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'

// Mock modules
jest.mock('os')
jest.mock('fs')
jest.mock('path')

const mockedOs = os as jest.Mocked<typeof os>
const mockedFs = fs as jest.Mocked<typeof fs>
const mockedPath = path as jest.Mocked<typeof path>

describe('Path Module', () => {
    let testSetup: TestSetup
    
    beforeEach(() => {
        testSetup = new TestSetup('path-test')
        
        // Mock process
        originalProcess = process
        
        // Reset all mocks
        jest.clearAllMocks()
        
        // Setup default mocks
        mockedPath.resolve.mockImplementation((pathStr: string) => {
            if (path.isAbsolute(pathStr)) return pathStr
            return `/current/working/directory/${pathStr}`
        })
        mockedPath.join.mockImplementation((...paths: string[]) => {
            return paths.join('/')
        })
        mockedPath.isAbsolute.mockImplementation((pathStr: string) => {
            return pathStr.startsWith('/') || /^[A-Za-z]:/.test(pathStr)
        })
    })
    
    afterEach(() => {
        testSetup.cleanup()
    })
    
    describe('state management', () => {
        test('should initialize with correct default state', () => {
            mockedOs.platform.mockReturnValue('linux')
            mockedOs.homedir.mockReturnValue('/home/testuser')
            mockedOs.tmpdir.mockReturnValue('/tmp')
            
            // Re-import to trigger initialization
            jest.resetModules()
            const { state } = require('../../src/Path/state.js')
            
            expect(state).toEqual(expect.objectContaining({
                platform: 'linux',
                homedir: '/home/testuser',
                tmpdir: '/tmp',
                cache: {},
                airConfig: null
            }))
        })
        
        test('should load air.json configuration when available', () => {
            mockedOs.platform.mockReturnValue('linux')
            mockedOs.homedir.mockReturnValue('/home/testuser')
            mockedOs.tmpdir.mockReturnValue('/tmp')
            
            // Mock process.cwd and fs operations
            Object.defineProperty(process, 'cwd', {
                value: () => '/test/directory',
                configurable: true
            })
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(airConfigMocks.valid.complete))
            
            // Re-import to trigger initialization
            jest.resetModules()
            const { state } = require('../../src/Path/state.js')
            
            expect(state.airConfig).toEqual(airConfigMocks.valid.complete)
        })
        
        test('should handle air.json loading from environment variable', () => {
            Object.defineProperty(process, 'env', {
                value: { AIR_CONFIG: '/env/path/air.json' },
                configurable: true
            })
            
            mockedFs.existsSync.mockImplementation((filePath: any) => {
                return filePath === '/env/path/air.json'
            })
            mockedFs.readFileSync.mockImplementation((filePath: any) => {
                if (filePath === '/env/path/air.json') {
                    return JSON.stringify(airConfigMocks.valid.withRoot)
                }
                throw new Error('ENOENT')
            })
            
            jest.resetModules()
            const { state } = require('../../src/Path/state.js')
            
            expect(state.airConfig).toEqual(airConfigMocks.valid.withRoot)
        })
        
        test('should handle missing air.json gracefully', () => {
            mockedFs.existsSync.mockReturnValue(false)
            
            jest.resetModules()
            const { state } = require('../../src/Path/state.js')
            
            expect(state.airConfig).toBeNull()
        })
        
        test('should handle corrupted air.json gracefully', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('{ invalid json')
            
            jest.resetModules()
            const { state } = require('../../src/Path/state.js')
            
            expect(state.airConfig).toBeNull()
        })
        
        test('should handle different platforms correctly', () => {
            const testPlatforms = [
                { platform: 'linux', homedir: '/home/user', tmpdir: '/tmp' },
                { platform: 'win32', homedir: 'C:\\Users\\user', tmpdir: 'C:\\Windows\\Temp' },
                { platform: 'darwin', homedir: '/Users/user', tmpdir: '/tmp' }
            ]
            
            testPlatforms.forEach(({ platform, homedir, tmpdir }) => {
                mockedOs.platform.mockReturnValue(platform as NodeJS.Platform)
                mockedOs.homedir.mockReturnValue(homedir)
                mockedOs.tmpdir.mockReturnValue(tmpdir)
                
                jest.resetModules()
                const { state } = require('../../src/Path/state.js')
                
                expect(state.platform).toBe(platform)
                expect(state.homedir).toBe(homedir)
                expect(state.tmpdir).toBe(tmpdir)
            })
        })
    })
    
    describe('root() method', () => {
        test('should return configured root path when available', () => {
            // Mock state with configuration
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.linuxWithConfig
            }))
            
            mockedPath.resolve.mockReturnValue('/custom/root/path')
            
            const { root } = require('../../src/Path/root.js')
            const result = root()
            
            expect(result).toBe('/custom/root/path')
            expect(mockedPath.resolve).toHaveBeenCalledWith('/custom/root/path')
        })
        
        test('should return current working directory when no config', () => {
            // Mock state without configuration
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.linux
            }))
            
            Object.defineProperty(process, 'cwd', {
                value: () => '/current/working/directory',
                configurable: true
            })
            
            const { root } = require('../../src/Path/root.js')
            const result = root()
            
            expect(result).toBe('/current/working/directory')
        })
        
        test('should resolve relative paths correctly', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: {
                    ...pathStateMocks.linux,
                    airConfig: airConfigMocks.valid.relativePaths
                }
            }))
            
            mockedPath.resolve.mockReturnValue('/resolved/relative/root')
            
            const { root } = require('../../src/Path/root.js')
            const result = root()
            
            expect(result).toBe('/resolved/relative/root')
            expect(mockedPath.resolve).toHaveBeenCalledWith('./relative/root')
        })
        
        test('should handle Windows paths correctly', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.windowsWithConfig
            }))
            
            mockedPath.resolve.mockReturnValue('C:\\custom\\root')
            
            const { root } = require('../../src/Path/root.js')
            const result = root()
            
            expect(result).toBe('C:\\custom\\root')
        })
        
        test('should handle null/undefined config gracefully', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: {
                    ...pathStateMocks.linux,
                    airConfig: { name: 'test', root: null }
                }
            }))
            
            Object.defineProperty(process, 'cwd', {
                value: () => '/fallback/cwd',
                configurable: true
            })
            
            const { root } = require('../../src/Path/root.js')
            const result = root()
            
            expect(result).toBe('/fallback/cwd')
        })
    })
    
    describe('bash() method', () => {
        test('should return configured bash path when available', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.linuxWithConfig
            }))
            
            mockedPath.resolve.mockReturnValue('/custom/script/path')
            
            const { bash } = require('../../src/Path/bash.js')
            const result = bash()
            
            expect(result).toBe('/custom/script/path')
            expect(mockedPath.resolve).toHaveBeenCalledWith('/custom/script/path')
        })
        
        test('should return default script directory when no config', () => {
            // Mock root method
            jest.doMock('../../src/Path/root.js', () => ({
                root: () => '/current/working/directory'
            }))
            
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.linux
            }))
            
            mockedPath.join.mockReturnValue('/current/working/directory/script')
            
            const { bash } = require('../../src/Path/bash.js')
            const result = bash()
            
            expect(result).toBe('/current/working/directory/script')
            expect(mockedPath.join).toHaveBeenCalledWith('/current/working/directory', 'script')
        })
        
        test('should resolve relative bash paths correctly', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: {
                    ...pathStateMocks.linux,
                    airConfig: airConfigMocks.valid.relativePaths
                }
            }))
            
            mockedPath.resolve.mockReturnValue('/resolved/relative/scripts')
            
            const { bash } = require('../../src/Path/bash.js')
            const result = bash()
            
            expect(result).toBe('/resolved/relative/scripts')
            expect(mockedPath.resolve).toHaveBeenCalledWith('./relative/scripts')
        })
        
        test('should handle Windows bash paths correctly', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.windowsWithConfig
            }))
            
            mockedPath.resolve.mockReturnValue('C:\\custom\\scripts')
            
            const { bash } = require('../../src/Path/bash.js')
            const result = bash()
            
            expect(result).toBe('C:\\custom\\scripts')
        })
        
        test('should use root + script when bash config is missing', () => {
            jest.doMock('../../src/Path/root.js', () => ({
                root: () => '/custom/root'
            }))
            
            jest.doMock('../../src/Path/state.js', () => ({
                state: {
                    ...pathStateMocks.linux,
                    airConfig: airConfigMocks.valid.withRoot // Has root but no bash
                }
            }))
            
            mockedPath.join.mockReturnValue('/custom/root/script')
            
            const { bash } = require('../../src/Path/bash.js')
            const result = bash()
            
            expect(result).toBe('/custom/root/script')
        })
    })
    
    describe('tmp() method', () => {
        test('should return temp directory without filename', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.linux
            }))
            
            const { tmp } = require('../../src/Path/tmp.js')
            const result = tmp()
            
            expect(result).toBe('/tmp')
        })
        
        test('should return temp directory with filename', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.linux
            }))
            
            mockedPath.join.mockReturnValue('/tmp/test.log')
            
            const { tmp } = require('../../src/Path/tmp.js')
            const result = tmp('test.log')
            
            expect(result).toBe('/tmp/test.log')
            expect(mockedPath.join).toHaveBeenCalledWith('/tmp', 'test.log')
        })
        
        test('should handle null filename parameter', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.linux
            }))
            
            const { tmp } = require('../../src/Path/tmp.js')
            const result = tmp(null)
            
            expect(result).toBe('/tmp')
        })
        
        test('should handle empty filename parameter', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.linux
            }))
            
            mockedPath.join.mockReturnValue('/tmp/')
            
            const { tmp } = require('../../src/Path/tmp.js')
            const result = tmp('')
            
            expect(result).toBe('/tmp/')
        })
        
        test('should handle Windows temp directory', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.windows
            }))
            
            mockedPath.join.mockReturnValue('C:\\Windows\\Temp\\test.txt')
            
            const { tmp } = require('../../src/Path/tmp.js')
            const result = tmp('test.txt')
            
            expect(result).toBe('C:\\Windows\\Temp\\test.txt')
        })
        
        test('should fallback to /tmp when tmpdir is null', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: {
                    ...pathStateMocks.linux,
                    tmpdir: null
                }
            }))
            
            const { tmp } = require('../../src/Path/tmp.js')
            const result = tmp()
            
            expect(result).toBe('/tmp')
        })
        
        test('should handle nested filenames', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: pathStateMocks.linux
            }))
            
            mockedPath.join.mockReturnValue('/tmp/subdir/nested.log')
            
            const { tmp } = require('../../src/Path/tmp.js')
            const result = tmp('subdir/nested.log')
            
            expect(result).toBe('/tmp/subdir/nested.log')
            expect(mockedPath.join).toHaveBeenCalledWith('/tmp', 'subdir/nested.log')
        })
    })
    
    describe('getpaths() method', () => {
        test('should return complete paths configuration with defaults', () => {
            // Mock dependencies
            jest.doMock('../../src/Path/root.js', () => ({
                root: () => '/current/working/directory'
            }))
            
            jest.doMock('../../src/Path/bash.js', () => ({
                bash: () => '/current/working/directory/script'
            }))
            
            mockedPath.join
                .mockReturnValueOnce('/current/working/directory/air.json')
                .mockReturnValueOnce('/current/working/directory/logs')
            
            const { getpaths } = require('../../src/Path/getpaths.js')
            const result = getpaths()
            
            expect(result).toEqual({
                root: '/current/working/directory',
                bash: '/current/working/directory/script',
                config: '/current/working/directory/air.json',
                logs: '/current/working/directory/logs'
            })
        })
        
        test('should use provided root argument', () => {
            jest.doMock('../../src/Path/bash.js', () => ({
                bash: () => '/default/bash'
            }))
            
            mockedPath.resolve.mockReturnValue('/custom/root/path')
            mockedPath.join
                .mockReturnValueOnce('/custom/root/path/air.json')
                .mockReturnValueOnce('/custom/root/path/logs')
            
            const { getpaths } = require('../../src/Path/getpaths.js')
            const result = getpaths('/custom/root/path')
            
            expect(result.root).toBe('/custom/root/path')
            expect(result.config).toBe('/custom/root/path/air.json')
            expect(result.logs).toBe('/custom/root/path/logs')
            expect(mockedPath.resolve).toHaveBeenCalledWith('/custom/root/path')
        })
        
        test('should use provided bash argument', () => {
            jest.doMock('../../src/Path/root.js', () => ({
                root: () => '/default/root'
            }))
            
            mockedPath.resolve
                .mockReturnValueOnce('/default/root')
                .mockReturnValueOnce('/custom/bash/path')
            
            mockedPath.join
                .mockReturnValueOnce('/default/root/air.json')
                .mockReturnValueOnce('/default/root/logs')
            
            const { getpaths } = require('../../src/Path/getpaths.js')
            const result = getpaths(undefined, '/custom/bash/path')
            
            expect(result.bash).toBe('/custom/bash/path')
            expect(mockedPath.resolve).toHaveBeenCalledWith('/custom/bash/path')
        })
        
        test('should use both custom root and bash arguments', () => {
            mockedPath.resolve
                .mockReturnValueOnce('/custom/root')
                .mockReturnValueOnce('/custom/bash')
            
            mockedPath.join
                .mockReturnValueOnce('/custom/root/air.json')
                .mockReturnValueOnce('/custom/root/logs')
            
            const { getpaths } = require('../../src/Path/getpaths.js')
            const result = getpaths('/custom/root', '/custom/bash')
            
            expect(result).toEqual({
                root: '/custom/root',
                bash: '/custom/bash',
                config: '/custom/root/air.json',
                logs: '/custom/root/logs'
            })
        })
        
        test('should handle relative paths in arguments', () => {
            mockedPath.resolve
                .mockReturnValueOnce('/resolved/relative/root')
                .mockReturnValueOnce('/resolved/relative/bash')
            
            mockedPath.join
                .mockReturnValueOnce('/resolved/relative/root/air.json')
                .mockReturnValueOnce('/resolved/relative/root/logs')
            
            const { getpaths } = require('../../src/Path/getpaths.js')
            const result = getpaths('./relative/root', './relative/bash')
            
            expect(result.root).toBe('/resolved/relative/root')
            expect(result.bash).toBe('/resolved/relative/bash')
        })
        
        test('should handle Windows paths correctly', () => {
            mockedPath.resolve
                .mockReturnValueOnce('C:\\custom\\root')
                .mockReturnValueOnce('C:\\custom\\bash')
            
            mockedPath.join
                .mockReturnValueOnce('C:\\custom\\root\\air.json')
                .mockReturnValueOnce('C:\\custom\\root\\logs')
            
            const { getpaths } = require('../../src/Path/getpaths.js')
            const result = getpaths('C:\\custom\\root', 'C:\\custom\\bash')
            
            expect(result).toEqual({
                root: 'C:\\custom\\root',
                bash: 'C:\\custom\\bash',
                config: 'C:\\custom\\root\\air.json',
                logs: 'C:\\custom\\root\\logs'
            })
        })
        
        test('should always use root for config and logs paths', () => {
            mockedPath.resolve
                .mockReturnValueOnce('/root1')
                .mockReturnValueOnce('/root2/bash')
            
            mockedPath.join
                .mockReturnValueOnce('/root1/air.json')   // config uses root, not bash
                .mockReturnValueOnce('/root1/logs')       // logs uses root, not bash
            
            const { getpaths } = require('../../src/Path/getpaths.js')
            const result = getpaths('/root1', '/root2/bash')
            
            expect(result.config).toBe('/root1/air.json')
            expect(result.logs).toBe('/root1/logs')
            expect(result.config).not.toContain('/root2')
            expect(result.logs).not.toContain('/root2')
        })
    })
    
    describe('Integration Tests', () => {
        test('should handle complete path resolution workflow', () => {
            // Setup complete mock environment
            mockedOs.platform.mockReturnValue('linux')
            mockedOs.homedir.mockReturnValue('/home/testuser')
            mockedOs.tmpdir.mockReturnValue('/tmp')
            
            Object.defineProperty(process, 'cwd', {
                value: () => '/project/root',
                configurable: true
            })
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'integration-test',
                root: '/custom/project/root',
                bash: '/custom/scripts'
            }))
            
            mockedPath.resolve
                .mockReturnValueOnce('/custom/project/root')
                .mockReturnValueOnce('/custom/scripts')
            
            mockedPath.join
                .mockReturnValueOnce('/tmp/test.log')
                .mockReturnValueOnce('/custom/project/root/air.json')
                .mockReturnValueOnce('/custom/project/root/logs')
            
            // Re-import modules to trigger initialization
            jest.resetModules()
            const { state } = require('../../src/Path/state.js')
            const { root } = require('../../src/Path/root.js')
            const { bash } = require('../../src/Path/bash.js')
            const { tmp } = require('../../src/Path/tmp.js')
            const { getpaths } = require('../../src/Path/getpaths.js')
            
            // Test all methods work together
            expect(state.airConfig.name).toBe('integration-test')
            expect(root()).toBe('/custom/project/root')
            expect(bash()).toBe('/custom/scripts')
            expect(tmp('test.log')).toBe('/tmp/test.log')
            
            const paths = getpaths()
            expect(paths).toEqual({
                root: '/custom/project/root',
                bash: '/custom/scripts',
                config: '/custom/project/root/air.json',
                logs: '/custom/project/root/logs'
            })
        })
        
        test('should handle cross-platform compatibility', () => {
            const testScenarios = [
                {
                    platform: 'linux',
                    homedir: '/home/user',
                    tmpdir: '/tmp',
                    expectedTmp: '/tmp/test.log'
                },
                {
                    platform: 'win32',
                    homedir: 'C:\\Users\\user',
                    tmpdir: 'C:\\Windows\\Temp',
                    expectedTmp: 'C:\\Windows\\Temp\\test.log'
                },
                {
                    platform: 'darwin',
                    homedir: '/Users/user',
                    tmpdir: '/tmp',
                    expectedTmp: '/tmp/test.log'
                }
            ]
            
            testScenarios.forEach(({ platform, homedir, tmpdir, expectedTmp }) => {
                mockedOs.platform.mockReturnValue(platform as NodeJS.Platform)
                mockedOs.homedir.mockReturnValue(homedir)
                mockedOs.tmpdir.mockReturnValue(tmpdir)
                
                mockedPath.join.mockReturnValue(expectedTmp)
                
                jest.resetModules()
                const { state } = require('../../src/Path/state.js')
                const { tmp } = require('../../src/Path/tmp.js')
                
                expect(state.platform).toBe(platform)
                expect(state.homedir).toBe(homedir)
                expect(state.tmpdir).toBe(tmpdir)
                expect(tmp('test.log')).toBe(expectedTmp)
            })
        })
        
        test('should handle configuration priority correctly', () => {
            // Test priority: AIR_CONFIG env > cwd/air.json > defaults
            Object.defineProperty(process, 'env', {
                value: { AIR_CONFIG: '/priority/env/air.json' },
                configurable: true
            })
            
            Object.defineProperty(process, 'cwd', {
                value: () => '/priority/cwd',
                configurable: true
            })
            
            let callCount = 0
            mockedFs.existsSync.mockImplementation((filePath: any) => {
                callCount++
                // First call is for cwd/air.json (should be skipped)
                // Second call is for env AIR_CONFIG (should succeed)
                return filePath === '/priority/env/air.json'
            })
            
            mockedFs.readFileSync.mockImplementation((filePath: any) => {
                if (filePath === '/priority/env/air.json') {
                    return JSON.stringify({ name: 'env-config', root: '/env/root' })
                }
                throw new Error('Should not read other configs')
            })
            
            jest.resetModules()
            const { state } = require('../../src/Path/state.js')
            
            expect(state.airConfig.name).toBe('env-config')
            expect(state.airConfig.root).toBe('/env/root')
        })
        
        test('should handle graceful fallbacks', () => {
            // Test fallback chain when everything fails
            mockedOs.platform.mockReturnValue('linux')
            mockedOs.homedir.mockReturnValue('/home/user')
            mockedOs.tmpdir.mockReturnValue(null as any) // Force fallback
            
            Object.defineProperty(process, 'cwd', {
                value: () => '/fallback/cwd',
                configurable: true
            })
            
            mockedFs.existsSync.mockReturnValue(false) // No config files
            
            mockedPath.resolve.mockImplementation((p) => p)
            mockedPath.join.mockImplementation((...paths) => paths.join('/'))
            
            jest.resetModules()
            const { state } = require('../../src/Path/state.js')
            const { root } = require('../../src/Path/root.js')
            const { bash } = require('../../src/Path/bash.js')
            const { tmp } = require('../../src/Path/tmp.js')
            
            expect(state.airConfig).toBeNull()
            expect(root()).toBe('/fallback/cwd')
            expect(bash()).toBe('/fallback/cwd/script')
            expect(tmp()).toBe('/tmp') // Fallback when tmpdir is null
        })
        
        test('should maintain state consistency across methods', () => {
            // Setup consistent state
            const mockConfig = {
                name: 'consistent-test',
                root: '/consistent/root',
                bash: '/consistent/bash'
            }
            
            jest.doMock('../../src/Path/state.js', () => ({
                state: {
                    platform: 'linux',
                    homedir: '/home/user',
                    tmpdir: '/tmp',
                    cache: {},
                    airConfig: mockConfig
                }
            }))
            
            mockedPath.resolve
                .mockReturnValueOnce('/consistent/root')
                .mockReturnValueOnce('/consistent/bash')
                .mockReturnValueOnce('/consistent/root')
                .mockReturnValueOnce('/consistent/bash')
            
            mockedPath.join
                .mockReturnValueOnce('/tmp/state-test.log')
                .mockReturnValueOnce('/consistent/root/air.json')
                .mockReturnValueOnce('/consistent/root/logs')
            
            // All methods should use the same state
            const { root } = require('../../src/Path/root.js')
            const { bash } = require('../../src/Path/bash.js')
            const { tmp } = require('../../src/Path/tmp.js')
            const { getpaths } = require('../../src/Path/getpaths.js')
            
            expect(root()).toBe('/consistent/root')
            expect(bash()).toBe('/consistent/bash')
            expect(tmp('state-test.log')).toBe('/tmp/state-test.log')
            
            const paths = getpaths()
            expect(paths.root).toBe('/consistent/root')
            expect(paths.bash).toBe('/consistent/bash')
        })
    })
    
    describe('Path Module Default Export', () => {
        test('should export tmp function as default', () => {
            expect(Path).toEqual(expect.objectContaining({
                tmp: expect.any(Function)
            }))
        })
        
        test('should work with default export method', () => {
            jest.doMock('../../src/Path/state.js', () => ({
                state: { tmpdir: '/test/tmp' }
            }))
            
            mockedPath.join.mockReturnValue('/test/tmp/default-test.log')
            
            const result = Path.tmp('default-test.log')
            
            expect(result).toBe('/test/tmp/default-test.log')
        })
    })
})