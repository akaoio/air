#!/usr/bin/env tsx

/**
 * Quick Test Runner for Air
 * Fast validation of core functionality
 */

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
}

console.log(`${colors.cyan}${colors.bold}Air Quick Test Runner${colors.reset}\n`)

const tests = [
    {
        name: 'Build Check',
        command: 'npm run build:prod',
        essential: true
    },
    {
        name: 'Status Command',
        command: 'npm run status -- --non-interactive 2>&1 | head -20',
        essential: true
    },
    {
        name: 'Config Command',
        command: 'echo "9" | npm run config 2>&1 | head -20',
        essential: false
    },
    {
        name: 'Install Check',
        command: 'npm run air:install -- --check --non-interactive',
        essential: true
    },
    {
        name: 'Viewport Module',
        command: 'npx tsx -e "const v = require(\'./src/UI/Viewport.ts\').default; console.log(v.width > 0 ? \'OK\' : \'FAIL\')"',
        essential: true
    },
    {
        name: 'BeautifulConsole Module',
        command: 'npx tsx -e "import { createHeader } from \'./src/UI/BeautifulConsole.js\'; console.log(\'OK\')"',
        essential: true
    }
]

let passed = 0
let failed = 0

for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `)
    
    try {
        execSync(test.command, {
            cwd: rootDir,
            stdio: 'pipe',
            timeout: 30000
        })
        console.log(`${colors.green}✓${colors.reset}`)
        passed++
    } catch (error) {
        if (test.essential) {
            console.log(`${colors.red}✗${colors.reset}`)
            failed++
        } else {
            console.log(`${colors.yellow}⚠${colors.reset}`)
        }
    }
}

console.log(`\n${colors.bold}Results:${colors.reset}`)
console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`)
console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`)

if (failed === 0) {
    console.log(`\n${colors.green}${colors.bold}✨ All essential tests passed!${colors.reset}`)
    process.exit(0)
} else {
    console.log(`\n${colors.red}${colors.bold}⚠ Some tests failed${colors.reset}`)
    process.exit(1)
}