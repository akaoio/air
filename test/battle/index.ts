#!/usr/bin/env tsx
/**
 * Air Battle Test Suite Runner
 * Main entry point for all Battle-based tests
 */

import { Battle, Runner } from '@akaoio/battle'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Create test runner
const runner = new Runner({
    verbose: process.argv.includes('--verbose'),
    timeout: 30000
})

// Add test suites
runner.addSuite('Air Script Commands', async () => {
    const { default: runTests } = await import('./scripts.battle.js')
    return runTests
})

runner.addSuite('Air Interactive Commands', async () => {
    const { default: runTests } = await import('./interactive.battle.js')
    return runTests
})

// Run all tests
async function main() {
    console.log('===========================================')
    console.log('     Air Test Suite with Battle Framework')
    console.log('===========================================\n')
    
    const report = await runner.run()
    
    // Display report
    runner.report(report)
    
    // Exit with appropriate code
    process.exit(report.failed > 0 ? 1 : 0)
}

// Execute
main().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})