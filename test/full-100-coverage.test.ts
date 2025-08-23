import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import { execSync, exec } from 'child_process'
import os from 'os'
import path from 'path'
import { promisify } from 'util'

// Import all modules that need coverage
import { Uninstaller } from '../src/Uninstaller/index.js'
import { Updater } from '../src/Updater/index.js'
import { LinuxSystemd } from '../src/Platform/LinuxSystemd/index.js'
import { Windows } from '../src/Platform/Windows/index.js'
import * as Platform from '../src/Platform/index.js'
import * as permission from '../src/permission/index.js'
import { Peer } from '../src/Peer/index.js'
import { Process } from '../src/Process/index.js'
import { Reporter } from '../src/Reporter/index.js'
import * as db from '../src/db.js'
import * as main from '../src/main.js'

const execAsync = promisify(exec)

// Mock all external dependencies
vi.mock('fs')
vi.mock('child_process')
vi.mock('os')
vi.mock('gun', () => ({
  default: vi.fn(() => ({
    get: vi.fn(() => ({
      put: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      set: vi.fn(),
      map: vi.fn(),
    })),
    opt: vi.fn(),
    on: vi.fn(),
  })),
}))

describe('100% Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Uninstaller', () => {
    it('should clean services and files', async () => {
      const uninstaller = new Uninstaller('/test/path')
      
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.unlinkSync).mockImplementation(() => {})
      vi.mocked(fs.rmSync).mockImplementation(() => {})
      vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
      
      // Test clean method
      await uninstaller.clean()
      expect(fs.rmSync).toHaveBeenCalled()
    })

    it('should stop services', async () => {
      const uninstaller = new Uninstaller('/test/path')
      
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('systemctl')) return Buffer.from('active')
        return Buffer.from('')
      })
      
      await uninstaller.stop()
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('systemctl'))
    })

    it('should remove systemd services', async () => {
      const uninstaller = new Uninstaller('/test/path')
      
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.unlinkSync).mockImplementation(() => {})
      vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
      
      await uninstaller.remove()
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('systemctl'))
    })
  })

  describe('Updater', () => {
    it('should update git repository', async () => {
      const updater = new Updater('/test/path')
      
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('git')) return Buffer.from('Already up to date.')
        return Buffer.from('')
      })
      
      await updater.git()
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('git pull'))
    })

    it('should update npm packages', async () => {
      const updater = new Updater('/test/path')
      
      vi.mocked(execSync).mockImplementation(() => Buffer.from('updated'))
      
      await updater.packages()
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('npm'))
    })

    it('should restart services after update', async () => {
      const updater = new Updater('/test/path')
      
      vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
      vi.mocked(fs.existsSync).mockReturnValue(true)
      
      await updater.restart()
      expect(execSync).toHaveBeenCalled()
    })
  })

  describe('Platform', () => {
    describe('LinuxSystemd', () => {
      it('should create systemd service', async () => {
        const platform = new LinuxSystemd()
        
        vi.mocked(fs.writeFileSync).mockImplementation(() => {})
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
        
        await platform.createService({
          name: 'test-service',
          description: 'Test Service',
          execStart: '/usr/bin/test',
          workingDirectory: '/test',
          environment: { TEST: 'value' },
          user: 'testuser',
          restart: 'always',
        })
        
        expect(fs.writeFileSync).toHaveBeenCalled()
        expect(execSync).toHaveBeenCalledWith(expect.stringContaining('systemctl'))
      })

      it('should start service', async () => {
        const platform = new LinuxSystemd()
        
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
        
        await platform.startService('test-service')
        expect(execSync).toHaveBeenCalledWith('systemctl start test-service')
      })

      it('should stop service', async () => {
        const platform = new LinuxSystemd()
        
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
        
        await platform.stopService('test-service')
        expect(execSync).toHaveBeenCalledWith('systemctl stop test-service')
      })

      it('should check service status', async () => {
        const platform = new LinuxSystemd()
        
        vi.mocked(execSync).mockImplementation(() => Buffer.from('active'))
        
        const status = await platform.isServiceRunning('test-service')
        expect(status).toBe(true)
      })

      it('should remove service', async () => {
        const platform = new LinuxSystemd()
        
        vi.mocked(fs.existsSync).mockReturnValue(true)
        vi.mocked(fs.unlinkSync).mockImplementation(() => {})
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
        
        await platform.removeService('test-service')
        expect(fs.unlinkSync).toHaveBeenCalled()
      })
    })

    describe('Windows', () => {
      it('should create Windows service', async () => {
        const platform = new Windows()
        
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
        
        await platform.createService({
          name: 'test-service',
          description: 'Test Service',
          execStart: 'C:\\test.exe',
          workingDirectory: 'C:\\test',
          environment: { TEST: 'value' },
        })
        
        expect(execSync).toHaveBeenCalledWith(expect.stringContaining('sc create'))
      })

      it('should start Windows service', async () => {
        const platform = new Windows()
        
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
        
        await platform.startService('test-service')
        expect(execSync).toHaveBeenCalledWith('sc start test-service')
      })

      it('should stop Windows service', async () => {
        const platform = new Windows()
        
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
        
        await platform.stopService('test-service')
        expect(execSync).toHaveBeenCalledWith('sc stop test-service')
      })

      it('should check Windows service status', async () => {
        const platform = new Windows()
        
        vi.mocked(execSync).mockImplementation(() => Buffer.from('RUNNING'))
        
        const status = await platform.isServiceRunning('test-service')
        expect(status).toBe(true)
      })

      it('should remove Windows service', async () => {
        const platform = new Windows()
        
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
        
        await platform.removeService('test-service')
        expect(execSync).toHaveBeenCalledWith('sc delete test-service')
      })

      it('should create scheduled task', async () => {
        const platform = new Windows()
        
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
        
        await platform.createScheduledTask({
          name: 'test-task',
          command: 'C:\\test.exe',
          schedule: 'ONSTART',
        })
        
        expect(execSync).toHaveBeenCalledWith(expect.stringContaining('schtasks'))
      })
    })

    describe('Platform detection', () => {
      it('should detect Linux platform', () => {
        vi.mocked(os.platform).mockReturnValue('linux')
        const platform = Platform.getPlatform()
        expect(platform).toBeInstanceOf(LinuxSystemd)
      })

      it('should detect Windows platform', () => {
        vi.mocked(os.platform).mockReturnValue('win32')
        const platform = Platform.getPlatform()
        expect(platform).toBeInstanceOf(Windows)
      })

      it('should detect macOS platform', () => {
        vi.mocked(os.platform).mockReturnValue('darwin')
        const platform = Platform.getPlatform()
        expect(platform).toBeDefined()
      })

      it('should return platform info', () => {
        vi.mocked(os.platform).mockReturnValue('linux')
        vi.mocked(os.release).mockReturnValue('5.10.0')
        vi.mocked(os.arch).mockReturnValue('x64')
        
        const info = Platform.getPlatformInfo()
        expect(info.platform).toBe('linux')
        expect(info.release).toBe('5.10.0')
        expect(info.arch).toBe('x64')
      })

      it('should check if systemd is available', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true)
        const hasSystemd = Platform.hasSystemd()
        expect(hasSystemd).toBe(true)
      })
    })
  })

  describe('Permission module', () => {
    it('should check read permission', async () => {
      vi.mocked(fs.accessSync).mockImplementation(() => {})
      const canRead = await permission.canread('/test/file')
      expect(canRead).toBe(true)
    })

    it('should check write permission', async () => {
      vi.mocked(fs.accessSync).mockImplementation(() => {})
      const canWrite = await permission.canwrite('/test/file')
      expect(canWrite).toBe(true)
    })

    it('should check execute permission', async () => {
      vi.mocked(fs.accessSync).mockImplementation(() => {})
      const canExecute = await permission.canexecute('/test/file')
      expect(canExecute).toBe(true)
    })

    it('should handle permission errors', async () => {
      vi.mocked(fs.accessSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })
      const canRead = await permission.canread('/test/file')
      expect(canRead).toBe(false)
    })

    it('should get permission state', () => {
      const state = permission.state
      expect(state).toBeDefined()
      expect(state.checks).toBeDefined()
    })

    it('should export all permission functions', () => {
      expect(permission.canread).toBeDefined()
      expect(permission.canwrite).toBeDefined()
      expect(permission.canexecute).toBeDefined()
      expect(permission.state).toBeDefined()
    })
  })

  describe('Peer uncovered methods', () => {
    it('should handle peer sync errors', async () => {
      const peer = new Peer('/test/path')
      
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error')
      })
      
      await peer.sync()
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle peer write errors', async () => {
      const peer = new Peer('/test/path')
      
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write error')
      })
      
      await peer.write('key', 'value')
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle peer activation errors', async () => {
      const peer = new Peer('/test/path')
      
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Exec error')
      })
      
      await peer.activate()
      expect(console.error).toHaveBeenCalled()
    })

    it('should clean peer resources', async () => {
      const peer = new Peer('/test/path')
      
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.rmSync).mockImplementation(() => {})
      
      await peer.clean()
      expect(fs.rmSync).toHaveBeenCalled()
    })

    it('should find peers in network', async () => {
      const peer = new Peer('/test/path')
      
      const peers = await peer.find()
      expect(Array.isArray(peers)).toBe(true)
    })

    it('should check peer online status', async () => {
      const peer = new Peer('/test/path')
      
      const isOnline = await peer.online()
      expect(typeof isOnline).toBe('boolean')
    })

    it('should restart peer', async () => {
      const peer = new Peer('/test/path')
      
      vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
      
      await peer.restart()
      expect(execSync).toHaveBeenCalled()
    })
  })

  describe('Process uncovered methods', () => {
    it('should check process with error handling', async () => {
      const process = new Process()
      
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Process not found')
      })
      
      const result = await process.check('test-process')
      expect(result).toBe(false)
    })

    it('should find process by pattern', async () => {
      const process = new Process()
      
      vi.mocked(execSync).mockImplementation(() => Buffer.from('1234 test-process'))
      
      const pids = await process.find('test-process')
      expect(Array.isArray(pids)).toBe(true)
    })

    it('should clean stale pid files', async () => {
      const process = new Process()
      
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('1234')
      vi.mocked(fs.unlinkSync).mockImplementation(() => {})
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('No such process')
      })
      
      await process.clean()
      expect(fs.unlinkSync).toHaveBeenCalled()
    })

    it('should kill process by pid', async () => {
      const process = new Process()
      
      vi.mocked(execSync).mockImplementation(() => Buffer.from(''))
      
      await process.kill(1234)
      expect(execSync).toHaveBeenCalled()
    })

    it('should handle kill errors gracefully', async () => {
      const process = new Process()
      
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('No such process')
      })
      
      const result = await process.kill(1234)
      expect(result).toBe(false)
    })
  })

  describe('Reporter uncovered methods', () => {
    it('should activate reporter with error handling', async () => {
      const reporter = new Reporter('/test/path')
      
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Activation failed')
      })
      
      await reporter.activate()
      expect(console.error).toHaveBeenCalled()
    })

    it('should report alive status with network error', async () => {
      const reporter = new Reporter('/test/path')
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      await reporter.alive()
      expect(console.error).toHaveBeenCalled()
    })

    it('should report IP address', async () => {
      const reporter = new Reporter('/test/path')
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('192.168.1.1'),
      })
      
      const ip = await reporter.ip()
      expect(ip).toBe('192.168.1.1')
    })

    it('should handle DDNS update errors', async () => {
      const reporter = new Reporter('/test/path')
      
      global.fetch = vi.fn().mockRejectedValue(new Error('DDNS error'))
      
      await reporter.ddns()
      expect(console.error).toHaveBeenCalled()
    })

    it('should report full status', async () => {
      const reporter = new Reporter('/test/path')
      
      const report = await reporter.report()
      expect(report).toBeDefined()
      expect(report.alive).toBeDefined()
    })

    it('should get user info', async () => {
      const reporter = new Reporter('/test/path')
      
      vi.mocked(os.userInfo).mockReturnValue({
        username: 'testuser',
        uid: 1000,
        gid: 1000,
        shell: '/bin/bash',
        homedir: '/home/testuser',
      })
      
      const user = await reporter.user()
      expect(user.username).toBe('testuser')
    })

    it('should get config info', async () => {
      const reporter = new Reporter('/test/path')
      
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        port: 8900,
        host: 'localhost',
      }))
      
      const config = await reporter.config()
      expect(config.port).toBe(8900)
    })
  })

  describe('Database module', () => {
    it('should initialize gun database', () => {
      const gun = db.default
      expect(gun).toBeDefined()
    })

    it('should export gun instance', () => {
      expect(db.gun).toBeDefined()
    })
  })

  describe('Main module', () => {
    it('should export main function', () => {
      expect(main.default).toBeDefined()
    })

    it('should start application', async () => {
      await main.default()
      expect(console.log).toHaveBeenCalled()
    })
  })
})