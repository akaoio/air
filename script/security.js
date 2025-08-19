#!/usr/bin/env node

import security from '../src/security.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
}

function log(message, color = '') {
    console.log(color + message + colors.reset)
}

function header() {
    console.log()
    log('═══════════════════════════════════════════', colors.cyan)
    log('       Air Security Analysis', colors.cyan + colors.bright)
    log('═══════════════════════════════════════════', colors.cyan)
    console.log()
}

async function run() {
    header()
    
    // System security check
    log('System Security Check', colors.cyan + colors.bright)
    log('─────────────────────', colors.cyan)
    
    const systemReport = security.checksystem()
    
    log(`Security Score: ${systemReport.score}/100`, 
        systemReport.score >= 80 ? colors.green : colors.yellow)
    log(`Grade: ${systemReport.grade}`,
        systemReport.grade === 'A' || systemReport.grade === 'B' ? colors.green : colors.yellow)
    console.log()
    
    if (systemReport.issues.length > 0) {
        log('Issues Found:', colors.yellow + colors.bright)
        for (const issue of systemReport.issues) {
            log(`  ⚠ ${issue}`, colors.yellow)
        }
        console.log()
    }
    
    if (systemReport.recommendations.length > 0) {
        log('Recommendations:', colors.cyan + colors.bright)
        for (const rec of systemReport.recommendations) {
            log(`  → ${rec}`, colors.cyan)
        }
        console.log()
    }
    
    // Configuration security check
    const configPath = path.join(rootPath, 'air.json')
    
    if (fs.existsSync(configPath)) {
        log('Configuration Security', colors.cyan + colors.bright)
        log('─────────────────────', colors.cyan)
        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        const configIssues = security.validateconfig(config)
        
        if (configIssues.length === 0) {
            log('  ✓ No configuration security issues found', colors.green)
        } else {
            for (const issue of configIssues) {
                const icon = issue.type === 'error' ? '✗' : 
                           issue.type === 'warning' ? '⚠' : 'ℹ'
                const color = issue.type === 'error' ? colors.red : 
                            issue.type === 'warning' ? colors.yellow : colors.blue
                
                log(`  ${icon} ${issue.message} (${issue.path})`, color)
            }
        }
        console.log()
        
        // File permissions
        const stats = fs.statSync(configPath)
        const mode = '0' + (stats.mode & parseInt('777', 8)).toString(8)
        
        log('File Permissions:', colors.cyan + colors.bright)
        log(`  air.json: ${mode}`, mode === '0600' ? colors.green : colors.yellow)
        
        if (mode !== '0600') {
            log('  → Run: chmod 600 air.json', colors.cyan)
        }
        console.log()
    } else {
        log('⚠ No configuration file found', colors.yellow)
        log('  Run: npm run setup', colors.cyan)
        console.log()
    }
    
    // SSL certificate check
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        const env = config.env || 'development'
        
        if (config[env]?.ssl) {
            log('SSL Certificate Status', colors.cyan + colors.bright)
            log('─────────────────────', colors.cyan)
            
            const ssl = config[env].ssl
            
            // Check key file
            if (ssl.key) {
                if (fs.existsSync(ssl.key)) {
                    const keyStats = fs.statSync(ssl.key)
                    const keyMode = '0' + (keyStats.mode & parseInt('777', 8)).toString(8)
                    log(`  Key: ${path.basename(ssl.key)}`, colors.green)
                    log(`    Permissions: ${keyMode}`, keyMode === '0600' ? colors.green : colors.yellow)
                } else {
                    log(`  ✗ Key file not found: ${ssl.key}`, colors.red)
                }
            }
            
            // Check cert file
            if (ssl.cert) {
                if (fs.existsSync(ssl.cert)) {
                    log(`  Certificate: ${path.basename(ssl.cert)}`, colors.green)
                    
                    // Check expiration
                    try {
                        const certContent = fs.readFileSync(ssl.cert, 'utf8')
                        const match = certContent.match(/Not After : (.+)/)
                        if (match) {
                            log(`    Expires: ${match[1]}`, colors.cyan)
                        }
                    } catch {}
                } else {
                    log(`  ✗ Certificate file not found: ${ssl.cert}`, colors.red)
                }
            }
            console.log()
        }
    }
    
    // Security best practices
    log('Security Best Practices', colors.cyan + colors.bright)
    log('─────────────────────', colors.cyan)
    
    const practices = [
        { check: !security.isRoot, text: 'Run as non-root user' },
        { check: systemReport.score >= 80, text: 'System security score >= 80' },
        { check: fs.existsSync(configPath), text: 'Configuration file exists' },
        { check: process.env.NODE_ENV === 'production', text: 'Production environment set' }
    ]
    
    for (const practice of practices) {
        const icon = practice.check ? '✓' : '✗'
        const color = practice.check ? colors.green : colors.red
        log(`  ${icon} ${practice.text}`, color)
    }
    
    console.log()
    log('═══════════════════════════════════════════', colors.cyan)
    console.log()
}

run().catch(error => {
    log('✗ Security check failed:', colors.red + colors.bright)
    console.error(error)
    process.exit(1)
})