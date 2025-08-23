/**
 * Test setup for Bun
 * Configure test environment
 */
// Set test environment
process.env.NODE_ENV = 'test';
process.env.ENV = 'test';
// Mock console for cleaner test output
const originalConsole = { ...console };
export const mockConsole = () => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
};
export const restoreConsole = () => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
};
globalThis.testDir = '/tmp/air-test-' + Date.now();
globalThis.cleanupDirs = [];
// Cleanup after all tests
afterAll(() => {
    // Clean up test directories
    if (globalThis.cleanupDirs.length > 0) {
        const fs = require('fs');
        for (const dir of globalThis.cleanupDirs) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
});
// Test timeout
jest.setTimeout(10000);
//# sourceMappingURL=setup.js.map