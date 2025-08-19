#!/usr/bin/env node

import { createapp, panel, button, input, dialog, notification, navbar, box, text } from '@akaoio/tui'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import syspaths from './src/syspaths.js'

const execAsync = promisify(exec)

class AirUI {
    constructor() {
        this.app = createapp({ mouse: true })
        this.config = this.loadconfig()
        this.statustext = null
        this.loglines = []
        this.maxloglines = 20
        this.init()
    }

    loadconfig() {
        try {
            const configpath = path.join(process.cwd(), 'air.json')
            if (fs.existsSync(configpath)) {
                return JSON.parse(fs.readFileSync(configpath, 'utf8'))
            }
        } catch (err) {
            // Config will be loaded later
        }
        return null
    }

    async init() {
        // Create navbar
        const nav = new navbar({
            brand: '🚀 Air Control Center',
            align: 'space-between',
            items: [
                { label: 'Status', value: 'status', shortcut: 's' },
                { label: 'Config', value: 'config', shortcut: 'c' },
                { label: 'Peers', value: 'peers', shortcut: 'p' },
                { label: 'Logs', value: 'logs', shortcut: 'l' },
                { label: 'Help', value: 'help', shortcut: 'h' },
                { label: 'Exit', value: 'exit', shortcut: 'x' }
            ],
            onselect: (value) => this.handlenav(value)
        })
        this.app.add(nav)

        // Create main status panel
        this.statuspanel = new panel({
            x: 2, y: 3,
            width: 60, height: 15,
            title: '📊 System Status',
            draggable: true,
            resizable: true,
            collapsible: true
        })

        // Add status display
        this.statusbox = new box({
            x: 2, y: 2,
            width: 56, height: 10,
            border: false,
            padding: 1
        })
        this.statuspanel.addchild(this.statusbox)
        
        // Create status text
        this.statustext = new text('Loading status...', {
            x: 3, y: 3,
            width: 54,
            wrap: true
        })
        this.statusbox.addchild(this.statustext)

        this.app.add(this.statuspanel)

        // Create control panel
        this.controlpanel = new panel({
            x: 64, y: 3,
            width: 40, height: 15,
            title: '🎮 Quick Controls',
            draggable: true,
            resizable: true
        })

        // Start/Stop button
        this.startbtn = new button('▶ Start Air', {
            x: 2, y: 2,
            width: 36, height: 3,
            onclick: () => this.toggleservice()
        })
        this.controlpanel.addchild(this.startbtn)

        // Restart button
        this.restartbtn = new button('🔄 Restart', {
            x: 2, y: 6,
            width: 17, height: 3,
            onclick: () => this.restartservice()
        })
        this.controlpanel.addchild(this.restartbtn)

        // Update button
        this.updatebtn = new button('⬆ Update', {
            x: 21, y: 6,
            width: 17, height: 3,
            onclick: () => this.update()
        })
        this.controlpanel.addchild(this.updatebtn)

        // View Logs button
        this.logsbtn = new button('📜 View Logs', {
            x: 2, y: 10,
            width: 17, height: 3,
            onclick: () => this.showlogs()
        })
        this.controlpanel.addchild(this.logsbtn)

        // Edit Config button
        this.configbtn = new button('⚙ Edit Config', {
            x: 21, y: 10,
            width: 17, height: 3,
            onclick: () => this.editconfig()
        })
        this.controlpanel.addchild(this.configbtn)

        this.app.add(this.controlpanel)

        // Create log panel (initially hidden)
        this.logpanel = new panel({
            x: 2, y: 19,
            width: 102, height: 15,
            title: '📝 Live Logs',
            draggable: true,
            resizable: true,
            closable: true,
            visible: false
        })

        this.logbox = new box({
            x: 2, y: 2,
            width: 98, height: 11,
            border: false,
            padding: 1
        })
        this.logpanel.addchild(this.logbox)

        this.app.add(this.logpanel)

        // Handle keyboard shortcuts
        this.app.onkey((key) => {
            if (key.ctrl && key.name === 'c') {
                this.exit()
            } else if (key.name === 'q') {
                this.exit()
            } else if (key.name === 'r') {
                this.refreshstatus()
            }
        })

        // Start status refresh
        await this.refreshstatus()
        this.statusinterval = setInterval(() => this.refreshstatus(), 5000)

        // Show welcome notification
        notification.success('Air Control Center Ready!')
    }

