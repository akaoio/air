import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

suite('uninstaller tests', () => {
    const fixturesDir = path.join(__dirname, '../fixtures')
    const uninstallScript = path.join(process.cwd(), 'uninstall.js')
    
    // Helper to create unique test directory
    function createTestDir() {
        const dir = path.join(fixturesDir, `uninstall-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        if (!fs.existsSync(fixturesDir)) {
            fs.mkdirSync(fixturesDir, { recursive: true })
        }
        fs.mkdirSync(dir, { recursive: true })
        return dir
    }
    
    // Helper to cleanup test directory
    function cleanupTestDir(dir) {
        try {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true })
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    }
    
    test('should remove PID files', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Create PID files
            const pidFile1 = path.join(testDir, '.air-test1.pid')
            const pidFile2 = path.join(testDir, '.air-test2.pid')
            fs.writeFileSync(pidFile1, '12345')
            fs.writeFileSync(pidFile2, '67890')
            
            // Verify files exist
            assert(fs.existsSync(pidFile1), 'PID file 1 should exist')
            assert(fs.existsSync(pidFile2), 'PID file 2 should exist')
            
            // Action: Run uninstaller
            try {
                execSync(`node ${uninstallScript} --root ${testDir}`, {
                    stdio: 'pipe'
                })
            } catch (e) {
                // Continue to check result
            }
            
            // Output: PID files should be removed
            assert(!fs.existsSync(pidFile1), 'PID file 1 should be removed')
            assert(!fs.existsSync(pidFile2), 'PID file 2 should be removed')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should read name from config file', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Config file with peer name
            const configPath = path.join(testDir, 'air.json')
            const config = {
                name: 'test-peer-name',
                env: 'development'
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            
            // Action: Run uninstaller without name parameter
            let output = ''
            try {
                output = execSync(`node ${uninstallScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should use name from config
            assert(output.includes('test-peer-name') || output.includes('air-test-peer-name'),
                'Should use peer name from config')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should handle missing config gracefully', () => {
        const testDir = createTestDir()
        
        try {
            // Input: No config file
            const configPath = path.join(testDir, 'air.json')
            assert(!fs.existsSync(configPath), 'Config should not exist')
            
            // Action: Run uninstaller
            let failed = false
            let output = ''
            try {
                output = execSync(`node ${uninstallScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                failed = true
                output = e.stdout?.toString() || e.stderr?.toString() || ''
            }
            
            // Expect: Should use default name 'air'
            assert(!failed || output.includes('air'), 
                'Should handle missing config and use default name')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should handle malformed config', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Malformed JSON config
            const configPath = path.join(testDir, 'air.json')
            fs.writeFileSync(configPath, '{ invalid json }')
            
            // Action: Run uninstaller
            let output = ''
            try {
                output = execSync(`node ${uninstallScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should handle gracefully and use default
            assert(output.includes('Warning') || output.includes('air'),
                'Should handle malformed config gracefully')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should remove cron jobs', () => {
        // This test verifies the uninstaller attempts to remove cron jobs
        // Without actually modifying system cron
        
        const testDir = createTestDir()
        
        try {
            // Action: Run uninstaller
            let output = ''
            try {
                output = execSync(`node ${uninstallScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should mention cron job removal
            assert(output.includes('cron') || output.includes('Cron'),
                'Should attempt to remove cron jobs')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should handle service removal', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Peer name for service
            const configPath = path.join(testDir, 'air.json')
            fs.writeFileSync(configPath, JSON.stringify({ name: 'test-service' }, null, 2))
            
            // Action: Run uninstaller
            let output = ''
            try {
                output = execSync(`node ${uninstallScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should attempt to remove service with correct name
            assert(output.includes('air-test-service') || output.includes('service'),
                'Should attempt to remove systemd service with correct name')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should clean all PID files with pattern', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Multiple PID files with different patterns
            const files = [
                '.air-peer1.pid',
                '.air-peer2.pid',
                '.air-localhost.pid',
                'not-a-pid.txt',
                'air.json'
            ]
            
            files.forEach(file => {
                fs.writeFileSync(path.join(testDir, file), 'test')
            })
            
            // Action: Run uninstaller
            try {
                execSync(`node ${uninstallScript} --root ${testDir}`, {
                    stdio: 'pipe'
                })
            } catch (e) {
                // Check result
            }
            
            // Expect: Only .air-*.pid files should be removed
            assert(!fs.existsSync(path.join(testDir, '.air-peer1.pid')), 
                '.air-peer1.pid should be removed')
            assert(!fs.existsSync(path.join(testDir, '.air-peer2.pid')), 
                '.air-peer2.pid should be removed')
            assert(!fs.existsSync(path.join(testDir, '.air-localhost.pid')), 
                '.air-localhost.pid should be removed')
            assert(fs.existsSync(path.join(testDir, 'not-a-pid.txt')), 
                'not-a-pid.txt should not be removed')
            assert(fs.existsSync(path.join(testDir, 'air.json')), 
                'air.json should not be removed')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should handle permission errors gracefully', () => {
        const testDir = createTestDir()
        
        try {
            // Input: PID file with restricted permissions
            const pidFile = path.join(testDir, '.air-test.pid')
            fs.writeFileSync(pidFile, '12345')
            fs.chmodSync(pidFile, 0o000) // No permissions
            
            // Action: Run uninstaller
            let failed = false
            let output = ''
            try {
                output = execSync(`node ${uninstallScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should handle permission error gracefully
            assert(output.includes('failed') || output.includes('error') || 
                   output.includes('Warning') || output.includes('UNINSTALLED'),
                'Should handle permission errors gracefully')
            
            // Cleanup
            try {
                fs.chmodSync(pidFile, 0o644)
                fs.unlinkSync(pidFile)
            } catch (e) {
                // Ignore
            }
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should accept name parameter', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Name via command line
            const testName = 'custom-peer-name'
            
            // Action: Run uninstaller with name parameter
            let output = ''
            try {
                output = execSync(`node ${uninstallScript} --name ${testName} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should use provided name
            assert(output.includes(testName) || output.includes(`air-${testName}`),
                'Should use name from command line parameter')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should complete even if service does not exist', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Non-existent service name
            const configPath = path.join(testDir, 'air.json')
            fs.writeFileSync(configPath, JSON.stringify({ 
                name: 'non-existent-service-12345' 
            }, null, 2))
            
            // Action: Run uninstaller
            let output = ''
            let exitCode = 0
            try {
                output = execSync(`node ${uninstallScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                exitCode = e.status || 1
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should complete successfully even if service doesn't exist
            assert(output.includes('UNINSTALLED') || output.includes('not found') || 
                   output.includes('not running'),
                'Should complete even if service does not exist')
            assert(exitCode === 0 || output.includes('UNINSTALLED'),
                'Should not fail when service does not exist')
        } finally {
            cleanupTestDir(testDir)
        }
    })
})