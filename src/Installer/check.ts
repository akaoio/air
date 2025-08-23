/**
 * Check system requirements
 */

import { execSync } from 'child_process'
import os from 'os'
import type { SystemInfo } from './types.js'

export function check(): SystemInfo {
    const info: SystemInfo = {
        nodeVersion: process.version,
        platform: os.platform() as NodeJS.Platform,
        hostname: os.hostname(),
        hasSudo: checkSudo(),
        hasSystemd: checkSystemd(),
        isWindows: os.platform() === 'win32',
        isMac: os.platform() === 'darwin',
        isLinux: os.platform() === 'linux',
        isTermux: checkTermux()
    }
    
    // Check npm version
    try {
        info.npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim()
    } catch {
        // npm not available
    }
    
    // Check git version
    try {
        info.gitVersion = execSync('git --version', { encoding: 'utf8' }).trim()
    } catch {
        // git not available
    }
    
    return info
}

function checkSudo(): boolean {
    if (os.platform() === 'win32') return false
    
    try {
        execSync('sudo -n true', { stdio: 'ignore' })
        return true
    } catch {
        return false
    }
}

function checkSystemd(): boolean {
    if (os.platform() !== 'linux') return false
    
    try {
        execSync('systemctl --version', { stdio: 'ignore' })
        return true
    } catch {
        return false
    }
}

function checkTermux(): boolean {
    return !!process.env.PREFIX && process.env.PREFIX.includes('com.termux')
}

export default check