    async handlenav(value) {
        switch (value) {
            case 'status':
                await this.refreshstatus()
                notification.info('Status refreshed')
                break
            case 'config':
                await this.editconfig()
                break
            case 'peers':
                await this.showpeers()
                break
            case 'logs':
                await this.showlogs()
                break
            case 'help':
                await this.showhelp()
                break
            case 'exit':
                await this.exit()
                break
        }
    }

    async refreshstatus() {
        try {
            // Check if Air is running
            const { stdout: pidcheck } = await execAsync('pgrep -f "node.*main.js"').catch(() => ({ stdout: '' }))
            const isrunning = pidcheck.trim() !== ''
            
            // Update start/stop button
            this.startbtn.text = isrunning ? '⏹ Stop Air' : '▶ Start Air'
            this.startbtn.style.normal.bg = isrunning ? 'red' : 'green'
            
            // Get status info
            let status = ''
            
            if (this.config) {
                const env = this.config.env || 'development'
                const envconfig = this.config[env] || {}
                
                status += `🌍 Environment: ${env}\n`
                status += `📛 Node Name: ${this.config.name || 'air'}\n`
                status += `🌐 Domain: ${envconfig.domain || 'localhost'}\n`
                status += `🔌 Port: ${envconfig.port || 8765}\n`
                status += `🔒 SSL: ${envconfig.ssl ? '✅ Enabled' : '❌ Disabled'}\n`
                status += `👥 Peers: ${envconfig.peers ? envconfig.peers.length : 0} configured\n`
                status += `\n`
                status += `📊 Status: ${isrunning ? '🟢 Running' : '🔴 Stopped'}\n`
                
                if (isrunning) {
                    // Get memory usage
                    const { stdout: meminfo } = await execAsync(`ps aux | grep "node.*main.js" | grep -v grep | awk '{print $6}'`).catch(() => ({ stdout: '0' }))
                    const memkb = parseInt(meminfo.trim()) || 0
                    const memmb = (memkb / 1024).toFixed(1)
                    status += `💾 Memory: ${memmb} MB\n`
                    
                    // Get uptime
                    const { stdout: uptime } = await execAsync(`ps -o etimes= -p $(pgrep -f "node.*main.js" | head -1)`).catch(() => ({ stdout: '0' }))
                    const seconds = parseInt(uptime.trim()) || 0
                    const hours = Math.floor(seconds / 3600)
                    const minutes = Math.floor((seconds % 3600) / 60)
                    status += `⏱ Uptime: ${hours}h ${minutes}m\n`
                }
            } else {
                status = '⚠️ No configuration found!\n\nRun installer to configure Air:\nnpm run setup'
            }
            
            this.statustext.text = status
            this.app.render()
            
        } catch (err) {
            this.statustext.text = `❌ Error getting status:\n${err.message}`
            this.app.render()
        }
    }

    async toggleservice() {
        try {
            const { stdout: pidcheck } = await execAsync('pgrep -f "node.*main.js"').catch(() => ({ stdout: '' }))
            const isrunning = pidcheck.trim() !== ''
            
            if (isrunning) {
                // Stop service
                const loader = notification.info('Stopping Air service...')
                await execAsync('pkill -f "node.*main.js"')
                setTimeout(() => {
                    notification.success('Air service stopped')
                    this.refreshstatus()
                }, 1000)
            } else {
                // Start service
                const loader = notification.info('Starting Air service...')
                execAsync('node main.js > /dev/null 2>&1 &')
                setTimeout(() => {
                    notification.success('Air service started')
                    this.refreshstatus()
                }, 2000)
            }
        } catch (err) {
            notification.error(`Failed: ${err.message}`)
        }
    }

