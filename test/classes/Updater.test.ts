/**
 * Updater Class Tests - System Phase
 * Testing all Updater methods with comprehensive coverage
 */

import { jest } from '@jest/globals'
import { Updater } from '../../src/Updater/index.js'
import { TestSetup } from '../shared/testSetup.js'
import * as childProcess from 'child_process'

// Mock Node.js modules
jest.mock('fs')
jest.mock('child_process')

const mockedChildProcess = childProcess as jest.Mocked<typeof childProcess>

describe('Updater Class', () => {
    let testSetup: TestSetup
    
    beforeEach(() => {
        testSetup = new TestSetup('updater-test')
        jest.clearAllMocks()
    })
    
    afterEach(() => {
        testSetup.cleanup()
    })

    describe('Constructor', () => {
        test('should create Updater instance with default options', () => {
            const updater = new Updater()
            
            expect(updater).toBeInstanceOf(Updater)
        })

        test('should create Updater instance with custom options', () => {
            const options = {
                timeout: 5000,
                retries: 3
            }
            const updater = new Updater(options)
            
            expect(updater).toBeInstanceOf(Updater)
        })

        test('should handle undefined options', () => {
            const updater = new Updater(undefined)
            
            expect(updater).toBeInstanceOf(Updater)
        })
    })

    describe('git() method', () => {
        test('should execute git pull successfully', async () => {
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                if (typeof callback === 'function') {
                    callback(null, 'Already up to date.', '')
                }
                return {} as any
            })
            
            const updater = new Updater()
            const result = await updater.git()
            
            expect(result).toBe(true)
            expect(mockedChildProcess.exec).toHaveBeenCalledWith(
                'git pull origin main',
                expect.any(Function)
            )
        })

        test('should handle git pull errors', async () => {
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                if (typeof callback === 'function') {
                    callback(new Error('Git not found'), '', 'Git not found')
                }
                return {} as any
            })
            
            const updater = new Updater()
            const result = await updater.git()
            
            expect(result).toBe(false)
        })

        test('should handle git pull with merge conflicts', async () => {
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                if (typeof callback === 'function') {
                    callback(null, '', 'CONFLICT: Merge conflict in file.txt')
                }
                return {} as any
            })
            
            const updater = new Updater()
            const result = await updater.git()
            
            expect(result).toBe(false)
        })

        test('should handle timeout scenarios', async () => {
            mockedChildProcess.exec.mockImplementation((command, options, callback) => {
                // Simulate timeout
                setTimeout(() => {
                    if (typeof callback === 'function') {
                        callback(new Error('Timeout'), '', '')
                    }
                }, 100)
                return {} as any
            })
            
            const updater = new Updater({ timeout: 50 })
            const result = await updater.git()
            
            expect(result).toBe(false)
        })
    })

    describe('packages() method', () => {
        test('should update npm packages successfully', async () => {
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                if (typeof callback === 'function') {
                    callback(null, 'up to date, audited 123 packages', '')
                }
                return {} as any
            })
            
            const updater = new Updater()
            const result = await updater.packages()
            
            expect(result).toBe(true)
            expect(mockedChildProcess.exec).toHaveBeenCalledWith(
                'npm update',
                expect.any(Function)
            )
        })

        test('should handle npm update errors', async () => {
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                if (typeof callback === 'function') {
                    callback(new Error('npm not found'), '', 'npm not found')
                }
                return {} as any
            })
            
            const updater = new Updater()
            const result = await updater.packages()
            
            expect(result).toBe(false)
        })

        test('should handle package dependency conflicts', async () => {
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                if (typeof callback === 'function') {
                    callback(null, '', 'ERESOLVE unable to resolve dependency tree')
                }
                return {} as any
            })
            
            const updater = new Updater()
            const result = await updater.packages()
            
            expect(result).toBe(false)
        })

        test('should handle network errors during package updates', async () => {
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                if (typeof callback === 'function') {
                    callback(new Error('Network error'), '', 'request to https://registry.npmjs.org failed')
                }
                return {} as any
            })
            
            const updater = new Updater()
            const result = await updater.packages()
            
            expect(result).toBe(false)
        })
    })

    describe('restart() method', () => {
        test('should restart service successfully', async () => {
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                if (typeof callback === 'function') {
                    callback(null, 'Service restarted successfully', '')
                }
                return {} as any
            })
            
            const updater = new Updater()
            const result = await updater.restart()
            
            expect(result).toBe(true)
        })

        test('should handle restart command errors', async () => {
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                if (typeof callback === 'function') {
                    callback(new Error('Service not found'), '', 'Service not found')
                }
                return {} as any
            })
            
            const updater = new Updater()
            const result = await updater.restart()
            
            expect(result).toBe(false)
        })

        test('should handle permission errors during restart', async () => {
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                if (typeof callback === 'function') {
                    callback(new Error('Permission denied'), '', 'sudo required')
                }
                return {} as any
            })
            
            const updater = new Updater()
            const result = await updater.restart()
            
            expect(result).toBe(false)
        })
    })

    describe('Integration Tests', () => {
        test('should handle complete update workflow', async () => {
            let callCount = 0
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                callCount++
                if (typeof callback === 'function') {
                    if (command.includes('git pull')) {
                        callback(null, 'Already up to date.', '')
                    } else if (command.includes('npm update')) {
                        callback(null, 'up to date, audited 123 packages', '')
                    } else {
                        callback(null, 'Service restarted successfully', '')
                    }
                }
                return {} as any
            })
            
            const updater = new Updater()
            
            const gitResult = await updater.git()
            expect(gitResult).toBe(true)
            
            const packagesResult = await updater.packages()
            expect(packagesResult).toBe(true)
            
            const restartResult = await updater.restart()
            expect(restartResult).toBe(true)
            
            expect(callCount).toBe(3)
        })

        test('should handle partial failure scenarios', async () => {
            let callCount = 0
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                callCount++
                if (typeof callback === 'function') {
                    if (command.includes('git pull')) {
                        callback(null, 'Already up to date.', '')
                    } else if (command.includes('npm update')) {
                        callback(new Error('npm update failed'), '', 'Network error')
                    } else {
                        callback(null, 'Service restarted successfully', '')
                    }
                }
                return {} as any
            })
            
            const updater = new Updater()
            
            const gitResult = await updater.git()
            expect(gitResult).toBe(true)
            
            const packagesResult = await updater.packages()
            expect(packagesResult).toBe(false)
            
            // Restart should still work even if packages failed
            const restartResult = await updater.restart()
            expect(restartResult).toBe(true)
        })

        test('should handle error recovery with retries', async () => {
            let attemptCount = 0
            mockedChildProcess.exec.mockImplementation((_command: any, callback: any) => {
                attemptCount++
                if (typeof callback === 'function') {
                    if (attemptCount === 1) {
                        // First attempt fails
                        callback(new Error('Network timeout'), '', 'Timeout')
                    } else {
                        // Second attempt succeeds
                        callback(null, 'Already up to date.', '')
                    }
                }
                return {} as any
            })
            
            const updater = new Updater({ retries: 2 })
            
            // Should succeed on retry
            const gitResult1 = await updater.git()
            const gitResult2 = await updater.git()
            
            expect(attemptCount).toBe(2)
        })
    })
})