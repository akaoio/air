#!/usr/bin/env node
/**
 * Simple Air uninstaller
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { execSync } = require('child_process')

// Colors
const c = {
    r: '\x1b[0m', b: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', 
    yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function confirm(question, defaultYes = false) {
    return new Promise((resolve) => {
        const q = defaultYes ? `${question} (Y/n): ` : `${question} (y/N): `
        rl.question(q, (answer) => {
            const ans = answer.toLowerCase()
            if (ans === 'y' || ans === 'yes') resolve(true)
            else if (ans === 'n' || ans === 'no') resolve(false)  
            else resolve(defaultYes)
        })
    })
}

async function uninstall() {
    console.log(c.red + c.b + 'Air Database Uninstaller' + c.r)
    console.log()
    
    // Load config
    const configPath = path.join(process.cwd(), 'air.json')
    let config = { name: 'air' }
    
    if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        } catch {
            console.log(c.yellow + 'Warning: Could not read air.json' + c.r)
        }
    }
    
    console.log(`This will uninstall Air instance: ${c.cyan}${config.name}${c.r}`)
    console.log()
    
    if (!await confirm('Are you sure you want to uninstall?', false)) {
        console.log('Uninstall cancelled.')
        return
    }
    
    let success = 0
    let total = 0
    
    // Stop processes
    total++
    console.log('\n1. Stopping processes...')
    try {
        const pidFile = path.join(process.cwd(), `.${config.name}.pid`)
        if (fs.existsSync(pidFile)) {
            const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim())
            try {
                process.kill(pid, 'SIGTERM')
                console.log(c.green + '   ✓ Process stopped' + c.r)
                success++
            } catch {
                console.log(c.yellow + '   ✓ Process not running' + c.r)
                success++
            }
        } else {
            console.log(c.green + '   ✓ No process found' + c.r)
            success++
        }
    } catch (e) {
        console.log(c.red + '   ✗ Failed to stop process' + c.r)
    }
    
    // Remove PID files
    total++
    console.log('\n2. Cleaning PID files...')
    try {
        let cleaned = 0
        const files = fs.readdirSync(process.cwd())
        files.forEach(file => {
            if (file.startsWith('.') && file.endsWith('.pid')) {
                fs.unlinkSync(path.join(process.cwd(), file))
                cleaned++
            }
        })
        console.log(c.green + `   ✓ Cleaned ${cleaned} PID file(s)` + c.r)
        success++
    } catch (e) {
        console.log(c.red + '   ✗ Failed to clean PID files' + c.r)
    }
    
    // Remove systemd service
    total++
    console.log('\n3. Removing system service...')
    try {
        if (process.platform === 'linux') {
            const serviceName = `air-${config.name}`
            try {
                execSync(`sudo systemctl stop ${serviceName}`, { stdio: 'ignore' })
                execSync(`sudo systemctl disable ${serviceName}`, { stdio: 'ignore' })
                execSync(`sudo rm -f /etc/systemd/system/${serviceName}.service`, { stdio: 'ignore' })
                execSync(`sudo systemctl daemon-reload`, { stdio: 'ignore' })
                console.log(c.green + '   ✓ Systemd service removed' + c.r)
            } catch {
                console.log(c.green + '   ✓ No systemd service found' + c.r)
            }
        } else {
            console.log(c.green + '   ✓ Service removal not needed' + c.r)
        }
        success++
    } catch (e) {
        console.log(c.red + '   ✗ Failed to remove service' + c.r)
    }
    
    // Remove cron jobs
    total++
    console.log('\n4. Removing cron jobs...')
    try {
        if (process.platform !== 'win32') {
            try {
                const currentCron = execSync('crontab -l 2>/dev/null', { encoding: 'utf8' })
                const lines = currentCron.split('\n').filter(line => 
                    !line.includes(process.cwd()) && !line.includes('air')
                )
                
                if (lines.length !== currentCron.split('\n').length) {
                    const newCron = lines.join('\n')
                    fs.writeFileSync('/tmp/new-cron', newCron)
                    execSync('crontab /tmp/new-cron')
                    fs.unlinkSync('/tmp/new-cron')
                    console.log(c.green + '   ✓ Cron jobs removed' + c.r)
                } else {
                    console.log(c.green + '   ✓ No cron jobs found' + c.r)
                }
            } catch {
                console.log(c.green + '   ✓ No crontab found' + c.r)
            }
        } else {
            console.log(c.green + '   ✓ Cron not applicable on Windows' + c.r)
        }
        success++
    } catch (e) {
        console.log(c.red + '   ✗ Failed to remove cron jobs' + c.r)
    }
    
    // Optionally remove config
    if (await confirm('\nRemove configuration file (air.json)?', false)) {
        total++
        try {
            if (fs.existsSync(configPath)) {
                fs.copyFileSync(configPath, configPath + '.backup')
                fs.unlinkSync(configPath)
                console.log(c.green + '✓ Configuration removed (backup saved)' + c.r)
                success++
            }
        } catch (e) {
            console.log(c.red + '✗ Failed to remove configuration' + c.r)
        }
    }
    
    // Summary
    console.log()
    console.log(c.magenta + '=== Uninstall Summary ===' + c.r)
    console.log(`${success}/${total} tasks completed successfully`)
    
    if (success === total) {
        console.log(c.green + c.b + '🎉 Air has been uninstalled successfully!' + c.r)
        console.log()
        console.log('To completely remove Air:')
        console.log(`1. Delete this directory: ${c.cyan}rm -rf ${process.cwd()}${c.r}`)
        console.log(`2. Remove npm package: ${c.cyan}npm uninstall -g @akaoio/air${c.r}`)
    } else {
        console.log(c.yellow + '⚠️  Uninstall completed with some issues' + c.r)
    }
}

async function main() {
    try {
        await uninstall()
    } catch (error) {
        console.error(c.red + `Uninstall failed: ${error.message}` + c.r)
        process.exit(1)
    } finally {
        rl.close()
    }
}

main()