    async restartservice() {
        try {
            notification.info('Restarting Air service...')
            await execAsync('pkill -f "node.*main.js"').catch(() => {})
            await new Promise(r => setTimeout(r, 1000))
            execAsync('node main.js > /dev/null 2>&1 &')
            setTimeout(() => {
                notification.success('Air service restarted')
                this.refreshstatus()
            }, 2000)
        } catch (err) {
            notification.error(`Restart failed: ${err.message}`)
        }
    }

    async update() {
        const confirm = await dialog.confirm(
            'Update Air',
            'This will update Air and its dependencies. Continue?'
        )
        
        if (confirm) {
            notification.info('Updating Air...')
            try {
                await execAsync('git pull')
                await execAsync('npm update')
                notification.success('Update complete! Please restart Air.')
            } catch (err) {
                notification.error(`Update failed: ${err.message}`)
            }
        }
    }

    async showlogs() {
        this.logpanel.visible = true
        
        // Start tailing logs
        if (this.logtail) return
        
        this.logtail = setInterval(async () => {
            try {
                // Try journalctl first, then fallback to log file
                const journalCmd = syspaths.journalctl('air', { lines: 20 })
                const logFile = syspaths.logfile('air.log')
                const { stdout } = await execAsync(`${journalCmd} 2>/dev/null || tail -20 ${logFile} 2>/dev/null || echo "No logs available"`)
                const lines = stdout.split('\n').filter(l => l.trim())
                
                // Clear old log display
                this.logbox.children.forEach(child => this.logbox.removechild(child))
                
                // Add new log lines
                lines.forEach((line, i) => {
                    const logtext = new text(line, {
                        x: 1, y: i + 1,
                        width: 96,
                        truncate: true
                    })
                    
                    // Color code based on content
                    if (line.includes('ERROR') || line.includes('error')) {
                        logtext.style.normal.fg = 'red'
                    } else if (line.includes('WARN') || line.includes('warning')) {
                        logtext.style.normal.fg = 'yellow'
                    } else if (line.includes('INFO')) {
                        logtext.style.normal.fg = 'cyan'
                    }
                    
                    this.logbox.addchild(logtext)
                })
                
                this.app.render()
            } catch (err) {
                // Ignore errors in log tailing
            }
        }, 1000)
        
        // Stop tailing when panel is closed
        this.logpanel.on('close', () => {
            if (this.logtail) {
                clearInterval(this.logtail)
                this.logtail = null
            }
        })
    }

    async editconfig() {
        if (!this.config) {
            const create = await dialog.confirm(
                'No Configuration',
                'No air.json found. Would you like to run the installer?'
            )
            if (create) {
                notification.info('Starting installer...')
                this.app.stop()
                execAsync('npm run setup')
                process.exit(0)
            }
            return
        }

        // Create config editor panel
        const configpanel = new panel({
            x: 10, y: 5,
            width: 80, height: 25,
            title: '⚙️ Configuration Editor',
            draggable: true,
            closable: true
        })

        const env = this.config.env || 'development'
        const envconfig = this.config[env] || {}

        // Name input
        const nameinput = new input({
            x: 2, y: 2,
            width: 76, height: 3,
            placeholder: 'Node name',
            value: this.config.name || ''
        })
        configpanel.addchild(nameinput)

        // Domain input
        const domaininput = new input({
            x: 2, y: 6,
            width: 76, height: 3,
            placeholder: 'Domain (e.g., peer.example.com)',
            value: envconfig.domain || ''
        })
        configpanel.addchild(domaininput)

        // Port input
        const portinput = new input({
            x: 2, y: 10,
            width: 37, height: 3,
            placeholder: 'Port',
            type: 'number',
            value: String(envconfig.port || 8765)
        })
        configpanel.addchild(portinput)

        // Environment selector
        const envbtn = new button(env === 'production' ? '🏭 Production' : '🔧 Development', {
            x: 41, y: 10,
            width: 37, height: 3,
            onclick: () => {
                this.config.env = this.config.env === 'production' ? 'development' : 'production'
                envbtn.text = this.config.env === 'production' ? '🏭 Production' : '🔧 Development'
                this.app.render()
            }
        })
        configpanel.addchild(envbtn)

        // Save button
        const savebtn = new button('💾 Save Configuration', {
            x: 2, y: 20,
            width: 37, height: 3,
            onclick: async () => {
                this.config.name = nameinput.value
                envconfig.domain = domaininput.value
                envconfig.port = parseInt(portinput.value) || 8765
                
                try {
                    fs.writeFileSync(
                        path.join(process.cwd(), 'air.json'),
                        JSON.stringify(this.config, null, 2)
                    )
                    notification.success('Configuration saved!')
                    configpanel.visible = false
                    this.refreshstatus()
                } catch (err) {
                    notification.error(`Failed to save: ${err.message}`)
                }
            }
        })
        configpanel.addchild(savebtn)

        // Cancel button
        const cancelbtn = new button('❌ Cancel', {
            x: 41, y: 20,
            width: 37, height: 3,
            onclick: () => {
                configpanel.visible = false
            }
        })
        configpanel.addchild(cancelbtn)

        this.app.add(configpanel)
    }

