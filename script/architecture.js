#!/usr/bin/env node

import architecture from '../src/architecture.js'
import path from 'path'
import { fileURLToPath } from 'url'

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
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
}

function log(message, color = '') {
    console.log(color + message + colors.reset)
}

function header() {
    console.log()
    log('═══════════════════════════════════════════', colors.cyan)
    log('     Air Architecture Validation', colors.cyan + colors.bright)
    log('═══════════════════════════════════════════', colors.cyan)
    console.log()
}

async function run() {
    header()
    
    log('Scanning codebase...', colors.cyan)
    console.log()
    
    // Perform architecture scan
    await architecture.scan(rootPath)
    const report = architecture.report()
    
    // Display overall score
    log('Overall Results', colors.cyan + colors.bright)
    log('──────────────', colors.cyan)
    
    const scoreColor = report.score >= 90 ? colors.green :
                      report.score >= 70 ? colors.yellow : colors.red
    
    log(`Architecture Score: ${report.score}/100`, scoreColor + colors.bright)
    log(`Grade: ${report.grade}`, scoreColor + colors.bright)
    log(`Total Violations: ${report.total}`, report.total === 0 ? colors.green : colors.yellow)
    console.log()
    
    // Display violation breakdown
    if (report.total > 0) {
        log('Violation Breakdown', colors.cyan + colors.bright)
        log('──────────────────', colors.cyan)
        
        if (report.critical > 0) {
            log(`  Critical: ${report.critical}`, colors.red + colors.bright)
        }
        if (report.errors > 0) {
            log(`  Errors: ${report.errors}`, colors.red)
        }
        if (report.warnings > 0) {
            log(`  Warnings: ${report.warnings}`, colors.yellow)
        }
        if (report.info > 0) {
            log(`  Info: ${report.info}`, colors.blue)
        }
        console.log()
        
        // Group violations by type
        const violationsByType = {}
        for (const violation of report.violations) {
            if (!violationsByType[violation.type]) {
                violationsByType[violation.type] = []
            }
            violationsByType[violation.type].push(violation)
        }
        
        // Display violations by type
        for (const [type, violations] of Object.entries(violationsByType)) {
            const typeTitle = type.charAt(0).toUpperCase() + type.slice(1) + ' Issues'
            log(typeTitle, colors.cyan + colors.bright)
            log('─'.repeat(typeTitle.length), colors.cyan)
            
            // Limit display to 5 per type
            const displayViolations = violations.slice(0, 5)
            
            for (const violation of displayViolations) {
                const severityColor = violation.severity === 'critical' ? colors.red + colors.bright :
                                     violation.severity === 'error' ? colors.red :
                                     violation.severity === 'warning' ? colors.yellow :
                                     colors.blue
                
                const icon = violation.severity === 'critical' ? '✗✗' :
                           violation.severity === 'error' ? '✗' :
                           violation.severity === 'warning' ? '⚠' : 'ℹ'
                
                log(`  ${icon} ${violation.message}`, severityColor)
                
                if (violation.path) {
                    log(`     Path: ${violation.path}`, colors.dim)
                }
                
                if (violation.line) {
                    log(`     Line: ${violation.line}`, colors.dim)
                }
                
                if (violation.suggestion) {
                    log(`     Suggestion: ${violation.suggestion}`, colors.cyan)
                }
            }
            
            if (violations.length > 5) {
                log(`  ... and ${violations.length - 5} more ${type} issues`, colors.dim)
            }
            
            console.log()
        }
        
        // Recommendations
        log('Recommendations', colors.cyan + colors.bright)
        log('──────────────', colors.cyan)
        
        if (report.critical > 0) {
            log('  1. Fix all critical security issues immediately', colors.red + colors.bright)
        }
        
        if (report.errors > 0) {
            log('  2. Address naming convention errors', colors.red)
            log('     - Use single-word function names (e.g., read, write, sync)', colors.dim)
            log('     - Use dot notation for groups (e.g., ip.get, status.alive)', colors.dim)
        }
        
        if (report.warnings > 0) {
            log('  3. Review and fix warnings to improve code quality', colors.yellow)
        }
        
        log('  4. Run tests after fixing issues: npm test', colors.cyan)
        log('  5. Format code: npm run format', colors.cyan)
        console.log()
        
    } else {
        log('✨ Excellent! No architecture violations found.', colors.green + colors.bright)
        log('Your codebase follows all architectural guidelines.', colors.green)
        console.log()
    }
    
    // Architecture rules summary
    log('Architecture Rules', colors.cyan + colors.bright)
    log('────────────────', colors.cyan)
    log('  • Functions: Single-word lowercase (read, write, sync)', colors.dim)
    log('  • Grouped: Dot notation (ip.get, status.alive)', colors.dim)
    log('  • Async: Use async/await over callbacks', colors.dim)
    log('  • Security: No eval, Function(), or __proto__', colors.dim)
    log('  • Testing: Maintain 80%+ coverage', colors.dim)
    console.log()
    
    log('═══════════════════════════════════════════', colors.cyan)
    console.log()
    
    // Exit code based on severity
    if (report.critical > 0 || report.errors > 5) {
        process.exit(1)
    }
}

run().catch(error => {
    log('✗ Architecture check failed:', colors.red + colors.bright)
    console.error(error)
    process.exit(1)
})