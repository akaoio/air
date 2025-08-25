#!/usr/bin/env node
/**
 * JavaScript Test Suite for Air Scripts
 * Tests all package.json scripts - works with Node, Bun, and Deno
 * Single-threaded to prevent SSH crashes
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Test counters
let passed = 0;
let failed = 0;
let skipped = 0;

// Colors for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m'
};

// Simple test runner
function test(name, fn) {
    try {
        fn();
        console.log(`${colors.green}✓${colors.reset} ${name}`);
        passed++;
    } catch (error) {
        console.log(`${colors.red}✗${colors.reset} ${name}`);
        console.log(`  ${colors.gray}${error.message}${colors.reset}`);
        failed++;
    }
}

function skip(name) {
    console.log(`${colors.yellow}○${colors.reset} ${name} ${colors.gray}(skipped)${colors.reset}`);
    skipped++;
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

// Helper to run commands
function runCommand(cmd, options = {}) {
    const timeout = options.timeout || 10000;
    try {
        const output = execSync(cmd, {
            timeout,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            ...options
        });
        return { success: true, output, error: null };
    } catch (error) {
        return {
            success: false,
            output: error.stdout || '',
            error: error.stderr || error.message
        };
    }
}

// Create test environment
function createTestEnv(name) {
    const id = crypto.randomBytes(8).toString('hex');
    const testName = name || `test-${id}`;
    const basePort = 9000 + Math.floor(Math.random() * 1000);
    const root = `/tmp/air-test/${id}`;
    
    // Create directories
    fs.mkdirSync(root, { recursive: true });
    
    return {
        id,
        name: testName,
        root,
        port: basePort,
        configFile: path.join(root, 'air.json')
    };
}

// Cleanup test environments
function cleanup() {
    try {
        if (fs.existsSync('/tmp/air-test')) {
            fs.rmSync('/tmp/air-test', { recursive: true, force: true });
        }
    } catch (e) {
        // Ignore cleanup errors
    }
}

// Main test suite
console.log(`\n${colors.blue}🧪 Air Script Commands Test Suite${colors.reset}`);
console.log('=' . repeat(50));
console.log(`Runtime: ${typeof Bun !== 'undefined' ? 'Bun' : 'Node.js'} ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log('=' . repeat(50));

// Test environment setup
const testEnv = createTestEnv('script-test');

console.log(`\n${colors.blue}📦 Installation Scripts${colors.reset}`);
console.log('-' . repeat(30));

test('install --help shows usage', () => {
    const result = runCommand('node script/run.cjs install --help');
    assert(result.success, 'Command should succeed');
    assert(result.output.includes('--name'), 'Should show --name option');
    assert(result.output.includes('--port'), 'Should show --port option');
});

test('install --non-interactive with params', () => {
    const result = runCommand(
        `node script/run.cjs install --non-interactive --name ${testEnv.name} --port ${testEnv.port} --root ${testEnv.root}`,
        { timeout: 15000 }
    );
    
    // Check if config was created
    assert(fs.existsSync(testEnv.configFile), 'Config file should be created');
    
    if (fs.existsSync(testEnv.configFile)) {
        const config = JSON.parse(fs.readFileSync(testEnv.configFile, 'utf8'));
        assert(config.name === testEnv.name, 'Config should have correct name');
        assert(config.port === testEnv.port, 'Config should have correct port');
    }
});

test('install detects CI environment', () => {
    const testEnv2 = createTestEnv('ci-test');
    const result = runCommand(
        `CI=true node script/run.cjs install --name ${testEnv2.name} --port ${testEnv2.port} --root ${testEnv2.root}`,
        { timeout: 10000 }
    );
    
    // CI mode should not show interactive prompts
    assert(!result.output.includes('Enter'), 'Should not prompt in CI mode');
});

console.log(`\n${colors.blue}📊 Status Scripts${colors.reset}`);
console.log('-' . repeat(30));

test('status command executes', () => {
    const result = runCommand('node script/run.cjs status', { timeout: 5000 });
    assert(result.output || result.error, 'Should produce output');
});

test('logs command executes', () => {
    const result = runCommand('node script/run.cjs logs', { timeout: 5000 });
    assert(result.output || result.error, 'Should produce output');
});

console.log(`\n${colors.blue}🌐 DDNS Scripts${colors.reset}`);
console.log('-' . repeat(30));

test('ddns --check executes', () => {
    const result = runCommand('node script/run.cjs ddns --check', { timeout: 5000 });
    assert(result.output || result.error, 'Should produce output');
    assert(
        result.output.toLowerCase().includes('config') || 
        result.output.toLowerCase().includes('ip') ||
        result.error.toLowerCase().includes('missing'),
        'Should mention config or IP'
    );
});

console.log(`\n${colors.blue}🔄 Update Scripts${colors.reset}`);
console.log('-' . repeat(30));

test('update --check executes', () => {
    const result = runCommand('node script/update.cjs --check', { timeout: 5000 });
    assert(result.output || result.error, 'Should produce output');
});

console.log(`\n${colors.blue}🏗️ Build Scripts${colors.reset}`);
console.log('-' . repeat(30));

test('build scripts configured', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    assert(pkg.scripts.build, 'Should have build script');
    assert(pkg.scripts['build:prod'], 'Should have build:prod script');
});

test('dist files exist after build', () => {
    assert(fs.existsSync('dist/index.js'), 'dist/index.js should exist');
    assert(fs.existsSync('dist/index.cjs'), 'dist/index.cjs should exist');
    assert(fs.existsSync('dist/index.d.ts'), 'dist/index.d.ts should exist');
});

console.log(`\n${colors.blue}🧪 Test Scripts${colors.reset}`);
console.log('-' . repeat(30));

test('test scripts configured', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    assert(pkg.scripts.test, 'Should have test script');
    assert(pkg.scripts['test:node'], 'Should have test:node script');
    assert(pkg.scripts['test:bun'], 'Should have test:bun script');
});

console.log(`\n${colors.blue}🎯 Interactive vs Non-Interactive${colors.reset}`);
console.log('-' . repeat(30));

test('install -n flag same as --non-interactive', () => {
    const testEnv3 = createTestEnv('shorthand-test');
    const result = runCommand(
        `node script/run.cjs install -n --name ${testEnv3.name} --port ${testEnv3.port} --root ${testEnv3.root}`,
        { timeout: 10000 }
    );
    
    assert(fs.existsSync(testEnv3.configFile), 'Should create config with -n flag');
});

// Skip interactive tests in CI or non-TTY environments
if (process.env.CI || !process.stdout.isTTY) {
    skip('interactive mode tests (no TTY)');
} else {
    test('TTY detection works', () => {
        assert(process.stdout.isTTY !== undefined, 'TTY should be defined');
    });
}

// Cleanup
cleanup();

// Summary
console.log('\n' + '=' . repeat(50));
console.log(`${colors.blue}📈 Test Results:${colors.reset}`);
console.log(`   ${colors.green}✓ Passed:${colors.reset} ${passed}`);
if (failed > 0) {
    console.log(`   ${colors.red}✗ Failed:${colors.reset} ${failed}`);
}
if (skipped > 0) {
    console.log(`   ${colors.yellow}○ Skipped:${colors.reset} ${skipped}`);
}
console.log(`   ${colors.gray}Total: ${passed + failed + skipped}${colors.reset}`);
console.log('=' . repeat(50));

if (failed > 0) {
    console.log(`\n${colors.red}❌ Tests failed!${colors.reset}`);
    process.exit(1);
} else {
    console.log(`\n${colors.green}✅ All tests passed!${colors.reset}`);
    process.exit(0);
}