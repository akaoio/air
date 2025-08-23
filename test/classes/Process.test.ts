/**
 * Process Class Tests - Services Phase  
 * Tests all 7 Process methods with comprehensive coverage
 */

import { Process } from '../../src/Process/index.js'
import { TestSetup } from '../shared/testSetup.js'
import { processMocks, createProcessMockContext, pidFileMocks, childProcessMocks } from '../mocks/processMocks.js'
import fs from 'fs'
import { exec } from 'child_process'

// Mock modules
jest.mock('fs')
jest.mock('child_process')

const mockedFs = fs as jest.Mocked<typeof fs>
const mockedExec = exec as jest.MockedFunction<typeof exec>

describe('Process Class', () => {
    let testSetup: TestSetup
    let testDir: string
    
    beforeEach(() => {
        testSetup = new TestSetup('process-test')
        testDir = testSetup.createTestDir('process')
        jest.clearAllMocks()
    })
    
    afterEach(() => {
        testSetup.cleanup()
    })
    
    describe('Constructor', () => {
        test('should create Process instance with valid parameters', () => {
            const process = new Process('test-peer', testDir)
            
            expect(process).toBeInstanceOf(Process)
            expect(process.name).toBe('test-peer')
            expect(process.root).toBe(testDir)
        })
        
        test('should handle empty name gracefully', () => {
            expect(() => new Process('', testDir)).toThrow('Process name cannot be empty')
        })
        
        test('should handle invalid root directory', () => {
            expect(() => new Process('test', '')).toThrow('Root directory is required')
        })
    })
    
    describe('check() method', () => {
        test('should return true when PID file exists and process is running', () => {
            const pidFile = `${testDir}/.test-peer.pid`
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('12345')
            
            // Mock successful process check
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                callback(null, processMocks.commands.ps.running, '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.check()
            
            expect(result).toBe(true)
            expect(mockedFs.existsSync).toHaveBeenCalledWith(pidFile)
            expect(mockedFs.readFileSync).toHaveBeenCalledWith(pidFile, 'utf8')
        })
        
        test('should return false when PID file does not exist', () => {
            mockedFs.existsSync.mockReturnValue(false)
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.check()
            
            expect(result).toBe(false)
            expect(mockedExec).not.toHaveBeenCalled()
        })
        
        test('should return false when PID file has invalid content', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('not-a-number')
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.check()
            
            expect(result).toBe(false)
        })
        
        test('should return false when process is not running', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('99999')
            
            // Mock process not found
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                callback(null, processMocks.commands.ps.notFound, '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.check()
            
            expect(result).toBe(false)
        })
        
        test('should handle system command errors gracefully', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('12345')
            
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                callback(new Error('Command failed'), '', 'Error output')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.check()
            
            expect(result).toBe(false)
        })
    })
    
    describe('clean() method', () => {
        test('should remove existing PID file', () => {
            const pidFile = `${testDir}/.test-peer.pid`
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            const processManager = new Process('test-peer', testDir)
            processManager.clean()
            
            expect(mockedFs.existsSync).toHaveBeenCalledWith(pidFile)
            expect(mockedFs.unlinkSync).toHaveBeenCalledWith(pidFile)
        })
        
        test('should handle missing PID file gracefully', () => {
            mockedFs.existsSync.mockReturnValue(false)
            
            const processManager = new Process('test-peer', testDir)
            processManager.clean()
            
            expect(mockedFs.unlinkSync).not.toHaveBeenCalled()
        })
        
        test('should handle PID file deletion error', () => {
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.unlinkSync.mockImplementation(() => {
                throw new Error('EACCES: permission denied')
            })
            
            const processManager = new Process('test-peer', testDir)
            
            expect(() => processManager.clean()).toThrow('Failed to clean PID file')
        })
    })
    
    describe('find() method', () => {
        test('should find process using specific port', () => {
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                expect(cmd).toContain('lsof')
                expect(cmd).toContain('8765')
                callback(null, processMocks.commands.lsof.occupied, '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.find(8765)
            
            expect(result).toEqual({
                pid: 12345,
                name: 'node',
                port: 8765,
                user: 'user'
            })
        })
        
        test('should return null when no process found on port', () => {
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                callback(null, processMocks.commands.lsof.empty, '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.find(8765)
            
            expect(result).toBeNull()
        })
        
        test('should handle lsof command error', () => {
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                callback(new Error('lsof: command not found'), '', '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.find(8765)
            
            expect(result).toBeNull()
        })
        
        test('should handle invalid port numbers', () => {
            const processManager = new Process('test-peer', testDir)
            
            expect(() => processManager.find(-1)).toThrow('Invalid port number')
            expect(() => processManager.find(65536)).toThrow('Invalid port number')
        })
    })
    
    describe('getpidfile() method', () => {
        test('should return correct PID file path', () => {
            const processManager = new Process('test-peer', testDir)
            const pidFile = processManager.getpidfile()
            
            expect(pidFile).toBe(`${testDir}/.test-peer.pid`)
        })
        
        test('should handle special characters in name', () => {
            const processManager = new Process('test-peer-special', testDir)
            const pidFile = processManager.getpidfile()
            
            expect(pidFile).toBe(`${testDir}/.test-peer-special.pid`)
        })
    })
    
    describe('isrunning() method', () => {
        test('should return true for running process', () => {
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                expect(cmd).toContain('ps')
                expect(cmd).toContain('12345')
                callback(null, processMocks.commands.ps.running, '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.isrunning(12345)
            
            expect(result).toBe(true)
        })
        
        test('should return false for non-running process', () => {
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                callback(null, processMocks.commands.ps.notFound, '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.isrunning(99999)
            
            expect(result).toBe(false)
        })
        
        test('should handle ps command error', () => {
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                callback(new Error('ps: invalid option'), '', '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.isrunning(12345)
            
            expect(result).toBe(false)
        })
        
        test('should handle invalid PID', () => {
            const processManager = new Process('test-peer', testDir)
            
            expect(() => processManager.isrunning(-1)).toThrow('Invalid PID')
            expect(() => processManager.isrunning(0)).toThrow('Invalid PID')
        })
    })
    
    describe('kill() method', () => {
        test('should kill process successfully', () => {
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                expect(cmd).toContain('kill')
                expect(cmd).toContain('12345')
                callback(null, '', '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.kill(12345)
            
            expect(result).toBe(true)
        })
        
        test('should handle process not found', () => {
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                callback(new Error('kill: (99999): No such process'), '', '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.kill(99999)
            
            expect(result).toBe(false)
        })
        
        test('should handle permission denied', () => {
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                callback(new Error('kill: (1): Operation not permitted'), '', '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.kill(1)
            
            expect(result).toBe(false)
        })
        
        test('should handle graceful kill with SIGTERM first', () => {
            let killSignal = ''
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                killSignal = cmd.includes('-TERM') ? 'TERM' : 'KILL'
                callback(null, '', '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.kill(12345, true) // graceful = true
            
            expect(result).toBe(true)
            expect(killSignal).toBe('TERM')
        })
        
        test('should use SIGKILL for non-graceful kill', () => {
            let killSignal = ''
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                killSignal = cmd.includes('-KILL') ? 'KILL' : 'TERM'
                callback(null, '', '')
            })
            
            const processManager = new Process('test-peer', testDir)
            const result = processManager.kill(12345, false) // graceful = false
            
            expect(result).toBe(true)
            expect(killSignal).toBe('KILL')
        })
        
        test('should handle invalid PID for kill', () => {
            const processManager = new Process('test-peer', testDir)
            
            expect(() => processManager.kill(-1)).toThrow('Invalid PID')
            expect(() => processManager.kill(0)).toThrow('Invalid PID')
        })
    })
    
    describe('Integration Tests', () => {
        test('should handle full process lifecycle', () => {
            const processManager = new Process('test-peer', testDir)
            const pidFile = `${testDir}/.test-peer.pid`
            
            // Initially no process
            mockedFs.existsSync.mockReturnValue(false)
            expect(processManager.check()).toBe(false)
            
            // Create PID file (simulate process start)
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('12345')
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                if (cmd.includes('ps')) {
                    callback(null, processMocks.commands.ps.running, '')
                } else {
                    callback(null, '', '')
                }
            })
            
            // Process should be running
            expect(processManager.check()).toBe(true)
            expect(processManager.isrunning(12345)).toBe(true)
            
            // Kill process
            expect(processManager.kill(12345)).toBe(true)
            
            // Clean PID file
            mockedFs.unlinkSync.mockImplementation(() => {})
            processManager.clean()
            expect(mockedFs.unlinkSync).toHaveBeenCalledWith(pidFile)
        })
        
        test('should handle port conflict detection', () => {
            const processManager = new Process('test-peer', testDir)
            
            // Port is occupied
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                if (cmd.includes('lsof')) {
                    callback(null, processMocks.commands.lsof.occupied, '')
                }
            })
            
            const occupyingProcess = processManager.find(8765)
            expect(occupyingProcess).not.toBeNull()
            expect(occupyingProcess!.port).toBe(8765)
            expect(occupyingProcess!.pid).toBe(12345)
        })
        
        test('should handle stale PID file cleanup', () => {
            const processManager = new Process('test-peer', testDir)
            
            // PID file exists but process is not running
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('99999')
            mockedExec.mockImplementation((cmd: any, callback: any) => {
                callback(null, processMocks.commands.ps.notFound, '')
            })
            
            // Should detect stale PID
            expect(processManager.check()).toBe(false)
            
            // Should be able to clean stale PID
            mockedFs.unlinkSync.mockImplementation(() => {})
            processManager.clean()
            expect(mockedFs.unlinkSync).toHaveBeenCalled()
        })
        
        test('should handle concurrent process management', () => {
            const processManager1 = new Process('peer1', testDir)
            const processManager2 = new Process('peer2', testDir)
            
            // Different PID files
            expect(processManager1.getpidfile()).toContain('.peer1.pid')
            expect(processManager2.getpidfile()).toContain('.peer2.pid')
            
            // Different names should not conflict
            mockedFs.existsSync.mockImplementation((path: any) => {
                return path.includes('peer1') ? true : false
            })
            
            expect(processManager1.check()).toBe(true)  // Has PID file
            expect(processManager2.check()).toBe(false) // No PID file
        })
    })
})