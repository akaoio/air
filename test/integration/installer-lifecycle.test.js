import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

suite('installer lifecycle integration tests', () => {
    const fixturesDir = path.join(__dirname, '../fixtures')
    const testDir = path.join(fixturesDir, `lifecycle-test-${Date.now()}`)
    const scripts = {
        install: path.join(process.cwd(), 'install.js'),
        uninstall: path.join(process.cwd(), 'uninstall.js'),
        update: path.join(process.cwd(), 'update.js'),
        ddns: path.join(process.cwd(), 'ddns.js')
    }
    
    setup(() => {
        if (!fs.existsSync(fixturesDir)) {
            fs.mkdirSync(fixturesDir, { recursive: true })
        }
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true })
        }
    })
    
    teardown(() => {
        try {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true })
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    })
    
    test('should complete full install -> update -> uninstall cycle', () => {
        const peerName = 'lifecycle-test'
        const configPath = path.join(testDir, 'air.json')
        
        // Step 1: Install
        // Input: Clean directory
        assert(!fs.existsSync(configPath), 'Should start with no config')
        
        // Action: Install
        try {
            execSync(`node ${scripts.install} --root ${testDir} --name ${peerName} --env development --port 9876 --non-interactive`, {
                stdio: 'pipe'
            })
        } catch (e) {
            // May fail on service creation, but config should exist
        }
        
        // Output: Config created with correct values
        assert(fs.existsSync(configPath), 'Config should be created after install')
        let config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        assert(config.name === peerName, 'Name should match')
        assert(config.development.port === 9876, 'Port should be set')
        
        // Step 2: Update
        // Input: Existing installation
        const originalModTime = fs.statSync(configPath).mtime
        
        // Simulate git repo for update test
        const gitDir = path.join(testDir, '.git')
        fs.mkdirSync(gitDir)
        fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main')
        
        // Action: Update
        let updateOutput = ''
        try {
            updateOutput = execSync(`node ${scripts.update}`, {
                cwd: testDir,
                encoding: 'utf8',
                stdio: 'pipe'
            }).toString()
        } catch (e) {
            updateOutput = e.stdout?.toString() || ''
        }
        
        // Output: Update attempted
        assert(updateOutput.includes('Update') || updateOutput.includes('update'),
            'Should attempt update')
        
        // Step 3: DDNS check
        // Action: Run DDNS
        let ddnsOutput = ''
        try {
            ddnsOutput = execSync(`timeout 10 node ${scripts.ddns} --root ${testDir}`, {
                encoding: 'utf8',
                stdio: 'pipe'
            }).toString()
        } catch (e) {
            ddnsOutput = e.stdout?.toString() || ''
        }
        
        // Output: DDNS should run and detect IP
        assert(ddnsOutput.includes('Detected IP') || ddnsOutput.includes('Attempting'),
            'DDNS should attempt IP detection')
        
        // Verify ddns.json created
        const ddnsPath = path.join(testDir, 'ddns.json')
        assert(fs.existsSync(ddnsPath), 'ddns.json should be created')
        
        // Step 4: Uninstall
        // Input: Installed system with config and ddns.json
        
        // Create PID files to test cleanup
        const pidFile = path.join(testDir, `.air-${peerName}.pid`)
        fs.writeFileSync(pidFile, '12345')
        
        // Action: Uninstall
        let uninstallOutput = ''
        try {
            uninstallOutput = execSync(`node ${scripts.uninstall} --root ${testDir}`, {
                encoding: 'utf8',
                stdio: 'pipe'
            }).toString()
        } catch (e) {
            uninstallOutput = e.stdout?.toString() || ''
        }
        
        // Output: Should uninstall and clean up
        assert(uninstallOutput.includes('UNINSTALLED'), 'Should complete uninstall')
        assert(!fs.existsSync(pidFile), 'PID file should be removed')
        
        // Config should still exist (uninstaller doesn't remove it)
        assert(fs.existsSync(configPath), 'Config file should remain after uninstall')
    })
    
    test('should handle reinstallation with config preservation', () => {
        const configPath = path.join(testDir, 'air.json')
        
        // First installation
        try {
            execSync(`node ${scripts.install} --root ${testDir} --name first-install --env production --port 8888 --non-interactive`, {
                stdio: 'pipe'
            })
        } catch (e) {
            // Continue
        }
        
        // Verify first install
        let config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        assert(config.name === 'first-install', 'First install name should be set')
        assert(config.production.port === 8888, 'First install port should be set')
        
        // Add custom field to config
        config.customField = 'should-be-preserved'
        config.production.customSetting = 'also-preserved'
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
        
        // Reinstall with different name
        try {
            execSync(`node ${scripts.install} --root ${testDir} --name second-install --non-interactive`, {
                stdio: 'pipe'
            })
        } catch (e) {
            // Continue
        }
        
        // Verify preservation
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        assert(config.name === 'second-install', 'Name should be updated')
        assert(config.customField === 'should-be-preserved', 'Custom field should be preserved')
        assert(config.production.customSetting === 'also-preserved', 'Custom setting should be preserved')
        assert(config.production.port === 8888, 'Port should be preserved')
    })
    
    test('should maintain data consistency across operations', () => {
        const configPath = path.join(testDir, 'air.json')
        const ddnsPath = path.join(testDir, 'ddns.json')
        
        // Install with specific configuration
        const testConfig = {
            name: 'consistency-test',
            env: 'production',
            domain: 'test.example.com',
            port: 7777
        }
        
        try {
            execSync(`node ${scripts.install} --root ${testDir} --name ${testConfig.name} --env ${testConfig.env} --domain ${testConfig.domain} --port ${testConfig.port} --non-interactive`, {
                stdio: 'pipe'
            })
        } catch (e) {
            // Continue
        }
        
        // Run DDNS to create state
        try {
            execSync(`timeout 10 node ${scripts.ddns} --root ${testDir}`, {
                stdio: 'pipe'
            })
        } catch (e) {
            // Continue
        }
        
        // Verify both files exist and are valid JSON
        assert(fs.existsSync(configPath), 'Config should exist')
        assert(fs.existsSync(ddnsPath), 'DDNS state should exist')
        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        const ddnsState = JSON.parse(fs.readFileSync(ddnsPath, 'utf8'))
        
        // Verify data consistency
        assert(config.name === testConfig.name, 'Config name should match')
        assert(config.env === testConfig.env, 'Config env should match')
        assert(config.production.domain === testConfig.domain, 'Domain should match')
        assert(config.production.port === testConfig.port, 'Port should match')
        
        // DDNS state should have required fields
        assert(ddnsState.newIP, 'DDNS should have newIP')
        assert(ddnsState.timestamp, 'DDNS should have timestamp')
        assert(typeof ddnsState.timestamp === 'number', 'Timestamp should be number')
    })
    
    test('should handle error recovery in lifecycle', () => {
        const configPath = path.join(testDir, 'air.json')
        
        // Create corrupted config
        fs.writeFileSync(configPath, '{ broken json')
        
        // Try to run DDNS with corrupted config
        let ddnsFailed = false
        try {
            execSync(`timeout 5 node ${scripts.ddns} --root ${testDir}`, {
                stdio: 'pipe'
            })
        } catch (e) {
            ddnsFailed = true
        }
        
        // Should handle corrupted config gracefully
        assert(ddnsFailed, 'Should fail with corrupted config')
        
        // Fix config and retry
        const validConfig = {
            name: 'recovery-test',
            env: 'development',
            development: { port: 8765 }
        }
        fs.writeFileSync(configPath, JSON.stringify(validConfig, null, 2))
        
        // Should work after fix
        let ddnsOutput = ''
        try {
            ddnsOutput = execSync(`timeout 10 node ${scripts.ddns} --root ${testDir}`, {
                encoding: 'utf8',
                stdio: 'pipe'
            }).toString()
        } catch (e) {
            ddnsOutput = e.stdout?.toString() || ''
        }
        
        assert(ddnsOutput.includes('development'), 'Should work after config fix')
    })
    
    test('should validate inter-script dependencies', () => {
        // This test ensures scripts can work together correctly
        
        // Install creates config that other scripts can read
        try {
            execSync(`node ${scripts.install} --root ${testDir} --name deps-test --non-interactive`, {
                stdio: 'pipe'
            })
        } catch (e) {
            // Continue
        }
        
        const configPath = path.join(testDir, 'air.json')
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        
        // Uninstall should read the name from config
        let uninstallOutput = ''
        try {
            // Don't pass name, let it read from config
            uninstallOutput = execSync(`node ${scripts.uninstall} --root ${testDir}`, {
                encoding: 'utf8',
                stdio: 'pipe'
            }).toString()
        } catch (e) {
            uninstallOutput = e.stdout?.toString() || ''
        }
        
        // Should use name from config file
        assert(uninstallOutput.includes('deps-test'), 
            'Uninstall should read name from config created by install')
        
        // DDNS should read env from config
        let ddnsOutput = ''
        try {
            ddnsOutput = execSync(`timeout 5 node ${scripts.ddns} --root ${testDir}`, {
                encoding: 'utf8',
                stdio: 'pipe'
            }).toString()
        } catch (e) {
            ddnsOutput = e.stdout?.toString() || ''
        }
        
        assert(ddnsOutput.includes(config.env), 
            'DDNS should read environment from config')
    })
})