/**
 * 100% Coverage Test Suite
 * Covers all remaining modules to achieve 100% test coverage
 */

import os from 'os'
import fs from 'fs'
import path from 'path'
import { execSync, exec } from 'child_process'
import { promisify } from 'util'

// Import all modules needing coverage
import { Uninstaller } from '../src/Uninstaller/index.js'
import { Updater } from '../src/Updater/index.js'
import { LinuxSystemd } from '../src/Platform/LinuxSystemd/index.js'
import { Windows } from '../src/Platform/Windows/index.js'
import * as Platform from '../src/Platform/index.js'
import * as permission from '../src/permission/index.js'
import { Peer } from '../src/Peer/index.js'
import { Process } from '../src/Process/index.js'
import { Reporter } from '../src/Reporter/index.js'
import Gun from 'gun'

// Mock modules
jest.mock('os')
jest.mock('fs')
jest.mock('path')
jest.mock('child_process')
jest.mock('gun')

const mockedOs = os as jest.Mocked<typeof os>
const mockedFs = fs as jest.Mocked<typeof fs>
const mockedPath = path as jest.Mocked<typeof path>
const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>
const mockedExec = exec as jest.MockedFunction<typeof exec>

// Mock fetch globally
(global as any).fetch = jest.fn()

describe('100% Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    
    // Setup path mock to work properly
    mockedPath.join.mockImplementation((...args) => args.join('/'))
    mockedPath.resolve.mockImplementation((...args) => args.join('/'))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Uninstaller - Complete Coverage', () => {
    it('should handle constructor with all options', () => {
      const options = {
        name: 'test-service',
        root: '/test/root',
        verbose: true
      }
      const uninstaller = new Uninstaller(options)
      expect(uninstaller).toBeDefined()
    })

    it('should stop services successfully', async () => {
      const uninstaller = new Uninstaller({ name: 'air' })
      
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue('1234')
      mockedExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('kill')) return Buffer.from('')
        if (cmd.includes('systemctl stop')) return Buffer.from('')
        return Buffer.from('')
      })
      
      const result = await uninstaller.stop()
      expect(result.success).toBe(true)
    })

    it('should handle stop errors gracefully', async () => {
      const uninstaller = new Uninstaller({ name: 'air' })
      
      mockedExecSync.mockImplementation(() => {
        throw new Error('Stop failed')
      })
      
      const result = await uninstaller.stop()
      expect(result.success).toBe(false)
    })

    it('should remove services and files', async () => {
      const uninstaller = new Uninstaller({ name: 'air' })
      
      mockedOs.platform.mockReturnValue('linux')
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.unlinkSync.mockImplementation(() => {})
      mockedExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('systemctl')) return Buffer.from('')
        return Buffer.from('')
      })
      
      const result = await uninstaller.remove()
      expect(result.success).toBe(true)
    })

    it('should clean all resources', async () => {
      const uninstaller = new Uninstaller({ name: 'air' })
      
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.rmSync.mockImplementation(() => {})
      mockedFs.unlinkSync.mockImplementation(() => {})
      
      const result = await uninstaller.clean()
      expect(result.success).toBe(true)
    })
  })

  describe('Updater - Complete Coverage', () => {
    it('should handle constructor with options', () => {
      const updater = new Updater({ root: '/test/root', name: 'air' })
      expect(updater).toBeDefined()
    })

    it('should update git repository', async () => {
      const updater = new Updater({ root: '/test' })
      
      mockedExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git pull')) return Buffer.from('Already up to date.')
        if (cmd.includes('git status')) return Buffer.from('nothing to commit')
        return Buffer.from('')
      })
      
      const result = await updater.git()
      expect(result.success).toBe(true)
    })

    it('should handle git errors', async () => {
      const updater = new Updater({ root: '/test' })
      
      mockedExecSync.mockImplementation(() => {
        throw new Error('Not a git repository')
      })
      
      const result = await updater.git()
      expect(result.success).toBe(false)
    })

    it('should update npm packages', async () => {
      const updater = new Updater({ root: '/test' })
      
      mockedExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('npm install')) return Buffer.from('updated 5 packages')
        if (cmd.includes('npm audit')) return Buffer.from('found 0 vulnerabilities')
        return Buffer.from('')
      })
      
      const result = await updater.packages()
      expect(result.success).toBe(true)
    })

    it('should restart services after update', async () => {
      const updater = new Updater({ root: '/test', name: 'air' })
      
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue('1234')
      mockedExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('systemctl restart')) return Buffer.from('')
        if (cmd.includes('kill')) return Buffer.from('')
        return Buffer.from('')
      })
      
      const result = await updater.restart()
      expect(result.success).toBe(true)
    })
  })

  describe('Platform - LinuxSystemd', () => {
    let platform: LinuxSystemd

    beforeEach(() => {
      platform = new LinuxSystemd()
      mockedOs.platform.mockReturnValue('linux')
    })

    it('should create systemd service', async () => {
      mockedFs.writeFileSync.mockImplementation(() => {})
      mockedExecSync.mockImplementation(() => Buffer.from(''))
      
      const result = await platform.createService({
        name: 'test-service',
        description: 'Test Service',
        execStart: '/usr/bin/test',
        workingDirectory: '/test',
        environment: { TEST: 'value' },
        user: 'testuser',
        restart: 'always'
      })
      
      expect(result.success).toBe(true)
      expect(mockedFs.writeFileSync).toHaveBeenCalled()
    })

    it('should start service', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from(''))
      
      const result = await platform.startService('test-service')
      expect(result.success).toBe(true)
    })

    it('should stop service', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from(''))
      
      const result = await platform.stopService('test-service')
      expect(result.success).toBe(true)
    })

    it('should check service status', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from('active'))
      
      const isRunning = await platform.isServiceRunning('test-service')
      expect(isRunning).toBe(true)
    })

    it('should remove service', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.unlinkSync.mockImplementation(() => {})
      mockedExecSync.mockImplementation(() => Buffer.from(''))
      
      const result = await platform.removeService('test-service')
      expect(result.success).toBe(true)
    })

    it('should enable service', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from(''))
      
      const result = await platform.enableService('test-service')
      expect(result.success).toBe(true)
    })

    it('should disable service', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from(''))
      
      const result = await platform.disableService('test-service')
      expect(result.success).toBe(true)
    })

    it('should restart service', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from(''))
      
      const result = await platform.restartService('test-service')
      expect(result.success).toBe(true)
    })

    it('should get service logs', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from('Service logs'))
      
      const logs = await platform.getServiceLogs('test-service')
      expect(logs).toBe('Service logs')
    })
  })

  describe('Platform - Windows', () => {
    let platform: Windows

    beforeEach(() => {
      platform = new Windows()
      mockedOs.platform.mockReturnValue('win32')
    })

    it('should create Windows service', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from('[SC] CreateService SUCCESS'))
      
      const result = await platform.createService({
        name: 'test-service',
        description: 'Test Service',
        execStart: 'C:\\test.exe',
        workingDirectory: 'C:\\test'
      })
      
      expect(result.success).toBe(true)
    })

    it('should start Windows service', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from('SERVICE_NAME: test-service'))
      
      const result = await platform.startService('test-service')
      expect(result.success).toBe(true)
    })

    it('should stop Windows service', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from('SERVICE_NAME: test-service'))
      
      const result = await platform.stopService('test-service')
      expect(result.success).toBe(true)
    })

    it('should check Windows service status', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from('STATE : 4  RUNNING'))
      
      const isRunning = await platform.isServiceRunning('test-service')
      expect(isRunning).toBe(true)
    })

    it('should remove Windows service', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from('[SC] DeleteService SUCCESS'))
      
      const result = await platform.removeService('test-service')
      expect(result.success).toBe(true)
    })

    it('should create scheduled task', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from('SUCCESS'))
      
      const result = await platform.createScheduledTask({
        name: 'test-task',
        command: 'C:\\test.exe',
        schedule: 'ONSTART'
      })
      
      expect(result.success).toBe(true)
    })

    it('should remove scheduled task', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from('SUCCESS'))
      
      const result = await platform.removeScheduledTask('test-task')
      expect(result.success).toBe(true)
    })

    it('should set service recovery options', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from(''))
      
      const result = await platform.setServiceRecovery('test-service', {
        reset: 86400,
        actions: ['restart', 'restart', 'restart']
      })
      
      expect(result.success).toBe(true)
    })

    it('should get service logs from Event Log', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from('Event log entries'))
      
      const logs = await platform.getServiceLogs('test-service')
      expect(logs).toContain('Event log entries')
    })
  })

  describe('Platform - Detection and Info', () => {
    it('should detect Linux platform and return LinuxSystemd', () => {
      mockedOs.platform.mockReturnValue('linux')
      const platform = Platform.getPlatform()
      expect(platform).toBeInstanceOf(LinuxSystemd)
    })

    it('should detect Windows platform', () => {
      mockedOs.platform.mockReturnValue('win32')
      const platform = Platform.getPlatform()
      expect(platform).toBeInstanceOf(Windows)
    })

    it('should handle macOS platform', () => {
      mockedOs.platform.mockReturnValue('darwin')
      const platform = Platform.getPlatform()
      expect(platform).toBeDefined()
    })

    it('should get platform info', () => {
      mockedOs.platform.mockReturnValue('linux')
      mockedOs.release.mockReturnValue('5.10.0-generic')
      mockedOs.arch.mockReturnValue('x64')
      mockedOs.hostname.mockReturnValue('test-host')
      
      const info = Platform.getPlatformInfo()
      expect(info.platform).toBe('linux')
      expect(info.release).toBe('5.10.0-generic')
      expect(info.arch).toBe('x64')
      expect(info.hostname).toBe('test-host')
    })

    it('should check if systemd is available', () => {
      mockedFs.existsSync.mockImplementation((path) => {
        return path === '/run/systemd/system'
      })
      
      const hasSystemd = Platform.hasSystemd()
      expect(hasSystemd).toBe(true)
    })

    it('should check if launchd is available', () => {
      mockedOs.platform.mockReturnValue('darwin')
      mockedFs.existsSync.mockImplementation((path) => {
        return path === '/System/Library/LaunchDaemons'
      })
      
      const hasLaunchd = Platform.hasLaunchd()
      expect(hasLaunchd).toBe(true)
    })

    it('should detect service manager', () => {
      mockedOs.platform.mockReturnValue('linux')
      mockedFs.existsSync.mockImplementation((path) => {
        return path === '/run/systemd/system'
      })
      
      const manager = Platform.getServiceManager()
      expect(manager).toBe('systemd')
    })
  })

  describe('Permission module', () => {
    it('should check read permission successfully', async () => {
      mockedFs.accessSync.mockImplementation(() => {})
      
      const canRead = await permission.canread('/test/file')
      expect(canRead).toBe(true)
    })

    it('should handle read permission denied', async () => {
      mockedFs.accessSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })
      
      const canRead = await permission.canread('/test/file')
      expect(canRead).toBe(false)
    })

    it('should check write permission successfully', async () => {
      mockedFs.accessSync.mockImplementation(() => {})
      
      const canWrite = await permission.canwrite('/test/file')
      expect(canWrite).toBe(true)
    })

    it('should handle write permission denied', async () => {
      mockedFs.accessSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })
      
      const canWrite = await permission.canwrite('/test/file')
      expect(canWrite).toBe(false)
    })

    it('should check execute permission successfully', async () => {
      mockedFs.accessSync.mockImplementation(() => {})
      
      const canExecute = await permission.canexecute('/test/file')
      expect(canExecute).toBe(true)
    })

    it('should handle execute permission denied', async () => {
      mockedFs.accessSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })
      
      const canExecute = await permission.canexecute('/test/file')
      expect(canExecute).toBe(false)
    })

    it('should get permission state', () => {
      const state = permission.state
      expect(state).toBeDefined()
      expect(state.checks).toBeDefined()
      expect(state.cache).toBeDefined()
      expect(state.lastCheck).toBeDefined()
    })

    it('should cache permission checks', async () => {
      mockedFs.accessSync.mockImplementation(() => {})
      
      // First check
      await permission.canread('/test/file')
      
      // Second check should use cache
      await permission.canread('/test/file')
      
      const state = permission.state
      expect(state.cache['/test/file']).toBeDefined()
    })
  })

  describe('Peer - Uncovered Methods', () => {
    let peer: Peer

    beforeEach(() => {
      peer = new Peer('/test/path')
      
      // Mock Gun
      const mockGun = {
        get: jest.fn().mockReturnThis(),
        put: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
        once: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        map: jest.fn().mockReturnThis(),
        opt: jest.fn()
      };
      
      (Gun as jest.MockedFunction<typeof Gun>).mockReturnValue(mockGun as any)
    })

    it('should handle sync errors gracefully', async () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found')
      })
      
      await peer.sync()
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle write errors', async () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed')
      })
      
      await peer.write('key', 'value')
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle activation errors', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Activation failed')
      })
      
      await peer.activate()
      expect(console.error).toHaveBeenCalled()
    })

    it('should clean resources', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.rmSync.mockImplementation(() => {})
      mockedFs.unlinkSync.mockImplementation(() => {})
      
      await peer.clean()
      expect(mockedFs.rmSync).toHaveBeenCalled()
    })

    it('should find peers in network', async () => {
      const peers = await peer.find()
      expect(Array.isArray(peers)).toBe(true)
    })

    it('should check online status', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('OK')
      })
      
      const isOnline = await peer.online()
      expect(typeof isOnline).toBe('boolean')
    })

    it('should handle restart', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from(''))
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue('1234')
      
      await peer.restart()
      expect(console.log).toHaveBeenCalled()
    })

    it('should check peer status', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue('1234')
      mockedExecSync.mockImplementation(() => Buffer.from('node'))
      
      const result = await peer.check()
      expect(result).toBeDefined()
    })
  })

  describe('Process - Uncovered Methods', () => {
    let process: Process

    beforeEach(() => {
      process = new Process()
    })

    it('should check process existence', async () => {
      mockedExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('ps')) return Buffer.from('1234 node')
        return Buffer.from('')
      })
      
      const exists = await process.check('node')
      expect(exists).toBe(true)
    })

    it('should handle check errors', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Process not found')
      })
      
      const exists = await process.check('nonexistent')
      expect(exists).toBe(false)
    })

    it('should find processes by pattern', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from('1234 node\n5678 node'))
      
      const pids = await process.find('node')
      expect(Array.isArray(pids)).toBe(true)
      expect(pids.length).toBeGreaterThan(0)
    })

    it('should clean stale pid files', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue('9999')
      mockedFs.unlinkSync.mockImplementation(() => {})
      mockedExecSync.mockImplementation(() => {
        throw new Error('No such process')
      })
      
      await process.clean()
      expect(mockedFs.unlinkSync).toHaveBeenCalled()
    })

    it('should kill process successfully', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from(''))
      
      const result = await process.kill(1234)
      expect(result).toBe(true)
    })

    it('should handle kill errors', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('No such process')
      })
      
      const result = await process.kill(9999)
      expect(result).toBe(false)
    })

    it('should get pid file path', () => {
      const pidFile = process.getpidfile('test')
      expect(pidFile).toContain('.test.pid')
    })

    it('should check if process is running', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue('1234')
      mockedExecSync.mockImplementation(() => Buffer.from('1234 node'))
      
      const isRunning = await process.isrunning('test')
      expect(isRunning).toBe(true)
    })
  })

  describe('Reporter - Uncovered Methods', () => {
    let reporter: Reporter

    beforeEach(() => {
      reporter = new Reporter('/test/path')
      (global as any).fetch = jest.fn()
    })

    it('should activate reporter', async () => {
      mockedExecSync.mockImplementation(() => Buffer.from(''))
      
      await reporter.activate()
      expect(console.log).toHaveBeenCalled()
    })

    it('should handle activation errors', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Activation failed')
      })
      
      await reporter.activate()
      expect(console.error).toHaveBeenCalled()
    })

    it('should report alive status', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('OK')
      })
      
      await reporter.alive()
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle alive errors', async () => {
      (global as any).fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      
      await reporter.alive()
      expect(console.error).toHaveBeenCalled()
    })

    it('should get IP address', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('192.168.1.1')
      })
      
      const ip = await reporter.ip()
      expect(ip).toBe('192.168.1.1')
    })

    it('should handle IP errors', async () => {
      (global as any).fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      
      const ip = await reporter.ip()
      expect(ip).toBeNull()
    })

    it('should update DDNS', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
      
      await reporter.ddns()
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle DDNS errors', async () => {
      (global as any).fetch = jest.fn().mockRejectedValue(new Error('DDNS error'))
      
      await reporter.ddns()
      expect(console.error).toHaveBeenCalled()
    })

    it('should generate full report', async () => {
      mockedOs.hostname.mockReturnValue('test-host')
      mockedOs.platform.mockReturnValue('linux')
      mockedOs.release.mockReturnValue('5.10.0')
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('192.168.1.1')
      })
      
      const report = await reporter.report()
      expect(report).toBeDefined()
      expect(report.hostname).toBe('test-host')
    })

    it('should get user info', () => {
      mockedOs.userInfo.mockReturnValue({
        username: 'testuser',
        uid: 1000,
        gid: 1000,
        shell: '/bin/bash',
        homedir: '/home/testuser'
      })
      
      const user = reporter.user()
      expect(user.username).toBe('testuser')
    })

    it('should get config', () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({
        port: 8900,
        host: 'localhost'
      }))
      
      const config = reporter.config()
      expect(config.port).toBe(8900)
    })

    it('should handle config errors', () => {
      mockedFs.existsSync.mockReturnValue(false)
      
      const config = reporter.config()
      expect(config).toEqual({})
    })

    it('should get state', () => {
      const state = reporter.state()
      expect(state).toBeDefined()
      expect(state.running).toBeDefined()
    })

    it('should start reporter', () => {
      reporter.start()
      expect(console.log).toHaveBeenCalled()
    })

    it('should stop reporter', () => {
      reporter.stop()
      expect(console.log).toHaveBeenCalled()
    })
  })
})