    async showpeers() {
        if (!this.config) {
            notification.warning('No configuration loaded')
            return
        }

        const env = this.config.env || 'development'
        const envconfig = this.config[env] || {}
        const peers = envconfig.peers || []

        // Create peers panel
        const peerspanel = new panel({
            x: 10, y: 5,
            width: 80, height: 25,
            title: '👥 Peer Connections',
            draggable: true,
            closable: true
        })

        // Display current peers
        let y = 2
        peers.forEach((peer, i) => {
            const peertext = new text(`${i + 1}. ${peer}`, {
                x: 2, y: y,
                width: 76
            })
            peerspanel.addchild(peertext)
            y += 2
        })

        if (peers.length === 0) {
            const nopeers = new text('No peers configured', {
                x: 2, y: 2,
                width: 76
            })
            nopeers.style.normal.fg = 'gray'
            peerspanel.addchild(nopeers)
        }

        // Add peer input
        const peerinput = new input({
            x: 2, y: 18,
            width: 76, height: 3,
            placeholder: 'Enter peer URL (e.g., wss://peer.example.com/gun)'
        })
        peerspanel.addchild(peerinput)

        // Add button
        const addbtn = new button('➕ Add Peer', {
            x: 2, y: 22,
            width: 37, height: 3,
            onclick: () => {
                if (peerinput.value) {
                    envconfig.peers = envconfig.peers || []
                    envconfig.peers.push(peerinput.value)
                    
                    try {
                        fs.writeFileSync(
                            path.join(process.cwd(), 'air.json'),
                            JSON.stringify(this.config, null, 2)
                        )
                        notification.success('Peer added!')
                        peerspanel.visible = false
                        this.showpeers() // Refresh
                    } catch (err) {
                        notification.error(`Failed to save: ${err.message}`)
                    }
                }
            }
        })
        peerspanel.addchild(addbtn)

        // Close button
        const closebtn = new button('❌ Close', {
            x: 41, y: 22,
            width: 37, height: 3,
            onclick: () => {
                peerspanel.visible = false
            }
        })
        peerspanel.addchild(closebtn)

        this.app.add(peerspanel)
    }

    async showhelp() {
        await dialog.alert(
            '📚 Air Control Center Help',
            `Keyboard Shortcuts:
            
• Q - Quit application
• R - Refresh status
• Ctrl+C - Exit
• Tab - Navigate between elements
• Enter/Space - Activate buttons

Mouse Support:
• Click buttons to activate
• Drag panels to move them
• Resize panels by dragging corners

Features:
• Monitor Air service status
• Start/stop/restart service
• Edit configuration
• Manage peer connections
• View live logs
• Update Air and dependencies`,
            'info'
        )
    }

    async exit() {
        const confirm = await dialog.confirm('Exit', 'Exit Air Control Center?')
        if (confirm) {
            if (this.statusinterval) clearInterval(this.statusinterval)
            if (this.logtail) clearInterval(this.logtail)
            this.app.exit()
            process.exit(0)
        }
    }

    run() {
        this.app.run()
    }
}

// Start the UI
const ui = new AirUI()
ui.run()