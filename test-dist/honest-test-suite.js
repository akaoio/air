/**
 * HONEST Test Suite - Tests Commands as Real Users Experience Them
 *
 * This test suite was created because the previous test suite gave false confidence.
 * It tests commands exactly as users would run them, without workarounds or PATH hacks.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
class HonestTestSuite {
    results = [];
    /**
     * Test a command exactly as user would run it
     * No PATH modifications, no special environment
     */
    testCommand(command, shouldWork) {
        const startTime = Date.now();
        const result = {
            command,
            expected: shouldWork,
            actual: false,
            duration: 0,
            status: 'FAIL'
        };
        try {
            console.log(`🧪 ${command}`);
            const output = execSync(command, {
                cwd: process.cwd(),
                timeout: 15000,
                encoding: 'utf8',
                stdio: 'pipe',
                env: process.env // Use current environment (after sourcing .zshrc)
            });
            result.actual = true;
            result.output = output.substring(0, 200) + (output.length > 200 ? '...' : '');
            result.duration = Date.now() - startTime;
            if (shouldWork) {
                result.status = 'PASS';
                console.log(`  ✅ WORKS (${result.duration}ms)`);
            }
            else {
                result.status = 'FAIL';
                console.log(`  ❌ UNEXPECTED SUCCESS (${result.duration}ms)`);
            }
        }
        catch (error) {
            result.actual = false;
            result.error = error.message;
            result.duration = Date.now() - startTime;
            if (shouldWork) {
                result.status = 'FAIL';
                console.log(`  ❌ BROKEN (${result.duration}ms): ${error.message.substring(0, 100)}`);
            }
            else {
                result.status = 'EXPECTED_FAIL';
                console.log(`  ✅ CORRECTLY FAILS (${result.duration}ms)`);
            }
        }
        this.results.push(result);
        return result;
    }
    /**
     * Test the EXACT commands users would run
     */
    runHonestTests() {
        console.log('🎯 HONEST TEST SUITE - Real User Experience');
        console.log('==========================================\n');
        console.log('📋 ESSENTIAL USER COMMANDS (must work):');
        this.testCommand('npm run status', true);
        this.testCommand('npm run config', true);
        this.testCommand('npm start --help', true);
        this.testCommand('npm test', true);
        this.testCommand('npm run build:prod', true);
        console.log('\n🚀 BUN COMMANDS (should work after PATH fix):');
        this.testCommand('bun run status', true);
        this.testCommand('bun run config', true);
        this.testCommand('bun --version', true);
        this.testCommand('bun run build:prod', true);
        console.log('\n⚠️  COMMANDS THAT SHOULD FAIL (user mistakes):');
        this.testCommand('bun status', false); // Direct bun, no npm run
        this.testCommand('air status', false); // Non-existent binary
        this.testCommand('status', false); // Command not found
        this.testCommand('air config', false); // Non-existent binary
        console.log('\n🔧 DEVELOPMENT COMMANDS:');
        this.testCommand('tsx --version', true);
        this.testCommand('npx tsx --version', true);
        this.testCommand('npm run test:quick', true);
    }
    /**
     * Generate brutally honest report
     */
    generateHonestReport() {
        console.log('\n📊 BRUTAL HONESTY REPORT');
        console.log('========================\n');
        const total = this.results.length;
        const actualPasses = this.results.filter(r => r.status === 'PASS').length;
        const failures = this.results.filter(r => r.status === 'FAIL').length;
        const expectedFails = this.results.filter(r => r.status === 'EXPECTED_FAIL').length;
        console.log(`Commands Tested: ${total}`);
        console.log(`✅ Working: ${actualPasses}`);
        console.log(`❌ Broken: ${failures}`);
        console.log(`⚠️  Expected Fails: ${expectedFails}`);
        if (failures > 0) {
            console.log('\n💥 BROKEN COMMANDS (CRITICAL ISSUES):');
            this.results.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`  ❌ ${r.command}`);
                console.log(`     Expected: ${r.expected ? 'WORK' : 'FAIL'}`);
                console.log(`     Actual: ${r.actual ? 'WORKED' : 'FAILED'}`);
                if (r.error) {
                    console.log(`     Error: ${r.error.substring(0, 80)}...`);
                }
            });
        }
        // Calculate REAL success rate (only commands that should work)
        const shouldWorkCommands = this.results.filter(r => r.expected);
        const workingCommands = shouldWorkCommands.filter(r => r.actual);
        const realSuccessRate = (workingCommands.length / shouldWorkCommands.length) * 100;
        console.log(`\n🎯 REAL SUCCESS RATE: ${realSuccessRate.toFixed(1)}%`);
        console.log(`   (${workingCommands.length}/${shouldWorkCommands.length} essential commands working)`);
        if (realSuccessRate < 90) {
            console.log('\n🚨 WARNING: Success rate below 90% - Major issues detected!');
        }
        else if (realSuccessRate < 100) {
            console.log('\n⚠️  WARNING: Some essential commands are broken');
        }
        else {
            console.log('\n🎉 EXCELLENT: All essential commands working!');
        }
        // Previous test suite comparison
        console.log('\n🔍 WHY PREVIOUS TESTS FAILED TO CATCH THESE ISSUES:');
        console.log('1. Tests used PATH modifications that users don\'t have');
        console.log('2. Tests didn\'t verify actual command execution');
        console.log('3. Tests counted fallback success as primary success');
        console.log('4. Tests didn\'t simulate fresh shell environments');
        // Save detailed results
        this.saveHonestResults();
    }
    saveHonestResults() {
        if (!fs.existsSync('tmp')) {
            fs.mkdirSync('tmp', { recursive: true });
        }
        const reportPath = 'tmp/honest-test-results.json';
        const report = {
            timestamp: new Date().toISOString(),
            testType: 'HONEST_USER_EXPERIENCE',
            environment: {
                shell: process.env.SHELL,
                path: process.env.PATH,
                bunAvailable: process.env.PATH?.includes('.bun/bin') || false,
                node: process.version,
                cwd: process.cwd()
            },
            results: this.results,
            summary: {
                total: this.results.length,
                working: this.results.filter(r => r.status === 'PASS').length,
                broken: this.results.filter(r => r.status === 'FAIL').length,
                expectedFails: this.results.filter(r => r.status === 'EXPECTED_FAIL').length,
                realSuccessRate: this.results.filter(r => r.expected && r.actual).length /
                    this.results.filter(r => r.expected).length * 100
            }
        };
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Honest results: ${reportPath}`);
    }
}
// Run the honest tests
async function runHonestTestSuite() {
    const tester = new HonestTestSuite();
    try {
        tester.runHonestTests();
        tester.generateHonestReport();
        // Exit with error code if critical commands are broken
        const broken = tester.results.filter(r => r.status === 'FAIL').length;
        if (broken > 0) {
            console.log(`\n💥 ${broken} critical commands are broken!`);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Honest test suite crashed:', error);
        process.exit(1);
    }
}
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runHonestTestSuite();
}
export { HonestTestSuite, runHonestTestSuite };
//# sourceMappingURL=honest-test-suite.js.map