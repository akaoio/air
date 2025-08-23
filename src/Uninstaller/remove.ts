/**
 * Remove Air service
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import type { AirConfig } from '../types/index.js'

export interface RemoveResult {
    success: boolean
    message: string
    type?: string
}

export function remove(config: AirConfig): RemoveResult {
    const platform = process.platform
    
    try {
        if (platform === 'win32') {
            return removeWindows(config)
        } else if (platform === 'darwin') {
            return removeMac(config)
        } else if (isTermux()) {
            return removeTermux(config)
        } else if (hasSystemd()) {
            return removeSystemd(config)
        } else {
            return removeCron(config)
        }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

function removeWindows(config: AirConfig): RemoveResult {
    const startupPath = path.join(
        os.homedir(),
        'AppData', 'Roaming', 'Microsoft', 'Windows',
        'Start Menu', 'Programs', 'Startup'
    )
    const batchFile = path.join(startupPath, `air-${config.name}.bat`)
    
    if (fs.existsSync(batchFile)) {
        fs.unlinkSync(batchFile)
        return { success: true, message: 'Windows startup removed', type: 'windows' }
    }
    
    return { success: true, message: 'No Windows service found', type: 'windows' }
}

function removeMac(config: AirConfig): RemoveResult {
    const plistFile = path.join(
        os.homedir(), 
        'Library', 
        'LaunchAgents', 
        `com.air.${config.name}.plist`
    )
    
    if (fs.existsSync(plistFile)) {
        try {
            execSync(`launchctl unload "${plistFile}"`, { stdio: 'ignore' })
        } catch {}
        fs.unlinkSync(plistFile)
        return { success: true, message: 'launchd service removed', type: 'launchd' }
    }
    
    return { success: true, message: 'No launchd service found', type: 'launchd' }
}

function removeTermux(config: AirConfig): RemoveResult {
    try {
        execSync(`sv-disable ${config.name}`, { stdio: 'ignore' })
    } catch {}
    
    const serviceDir = path.join(
        process.env.PREFIX || '/data/data/com.termux/files/usr',
        'var', 'service', config.name
    )
    
    if (fs.existsSync(serviceDir)) {
        fs.rmSync(serviceDir, { recursive: true })
        return { success: true, message: 'Termux service removed', type: 'termux' }
    }
    
    return { success: true, message: 'No Termux service found', type: 'termux' }
}

function removeSystemd(config: AirConfig): RemoveResult {
    const serviceName = `air-${config.name}`
    
    try {
        execSync(`systemctl --user stop ${serviceName}`, { stdio: 'ignore' })
        execSync(`systemctl --user disable ${serviceName}`, { stdio: 'ignore' })
    } catch {}
    
    const serviceFile = path.join(
        os.homedir(),
        '.config', 'systemd', 'user',
        `${serviceName}.service`
    )
    
    if (fs.existsSync(serviceFile)) {
        fs.unlinkSync(serviceFile)
        execSync('systemctl --user daemon-reload', { stdio: 'ignore' })
        return { success: true, message: 'Systemd service removed', type: 'systemd' }
    }
    
    return { success: true, message: 'No systemd service found', type: 'systemd' }
}

function removeCron(config: AirConfig): RemoveResult {
    try {
        let currentCron = ''
        try {
            currentCron = execSync('crontab -l', { encoding: 'utf8' })
        } catch {
            return { success: true, message: 'No crontab found', type: 'cron' }
        }
        
        // Filter out Air-related cron jobs
        const lines = currentCron.split('\n').filter(line =>
            !line.includes(config.root) &&
            !line.includes('air') &&
            !line.includes(config.name)
        )
        
        if (lines.length !== currentCron.split('\n').length) {
            const newCron = lines.join('\n')
            const tmpFile = path.join(os.tmpdir(), `cron-${Date.now()}`)
            fs.writeFileSync(tmpFile, newCron)
            execSync(`crontab "${tmpFile}"`, { stdio: 'ignore' })
            fs.unlinkSync(tmpFile)
            return { success: true, message: 'Cron jobs removed', type: 'cron' }
        }
        
        return { success: true, message: 'No cron jobs found', type: 'cron' }
        
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

function isTermux(): boolean {
    return !!process.env.PREFIX && process.env.PREFIX.includes('com.termux')
}

function hasSystemd(): boolean {
    if (process.platform !== 'linux') return false
    
    try {
        execSync('systemctl --version', { stdio: 'ignore' })
        return true
    } catch {
        return false
    }
}

export default remove