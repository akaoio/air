/**
 * Cron Job Manager for Air
 * Handles clean cron job management for DDNS updates and SSL renewals
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AirConfig } from '../types/index.js'

export interface CronJob {
    schedule: string
    command: string
    comment?: string
}

export interface CronManagerResult {
    success: boolean
    message: string
    jobs?: CronJob[]
}

export class CronManager {
    private readonly airTag = '# Managed by Air'
    private readonly ddnsTag = '# Air DDNS Update'
    private readonly sslTag = '# Air SSL Renewal'
    
    /**
     * Get current crontab contents
     */
    private getCurrentCrontab(): string {
        try {
            return execSync('crontab -l 2>/dev/null', { encoding: 'utf8' })
        } catch {
            // No crontab exists
            return ''
        }
    }
    
    /**
     * Set new crontab contents
     */
    private setCrontab(content: string): boolean {
        try {
            const tmpFile = path.join(os.tmpdir(), `cron-air-${Date.now()}`)
            fs.writeFileSync(tmpFile, content)
            execSync(`crontab "${tmpFile}"`, { stdio: 'ignore' })
            fs.unlinkSync(tmpFile)
            return true
        } catch {
            return false
        }
    }
    
    /**
     * Clean old Air cron jobs
     */
    cleanOldJobs(config: AirConfig): CronManagerResult {
        const current = this.getCurrentCrontab()
        if (!current) {
            return { success: true, message: 'No crontab found' }
        }
        
        // Filter out old Air-related jobs
        const lines = current.split('\n')
        const cleaned: string[] = []
        let skipNext = false
        let removedCount = 0
        
        for (const line of lines) {
            // Skip Air-managed lines
            if (line.includes(this.airTag) || 
                line.includes(this.ddnsTag) || 
                line.includes(this.sslTag)) {
                skipNext = true
                removedCount++
                continue
            }
            
            // Skip the actual cron job after a tag
            if (skipNext && line.trim() && !line.startsWith('#')) {
                skipNext = false
                removedCount++
                continue
            }
            
            // Also remove old-style jobs without tags
            if (line.includes(config.root) || 
                line.includes('air') && line.includes('ddns') ||
                line.includes('certbot renew') && line.includes(config.name)) {
                removedCount++
                continue
            }
            
            cleaned.push(line)
        }
        
        if (removedCount > 0) {
            const newCron = cleaned.join('\n').trim() + '\n'
            if (this.setCrontab(newCron)) {
                return { 
                    success: true, 
                    message: `Removed ${removedCount} old Air cron jobs` 
                }
            } else {
                return { 
                    success: false, 
                    message: 'Failed to update crontab' 
                }
            }
        }
        
        return { success: true, message: 'No old Air cron jobs found' }
    }
    
    /**
     * Setup DDNS cron job
     */
    setupDDNS(config: AirConfig): CronManagerResult {
        // Check if GoDaddy is configured
        const env = config.env
        const envConfig = config[env] as any
        const godaddy = envConfig?.godaddy
        
        if (!godaddy?.key || !godaddy?.secret) {
            return { 
                success: false, 
                message: 'GoDaddy API credentials not configured' 
            }
        }
        
        // Clean old jobs first
        this.cleanOldJobs(config)
        
        // Create DDNS script if it doesn't exist
        const scriptPath = path.join(config.root, 'script', 'ddns.sh')
        if (!fs.existsSync(scriptPath)) {
            const scriptContent = `#!/bin/bash
# Air DDNS Update Script

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

cd ${config.root}
bun run script/ddns.ts >> ${config.root}/logs/ddns.log 2>&1
`
            fs.writeFileSync(scriptPath, scriptContent)
            fs.chmodSync(scriptPath, 0o755)
        }
        
        // Add new cron job
        const current = this.getCurrentCrontab()
        const newJob = `${this.ddnsTag}
*/5 * * * * ${scriptPath}
`
        
        const newCron = current.trim() + '\n' + newJob
        
        if (this.setCrontab(newCron)) {
            return { 
                success: true, 
                message: 'DDNS cron job installed (every 5 minutes)' 
            }
        }
        
        return { success: false, message: 'Failed to install DDNS cron job' }
    }
    
    /**
     * Setup SSL renewal cron job
     */
    setupSSLRenewal(config: AirConfig, tool: 'certbot' | 'acmesh'): CronManagerResult {
        const current = this.getCurrentCrontab()
        let newJob = ''
        
        if (tool === 'certbot') {
            // Certbot renewal (twice daily as recommended)
            newJob = `${this.sslTag}
0 0,12 * * * certbot renew --quiet --post-hook "systemctl reload ${config.name} 2>/dev/null || true"
`
        } else if (tool === 'acmesh') {
            // acme.sh renewal (daily at 2 AM)
            const acmePath = path.join(os.homedir(), '.acme.sh', 'acme.sh')
            if (!fs.existsSync(acmePath)) {
                return { 
                    success: false, 
                    message: 'acme.sh not installed' 
                }
            }
            
            const envConfig = config[config.env] as any
            const domain = envConfig?.domain
            if (!domain) {
                return { 
                    success: false, 
                    message: 'Domain not configured' 
                }
            }
            
            newJob = `${this.sslTag}
0 2 * * * ${acmePath} --renew -d ${domain} --force >> ${config.root}/logs/ssl-renewal.log 2>&1
`
        } else {
            return { 
                success: false, 
                message: 'Unknown SSL tool' 
            }
        }
        
        // Remove old SSL renewal jobs first
        const lines = current.split('\n').filter(line => 
            !line.includes(this.sslTag) && 
            !line.includes('certbot renew') && 
            !line.includes('acme.sh --renew')
        )
        
        const cleanedCron = lines.join('\n').trim()
        const newCron = cleanedCron + '\n' + newJob
        
        if (this.setCrontab(newCron)) {
            return { 
                success: true, 
                message: `SSL renewal cron job installed (${tool})` 
            }
        }
        
        return { success: false, message: 'Failed to install SSL renewal cron job' }
    }
    
    /**
     * List all Air-related cron jobs
     */
    listAirJobs(): CronManagerResult {
        const current = this.getCurrentCrontab()
        if (!current) {
            return { 
                success: true, 
                message: 'No crontab found', 
                jobs: [] 
            }
        }
        
        const jobs: CronJob[] = []
        const lines = current.split('\n')
        let nextIsAirJob = false
        let currentComment = ''
        
        for (const line of lines) {
            if (line.includes(this.airTag) || 
                line.includes(this.ddnsTag) || 
                line.includes(this.sslTag)) {
                currentComment = line
                nextIsAirJob = true
                continue
            }
            
            if (nextIsAirJob && line.trim() && !line.startsWith('#')) {
                const parts = line.trim().split(/\s+/)
                if (parts.length >= 6) {
                    jobs.push({
                        schedule: parts.slice(0, 5).join(' '),
                        command: parts.slice(5).join(' '),
                        comment: currentComment
                    })
                }
                nextIsAirJob = false
                currentComment = ''
            }
            
            // Also detect old-style Air jobs without tags
            if (line.includes('/air/') || line.includes('ddns.sh')) {
                const parts = line.trim().split(/\s+/)
                if (parts.length >= 6) {
                    jobs.push({
                        schedule: parts.slice(0, 5).join(' '),
                        command: parts.slice(5).join(' '),
                        comment: 'Legacy Air job'
                    })
                }
            }
        }
        
        return { 
            success: true, 
            message: `Found ${jobs.length} Air cron jobs`, 
            jobs 
        }
    }
    
    /**
     * Remove all Air cron jobs
     */
    removeAllAirJobs(config: AirConfig): CronManagerResult {
        const current = this.getCurrentCrontab()
        if (!current) {
            return { success: true, message: 'No crontab found' }
        }
        
        // Filter out ALL Air-related lines
        const lines = current.split('\n')
        const cleaned: string[] = []
        let skipNext = false
        let removedCount = 0
        
        for (const line of lines) {
            // Skip Air tags and their jobs
            if (line.includes(this.airTag) || 
                line.includes(this.ddnsTag) || 
                line.includes(this.sslTag)) {
                skipNext = true
                removedCount++
                continue
            }
            
            if (skipNext && line.trim() && !line.startsWith('#')) {
                skipNext = false
                removedCount++
                continue
            }
            
            // Skip old-style Air jobs
            if (line.includes(config.root) || 
                line.includes('air') && (line.includes('ddns') || line.includes('ssl'))) {
                removedCount++
                continue
            }
            
            cleaned.push(line)
        }
        
        const newCron = cleaned.join('\n').trim()
        
        if (newCron) {
            if (this.setCrontab(newCron + '\n')) {
                return { 
                    success: true, 
                    message: `Removed ${removedCount} Air cron jobs` 
                }
            }
        } else {
            // No other cron jobs, remove crontab entirely
            try {
                execSync('crontab -r', { stdio: 'ignore' })
                return { 
                    success: true, 
                    message: 'Removed all cron jobs (crontab was empty)' 
                }
            } catch {
                return { 
                    success: false, 
                    message: 'Failed to remove crontab' 
                }
            }
        }
        
        return { success: false, message: 'Failed to update crontab' }
    }
    
    /**
     * Check if DDNS cron is active
     */
    isDDNSActive(): boolean {
        const result = this.listAirJobs()
        if (result.jobs) {
            return result.jobs.some(job => 
                job.command.includes('ddns') || 
                job.comment?.includes('DDNS')
            )
        }
        return false
    }
    
    /**
     * Check if SSL renewal cron is active
     */
    isSSLRenewalActive(): boolean {
        const result = this.listAirJobs()
        if (result.jobs) {
            return result.jobs.some(job => 
                job.command.includes('certbot renew') || 
                job.command.includes('acme.sh --renew') ||
                job.comment?.includes('SSL')
            )
        }
        return false
    }
    
    /**
     * Get cron status summary
     */
    getStatus(): string {
        const jobs = this.listAirJobs()
        const ddnsActive = this.isDDNSActive()
        const sslActive = this.isSSLRenewalActive()
        
        const lines: string[] = []
        lines.push('📅 Cron Job Status')
        lines.push('─'.repeat(40))
        
        if (jobs.jobs && jobs.jobs.length > 0) {
            lines.push(`✅ ${jobs.jobs.length} Air cron jobs active`)
            lines.push('')
            
            if (ddnsActive) {
                lines.push('✅ DDNS Update: Active (every 5 minutes)')
            } else {
                lines.push('❌ DDNS Update: Not configured')
            }
            
            if (sslActive) {
                lines.push('✅ SSL Renewal: Active')
            } else {
                lines.push('❌ SSL Renewal: Not configured')
            }
            
            lines.push('')
            lines.push('Active Jobs:')
            for (const job of jobs.jobs) {
                lines.push(`  ${job.schedule} - ${job.command.substring(0, 50)}...`)
            }
        } else {
            lines.push('❌ No Air cron jobs found')
            lines.push('')
            lines.push('To setup:')
            lines.push('  DDNS: npm run air:ddns:setup')
            lines.push('  SSL:  Configure with installer')
        }
        
        return lines.join('\n')
    }
}

/**
 * Export convenience functions
 */
export function setupDDNSCron(config: AirConfig): CronManagerResult {
    const manager = new CronManager()
    return manager.setupDDNS(config)
}

export function setupSSLRenewalCron(config: AirConfig, tool: 'certbot' | 'acmesh'): CronManagerResult {
    const manager = new CronManager()
    return manager.setupSSLRenewal(config, tool)
}

export function cleanOldCronJobs(config: AirConfig): CronManagerResult {
    const manager = new CronManager()
    return manager.cleanOldJobs(config)
}

export function getCronStatus(): string {
    const manager = new CronManager()
    return manager.getStatus()
}

export default CronManager