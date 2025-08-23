/**
 * Run new comprehensive test suites
 * Tests the foundation classes with new architecture
 */
import { spawn } from 'child_process';
const testFiles = [
    'test/classes/Config.test.ts',
    'test/classes/Manager.test.ts'
];
async function runTest(testFile) {
    return new Promise((resolve) => {
        console.log(`\n🧪 Running ${testFile}...`);
        const child = spawn('npx', ['jest', testFile, '--verbose'], {
            stdio: 'inherit',
            shell: true
        });
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${testFile} PASSED`);
                resolve(true);
            }
            else {
                console.log(`❌ ${testFile} FAILED (exit code: ${code})`);
                resolve(false);
            }
        });
        child.on('error', (err) => {
            console.error(`❌ Error running ${testFile}:`, err);
            resolve(false);
        });
    });
}
async function main() {
    console.log('🚀 Running new comprehensive test suites...');
    console.log('='.repeat(60));
    let passed = 0;
    let failed = 0;
    for (const testFile of testFiles) {
        const result = await runTest(testFile);
        if (result) {
            passed++;
        }
        else {
            failed++;
        }
    }
    console.log('\n' + '='.repeat(60));
    console.log('📊 NEW TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total:  ${passed + failed}`);
    if (failed === 0) {
        console.log('\n🎉 ALL NEW TESTS PASSED!');
        console.log('Foundation phase complete - ready for other agents!');
        process.exit(0);
    }
    else {
        console.log(`\n💥 ${failed} test suites failed`);
        console.log('Foundation phase needs fixing before other agents can start');
        process.exit(1);
    }
}
main().catch((err) => {
    console.error('Test runner failed:', err);
    process.exit(1);
});
//# sourceMappingURL=run-new-tests.js.map