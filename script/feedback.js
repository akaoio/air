#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'
import crypto from 'crypto'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
}

/**
 * Feedback Collection System for Air
 * Collects anonymous usage data and user feedback to improve the product
 */
class FeedbackCollector {
    constructor() {
        this.feedbackFile = path.join(rootPath, '.air-feedback.json')
        this.analyticsFile = path.join(rootPath, '.air-analytics.json')
        this.sessionId = crypto.randomBytes(8).toString('hex')
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
        
        this.feedback = this.loadfeedback()
        this.analytics = this.loadanalytics()
    }

    loadfeedback() {
        try {
            if (fs.existsSync(this.feedbackFile)) {
                return JSON.parse(fs.readFileSync(this.feedbackFile, 'utf8'))
            }
        } catch {}
        
        return {
            submissions: [],
            lastSubmitted: null,
            userId: crypto.randomBytes(16).toString('hex')
        }
    }

    loadanalytics() {
        try {
            if (fs.existsSync(this.analyticsFile)) {
                return JSON.parse(fs.readFileSync(this.analyticsFile, 'utf8'))
            }
        } catch {}
        
        return {
            enabled: false,
            events: [],
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version
            }
        }
    }

    savefeedback() {
        fs.writeFileSync(this.feedbackFile, JSON.stringify(this.feedback, null, 2))
    }

    saveanalytics() {
        fs.writeFileSync(this.analyticsFile, JSON.stringify(this.analytics, null, 2))
    }

    log(message, color = '') {
        console.log(color + message + colors.reset)
    }

    async prompt(question, defaultValue = '') {
        return new Promise(resolve => {
            const q = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `
            this.rl.question(q, answer => {
                resolve(answer.trim() || defaultValue)
            })
        })
    }

    async collectfeedback() {
        this.log('\n═══════════════════════════════════════════', colors.cyan)
        this.log('       Air Feedback Collection', colors.cyan + colors.bright)
        this.log('═══════════════════════════════════════════', colors.cyan)
        console.log()
        
        this.log('Help us improve Air by sharing your experience!', colors.green)
        this.log('Your feedback is anonymous and greatly appreciated.', colors.dim)
        console.log()
        
        const feedback = {
            id: crypto.randomBytes(8).toString('hex'),
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId
        }
        
        // Satisfaction rating
        this.log('1. How satisfied are you with Air?', colors.cyan)
        this.log('   1 = Very Unsatisfied, 5 = Very Satisfied', colors.dim)
        
        let rating
        while (!rating || rating < 1 || rating > 5) {
            rating = parseInt(await this.prompt('Rating (1-5)'))
            if (!rating || rating < 1 || rating > 5) {
                this.log('Please enter a number between 1 and 5', colors.yellow)
            }
        }
        feedback.satisfaction = rating
        
        // Feature usage
        this.log('\n2. Which features do you use most? (comma-separated)', colors.cyan)
        this.log('   Examples: installation, updates, security, monitoring', colors.dim)
        
        const features = await this.prompt('Features')
        feedback.features = features.split(',').map(f => f.trim()).filter(f => f)
        
        // Experience level
        this.log('\n3. How would you describe your experience level?', colors.cyan)
        this.log('   1 = Beginner', colors.dim)
        this.log('   2 = Intermediate', colors.dim)
        this.log('   3 = Advanced', colors.dim)
        this.log('   4 = Expert', colors.dim)
        
        let experience
        while (!experience || experience < 1 || experience > 4) {
            experience = parseInt(await this.prompt('Experience (1-4)'))
            if (!experience || experience < 1 || experience > 4) {
                this.log('Please enter a number between 1 and 4', colors.yellow)
            }
        }
        feedback.experience = experience
        
        // What works well
        this.log('\n4. What do you like most about Air?', colors.cyan)
        feedback.likes = await this.prompt('Your answer') || 'No response'
        
        // What needs improvement
        this.log('\n5. What could be improved?', colors.cyan)
        feedback.improvements = await this.prompt('Your answer') || 'No response'
        
        // Additional comments
        this.log('\n6. Any additional comments or suggestions?', colors.cyan)
        feedback.comments = await this.prompt('Your answer') || 'No response'
        
        // Contact (optional)
        this.log('\n7. Email for follow-up (optional, leave blank to skip):', colors.cyan)
        feedback.email = await this.prompt('Email', '')
        
        // Save feedback
        this.feedback.submissions.push(feedback)
        this.feedback.lastSubmitted = new Date().toISOString()
        this.savefeedback()
        
        console.log()
        this.log('✨ Thank you for your feedback!', colors.green + colors.bright)
        this.log('Your input helps make Air better for everyone.', colors.green)
        
        // Show summary
        this.showsummary(feedback)
    }

    showsummary(feedback) {
        console.log()
        this.log('Feedback Summary:', colors.cyan + colors.bright)
        this.log('─────────────────', colors.cyan)
        
        const stars = '⭐'.repeat(feedback.satisfaction) + '☆'.repeat(5 - feedback.satisfaction)
        this.log(`  Satisfaction: ${stars} (${feedback.satisfaction}/5)`, colors.yellow)
        
        if (feedback.features.length > 0) {
            this.log(`  Top features: ${feedback.features.join(', ')}`, colors.dim)
        }
        
        const expLevels = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert']
        this.log(`  Experience: ${expLevels[feedback.experience]}`, colors.dim)
        
        if (feedback.email) {
            this.log(`  Follow-up: ${feedback.email}`, colors.dim)
        }
        
        console.log()
    }

    async viewfeedback() {
        this.log('\n═══════════════════════════════════════════', colors.cyan)
        this.log('       Feedback History', colors.cyan + colors.bright)
        this.log('═══════════════════════════════════════════', colors.cyan)
        console.log()
        
        if (this.feedback.submissions.length === 0) {
            this.log('No feedback submitted yet.', colors.yellow)
            this.log('Run "npm run feedback" to share your experience!', colors.dim)
            return
        }
        
        // Calculate statistics
        const stats = {
            total: this.feedback.submissions.length,
            avgSatisfaction: 0,
            topFeatures: {},
            avgExperience: 0
        }
        
        for (const submission of this.feedback.submissions) {
            stats.avgSatisfaction += submission.satisfaction
            stats.avgExperience += submission.experience
            
            for (const feature of submission.features || []) {
                stats.topFeatures[feature] = (stats.topFeatures[feature] || 0) + 1
            }
        }
        
        stats.avgSatisfaction /= stats.total
        stats.avgExperience /= stats.total
        
        // Display statistics
        this.log('Overall Statistics:', colors.cyan + colors.bright)
        this.log('─────────────────', colors.cyan)
        
        this.log(`  Total submissions: ${stats.total}`, colors.green)
        
        const avgStars = '⭐'.repeat(Math.round(stats.avgSatisfaction)) + 
                        '☆'.repeat(5 - Math.round(stats.avgSatisfaction))
        this.log(`  Average satisfaction: ${avgStars} (${stats.avgSatisfaction.toFixed(1)}/5)`, colors.yellow)
        
        const expLevels = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert']
        this.log(`  Average experience: ${expLevels[Math.round(stats.avgExperience)]}`, colors.dim)
        
        if (Object.keys(stats.topFeatures).length > 0) {
            const sortedFeatures = Object.entries(stats.topFeatures)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
            
            this.log('\n  Most used features:', colors.cyan)
            for (const [feature, count] of sortedFeatures) {
                const bar = '█'.repeat(Math.round((count / stats.total) * 10))
                this.log(`    ${feature}: ${bar} (${count})`, colors.dim)
            }
        }
        
        // Recent feedback
        this.log('\nRecent Feedback:', colors.cyan + colors.bright)
        this.log('───────────────', colors.cyan)
        
        const recent = this.feedback.submissions.slice(-3).reverse()
        
        for (const submission of recent) {
            const date = new Date(submission.timestamp).toLocaleDateString()
            const stars = '⭐'.repeat(submission.satisfaction) + '☆'.repeat(5 - submission.satisfaction)
            
            this.log(`\n  ${date} - ${stars}`, colors.green)
            
            if (submission.likes && submission.likes !== 'No response') {
                this.log(`  Likes: ${submission.likes}`, colors.dim)
            }
            
            if (submission.improvements && submission.improvements !== 'No response') {
                this.log(`  Improvements: ${submission.improvements}`, colors.dim)
            }
        }
        
        console.log()
    }

    async exportfeedback() {
        const exportPath = path.join(rootPath, `air-feedback-export-${Date.now()}.json`)
        
        const exportData = {
            exported: new Date().toISOString(),
            system: this.analytics.system,
            feedback: this.feedback.submissions,
            analytics: this.analytics.events
        }
        
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2))
        
        this.log(`\n✅ Feedback exported to: ${path.basename(exportPath)}`, colors.green)
        this.log('Share this file with the Air team to help improve the product!', colors.dim)
    }

    async toggleanalytics() {
        this.analytics.enabled = !this.analytics.enabled
        this.saveanalytics()
        
        if (this.analytics.enabled) {
            this.log('\n✅ Analytics enabled', colors.green)
            this.log('Anonymous usage data will be collected to improve Air.', colors.dim)
        } else {
            this.log('\n❌ Analytics disabled', colors.yellow)
            this.log('No usage data will be collected.', colors.dim)
        }
    }

    trackevent(event, data = {}) {
        if (!this.analytics.enabled) return
        
        const eventData = {
            timestamp: new Date().toISOString(),
            event,
            data,
            sessionId: this.sessionId
        }
        
        this.analytics.events.push(eventData)
        
        // Keep only last 100 events
        if (this.analytics.events.length > 100) {
            this.analytics.events = this.analytics.events.slice(-100)
        }
        
        this.saveanalytics()
    }

    async showhelp() {
        console.log(`
${colors.cyan + colors.bright}Air Feedback System${colors.reset}

${colors.bright}Commands:${colors.reset}
  ${colors.green}collect${colors.reset}    Submit feedback about your Air experience
  ${colors.green}view${colors.reset}       View feedback history and statistics
  ${colors.green}export${colors.reset}     Export feedback for sharing
  ${colors.green}analytics${colors.reset}  Toggle anonymous usage analytics
  ${colors.green}help${colors.reset}       Show this help

${colors.bright}Usage:${colors.reset}
  npm run feedback              # Submit feedback
  npm run feedback view         # View history
  npm run feedback export       # Export data
  npm run feedback analytics    # Toggle analytics

${colors.bright}Privacy:${colors.reset}
  • Feedback is stored locally and never sent automatically
  • Analytics are disabled by default
  • All data is anonymous (no personal information collected)
  • You can export and review all collected data

${colors.bright}Why provide feedback?${colors.reset}
  • Helps prioritize new features
  • Identifies pain points and bugs
  • Shapes the future of Air
  • Direct input to the development team

${colors.bright}Support:${colors.reset}
  ${colors.blue}https://github.com/akaoio/air/issues${colors.reset}
`)
    }

    async run() {
        const command = process.argv[2]
        
        try {
            switch (command) {
                case 'view':
                    await this.viewfeedback()
                    break
                case 'export':
                    await this.exportfeedback()
                    break
                case 'analytics':
                    await this.toggleanalytics()
                    break
                case 'help':
                    await this.showhelp()
                    break
                case 'collect':
                default:
                    await this.collectfeedback()
                    break
            }
        } catch (error) {
            this.log(`\n❌ Error: ${error.message}`, colors.red)
            process.exit(1)
        } finally {
            this.rl.close()
        }
    }
}

// Track installation event
function trackinstall() {
    const collector = new FeedbackCollector()
    collector.trackevent('install', {
        version: JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8')).version,
        method: process.env.npm_lifecycle_event || 'manual'
    })
}

// Export for use in other scripts
export { FeedbackCollector, trackinstall }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const collector = new FeedbackCollector()
    collector.run()
}