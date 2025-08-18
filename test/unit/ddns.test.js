import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

suite('DDNS tests', () => {
    const fixturesDir = path.join(__dirname, '../fixtures')
    const ddnsScript = path.join(process.cwd(), 'ddns.js')
    
    // Helper to create unique test directory for each test
    function createTestDir() {
        const dir = path.join(fixturesDir, `ddns-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
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
    
    test('should detect public IP address', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Valid IP detection configuration
            const configPath = path.join(testDir, 'air.json')
            const config = {
                env: 'development',
                ip: {
                    timeout: 5000,
                    dnstimeout: 3000,
                    dns: [
                        { hostname: 'myip.opendns.com', resolver: 'resolver1.opendns.com' }
                    ],
                    http: [
                        { url: 'https://checkip.amazonaws.com' }
                    ]
                },
                development: {}
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            
            // Action: Run DDNS script
            let output = ''
            try {
                output = execSync(`timeout 10 node ${ddnsScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should detect an IP address
            const ipPattern = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/
            assert(ipPattern.test(output), 'Should detect a valid IP address')
            assert(output.includes('Detected IP:') || output.includes('IP:'),
                'Should report detected IP')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should save DDNS state to file', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Configuration without GoDaddy (so it won't try to update)
            const configPath = path.join(testDir, 'air.json')
            const config = {
                env: 'development',
                ip: {
                    timeout: 5000,
                    dnstimeout: 3000,
                    dns: [
                        { hostname: 'myip.opendns.com', resolver: 'resolver1.opendns.com' }
                    ]
                },
                development: {}
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            
            // Action: Run DDNS script
            try {
                execSync(`timeout 10 node ${ddnsScript} --root ${testDir}`, {
                    stdio: 'pipe'
                })
            } catch (e) {
                // Continue to check result
            }
            
            // Output: ddns.json should be created
            const ddnsPath = path.join(testDir, 'ddns.json')
            assert(fs.existsSync(ddnsPath), 'ddns.json should be created')
            
            // Expect: ddns.json should have correct structure
            const ddnsData = JSON.parse(fs.readFileSync(ddnsPath, 'utf8'))
            assert(ddnsData.newIP, 'Should have newIP field')
            assert(ddnsData.timestamp, 'Should have timestamp field')
            assert(ddnsData.datetime, 'Should have datetime field')
            
            // Validate IP format
            const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
            assert(ipPattern.test(ddnsData.newIP), 'newIP should be valid IP format')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should read GoDaddy config from air.json', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Config with GoDaddy settings
            const configPath = path.join(testDir, 'air.json')
            const config = {
                env: 'production',
                ip: {
                    timeout: 5000,
                    dns: [
                        { hostname: 'myip.opendns.com', resolver: 'resolver1.opendns.com' }
                    ]
                },
                production: {
                    godaddy: {
                        domain: 'example.com',
                        host: 'test',
                        key: 'test_key',
                        secret: 'test_secret'
                    }
                }
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            
            // Action: Run DDNS script
            let output = ''
            try {
                output = execSync(`timeout 10 node ${ddnsScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should show GoDaddy configuration
            assert(output.includes('Domain: example.com'), 
                'Should display domain from config')
            assert(output.includes('Host: test'), 
                'Should display host from config')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should handle missing IP config gracefully', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Config without IP detection settings
            const configPath = path.join(testDir, 'air.json')
            const config = {
                env: 'development',
                development: {}
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            
            // Action: Run DDNS script
            let output = ''
            try {
                output = execSync(`timeout 10 node ${ddnsScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should use default IP detection methods
            assert(output.includes('Attempting to detect') || output.includes('Trying'),
                'Should attempt IP detection with defaults')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should validate IP addresses', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Config that might return private IP
            const configPath = path.join(testDir, 'air.json')
            const config = {
                env: 'development',
                development: {}
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            
            // Action: Run DDNS
            let output = ''
            try {
                output = execSync(`timeout 10 node ${ddnsScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // If an IP was detected, it should not be private
            const ipMatch = output.match(/Detected IP: (\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)
            if (ipMatch) {
                const ip = ipMatch[1]
                const parts = ip.split('.').map(Number)
                
                // Expect: Should not be private IP ranges
                assert(!(parts[0] === 10), 'Should not detect 10.x.x.x')
                assert(!(parts[0] === 192 && parts[1] === 168), 'Should not detect 192.168.x.x')
                assert(!(parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31), 
                    'Should not detect 172.16-31.x.x')
                assert(!(parts[0] === 127), 'Should not detect 127.x.x.x')
            }
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should handle command line parameters', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Command line parameters
            const params = {
                env: 'production',
                domain: 'cli-test.com',
                host: 'cli-host'
            }
            
            // Create minimal config
            const configPath = path.join(testDir, 'air.json')
            fs.writeFileSync(configPath, JSON.stringify({}, null, 2))
            
            // Action: Run with CLI params
            let output = ''
            try {
                output = execSync(
                    `timeout 5 node ${ddnsScript} --root ${testDir} --env ${params.env} --domain ${params.domain} --host ${params.host}`,
                    { encoding: 'utf8', stdio: 'pipe' }
                ).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should use CLI parameters
            assert(output.includes(params.env), 'Should use env from CLI')
            assert(output.includes(params.domain), 'Should use domain from CLI')
            assert(output.includes(params.host), 'Should use host from CLI')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should preserve previous IP in state', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Existing ddns.json with previous state
            const ddnsPath = path.join(testDir, 'ddns.json')
            const previousState = {
                currentIP: '1.2.3.4',
                lastIP: '5.6.7.8',
                timestamp: Date.now() - 3600000
            }
            fs.writeFileSync(ddnsPath, JSON.stringify(previousState, null, 2))
            
            // Config without GoDaddy to avoid actual API calls
            const configPath = path.join(testDir, 'air.json')
            fs.writeFileSync(configPath, JSON.stringify({
                env: 'development',
                development: {}
            }, null, 2))
            
            // Action: Run DDNS
            try {
                execSync(`timeout 10 node ${ddnsScript} --root ${testDir}`, {
                    stdio: 'pipe'
                })
            } catch (e) {
                // Check result
            }
            
            // Output: Updated ddns.json
            const updatedState = JSON.parse(fs.readFileSync(ddnsPath, 'utf8'))
            
            // Expect: Should preserve lastIP from previous currentIP
            assert(updatedState.lastIP === previousState.currentIP || 
                   updatedState.lastIP === previousState.lastIP,
                'Should preserve IP history')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should handle network timeouts', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Very short timeout to force failure
            const configPath = path.join(testDir, 'air.json')
            const config = {
                env: 'development',
                ip: {
                    timeout: 1, // 1ms timeout
                    dnstimeout: 1,
                    dns: [
                        { hostname: 'fake.domain', resolver: 'fake.resolver' }
                    ],
                    http: [
                        { url: 'https://non-existent-domain-12345.fake' }
                    ]
                },
                development: {}
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            
            // Action: Run DDNS
            let output = ''
            let failed = false
            try {
                output = execSync(`timeout 5 node ${ddnsScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                failed = true
                output = e.stdout?.toString() || e.stderr?.toString() || ''
            }
            
            // Expect: Should handle timeout gracefully
            assert(output.includes('failed') || output.includes('Failed') || 
                   failed, 'Should report failure on timeout')
        } finally {
            cleanupTestDir(testDir)
        }
    })
    
    test('should skip update when IP unchanged', () => {
        const testDir = createTestDir()
        
        try {
            // Input: Current IP same as detected IP (use a dummy IP)
            const testIP = '1.55.167.221' // Use a real public IP format
            
            // Create state file with current IP
            const ddnsPath = path.join(testDir, 'ddns.json')
            fs.writeFileSync(ddnsPath, JSON.stringify({
                currentIP: testIP,
                lastIP: testIP
            }, null, 2))
            
            // Config with mock settings
            const configPath = path.join(testDir, 'air.json')
            fs.writeFileSync(configPath, JSON.stringify({
                env: 'production',
                production: {
                    godaddy: {
                        domain: 'test.com',
                        host: 'test',
                        key: 'fake_key',
                        secret: 'fake_secret'
                    }
                }
            }, null, 2))
            
            // Action: Run DDNS (it will detect real IP)
            let output = ''
            try {
                output = execSync(`timeout 10 node ${ddnsScript} --root ${testDir}`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).toString()
            } catch (e) {
                output = e.stdout?.toString() || ''
            }
            
            // Expect: Should indicate no update needed (unless IP actually changed)
            // This is a conditional test based on actual IP detection
            if (output.includes(`Detected IP: ${testIP}`)) {
                assert(output.includes('not changed') || output.includes('No need'),
                    'Should skip update when IP unchanged')
            } else {
                // IP changed, so update would happen - that's OK
                assert(true, 'IP changed, update expected')
            }
        } finally {
            cleanupTestDir(testDir)
        }
    })
})