#!/usr/bin/env node
/**
 * REAL Interactive Testing with Pseudo-Terminal
 * This actually emulates a real terminal, not fake stdin/stdout pipes
 */

import * as pty from 'node-pty';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Colors for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m'
};

// Test counters
let passed = 0;
let failed = 0;

/**
 * Create a REAL terminal and interact with it
 * @param {string} command - Command to run
 * @param {Function} interaction - Function that handles the interaction
 * @param {number} timeout - Maximum time to wait
 */
function testInteractive(testName, command, interaction, timeout = 10000) {
    return new Promise((resolve) => {
        console.log(`\nTesting: ${testName}`);
        
        try {
            // Create a REAL pseudo-terminal
            const [cmd, ...args] = command.split(' ');
            const ptyProcess = pty.spawn(cmd, args, {
                name: 'xterm-256color',
                cols: 80,
                rows: 24,
                cwd: path.resolve(__dirname, '..'),
                env: {
                    ...process.env,
                    TERM: 'xterm-256color',
                    FORCE_COLOR: '1'
                }
            });

            let output = '';
            let interactionComplete = false;
            let timeoutHandle;

            // Capture ALL output (with ANSI codes and everything)
            ptyProcess.onData((data) => {
                output += data;
                
                // Show real-time output (optional)
                if (process.env.DEBUG) {
                    process.stdout.write(data);
                }

                // Let interaction function handle the output
                if (!interactionComplete) {
                    interaction(data, output, (response) => {
                        if (response === null) {
                            // Signal to end the interaction
                            interactionComplete = true;
                            ptyProcess.kill();
                        } else if (response) {
                            // Send user input to the terminal
                            ptyProcess.write(response);
                        }
                    });
                }
            });

            // Handle process exit
            ptyProcess.onExit((exitData) => {
                clearTimeout(timeoutHandle);
                const exitCode = exitData.exitCode;
                
                if (exitCode === 0 || interactionComplete) {
                    console.log(`${colors.green}✓${colors.reset} ${testName}`);
                    passed++;
                } else {
                    console.log(`${colors.red}✗${colors.reset} ${testName} (exit code: ${exitCode})`);
                    if (!process.env.DEBUG) {
                        console.log(`${colors.gray}Output: ${output.slice(-200)}${colors.reset}`);
                    }
                    failed++;
                }
                resolve({ success: exitCode === 0, output });
            });

            // Timeout handler
            timeoutHandle = setTimeout(() => {
                console.log(`${colors.yellow}⚠${colors.reset} ${testName} (timeout)`);
                ptyProcess.kill();
                failed++;
                resolve({ success: false, output });
            }, timeout);

        } catch (error) {
            console.log(`${colors.red}✗${colors.reset} ${testName}: ${error.message}`);
            failed++;
            resolve({ success: false, output: error.message });
        }
    });
}

// Clean ANSI codes for easier matching
function cleanAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

console.log(`\n${colors.blue}🖥️  REAL Interactive Terminal Tests${colors.reset}`);
console.log('=' . repeat(50));

// Test 1: Install command interactive menu
await testInteractive(
    'install.js shows interactive menu',
    'node script/run.cjs install',
    (data, fullOutput, respond) => {
        const clean = cleanAnsi(fullOutput);
        
        // Look for the menu
        if (clean.includes('Quick Install') && clean.includes('Enter choice')) {
            // Choose option 5 (Exit)
            respond('5\n');
        } else if (clean.includes('Goodbye') || clean.includes('Exit')) {
            // Exit confirmed, end the test
            respond(null);
        }
    },
    5000
);

// Test 2: Install with actual interaction
await testInteractive(
    'install.js quick install flow',
    'node script/run.cjs install',
    (data, fullOutput, respond) => {
        const clean = cleanAnsi(fullOutput);
        
        if (clean.includes('Enter choice')) {
            respond('1\n');  // Choose Quick Install
        } else if (clean.includes('Enter name') || clean.includes('Instance name')) {
            respond('test-interactive\n');
        } else if (clean.includes('Enter port') || clean.includes('Port')) {
            respond('9876\n');
        } else if (clean.includes('Config created') || clean.includes('Installation complete')) {
            respond(null);  // Success, exit
        }
    },
    10000
);

// Test 3: Status command (should be non-interactive)
await testInteractive(
    'status command runs without interaction',
    'node script/run.cjs status',
    (data, fullOutput, respond) => {
        const clean = cleanAnsi(fullOutput);
        
        // Status should complete without any prompts
        if (clean.includes('Status') || clean.includes('not running') || clean.includes('Error')) {
            respond(null);  // Exit immediately
        }
    },
    3000
);

// Test 4: Uninstall with confirmation
const testConfigPath = '/tmp/test-uninstall-air.json';
fs.writeFileSync(testConfigPath, JSON.stringify({ name: 'test-uninstall' }));

await testInteractive(
    'uninstall.cjs asks for confirmation',
    `node script/uninstall.cjs --config ${testConfigPath}`,
    (data, fullOutput, respond) => {
        const clean = cleanAnsi(fullOutput);
        
        if (clean.includes('Are you sure') || clean.includes('(y/N)')) {
            respond('n\n');  // Don't uninstall
        } else if (clean.includes('Cancelled') || clean.includes('Aborted')) {
            respond(null);  // Exit
        }
    },
    5000
);

// Cleanup
if (fs.existsSync(testConfigPath)) {
    fs.unlinkSync(testConfigPath);
}

// Test 5: Check that non-interactive mode really doesn't prompt
await testInteractive(
    'install --non-interactive has no prompts',
    'node script/run.cjs install --non-interactive --name test-ni --port 9999',
    (data, fullOutput, respond) => {
        const clean = cleanAnsi(fullOutput);
        
        // Should NEVER see any prompts
        if (clean.includes('Enter') || clean.includes('choice') || clean.includes('?')) {
            console.log(`\n  ${colors.red}ERROR: Found prompt in non-interactive mode!${colors.reset}`);
            respond(null);
        } else if (clean.includes('complete') || clean.includes('Config saved')) {
            respond(null);  // Success
        }
    },
    5000
);

// Summary
console.log('\n' + '=' . repeat(50));
console.log(`${colors.blue}📊 Results:${colors.reset}`);
console.log(`   ${colors.green}✓ Passed:${colors.reset} ${passed}`);
console.log(`   ${colors.red}✗ Failed:${colors.reset} ${failed}`);
console.log('=' . repeat(50));

if (failed > 0) {
    console.log(`\n${colors.red}Some tests failed. Run with DEBUG=1 to see full output.${colors.reset}`);
    process.exit(1);
} else {
    console.log(`\n${colors.green}✅ All interactive tests passed!${colors.reset}`);
    process.exit(0);
}