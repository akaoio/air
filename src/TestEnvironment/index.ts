/**
 * Test Environment Isolation
 * Provides complete isolation for testing without affecting production
 */

import path from "path"
import fs from "fs"
import crypto from "crypto"
import type { AirConfig } from "../types/index.js"

export interface TestEnvironment {
    id: string
    name: string
    root: string
    port: number
    configFile: string
    configFileName: string // Allow custom config file names
    pidFile: string
    serviceName: string
    sslDir: string
    env: "test"
}

export class TestEnvironmentManager {
    private static BASE_TEST_DIR = "/tmp/air-test"
    private static BASE_PORT = 9000
    private static instances = new Map<string, TestEnvironment>()
    private static portCounter = 0

    /**
     * Create isolated test environment
     * @param name - Optional name for the test instance (for config name only)
     * @param configFileName - Optional custom config file name (default: 'air.json')
     */
    static create(name?: string, configFileName?: string): TestEnvironment {
        const id = crypto.randomBytes(16).toString("hex")
        const testName = name || `test-${id.slice(0, 8)}`
        const port = this.BASE_PORT + this.portCounter++
        const configName = configFileName || "air.json"

        // PID file ALWAYS uses 'test' prefix with unique ID for test environments
        const pidFileName = `.test-${id.slice(0, 8)}.pid`

        const env: TestEnvironment = {
            id,
            name: testName,
            root: path.join(this.BASE_TEST_DIR, id),
            port,
            configFile: path.join(this.BASE_TEST_DIR, id, configName),
            configFileName: configName,
            pidFile: path.join(this.BASE_TEST_DIR, id, pidFileName),
            serviceName: `air-test-${testName}`,
            sslDir: path.join(this.BASE_TEST_DIR, id, "ssl"),
            env: "test"
        }

        // Create directories
        fs.mkdirSync(env.root, { recursive: true })
        fs.mkdirSync(env.sslDir, { recursive: true })

        // Create isolated config
        const config: AirConfig = {
            name: testName,
            env: "test",
            root: env.root,
            port: env.port,
            bash: "",
            ip: {
                timeout: 5000,
                dnsTimeout: 2000,
                userAgent: "Air Test Environment",
                dns: [],
                http: []
            },
            development: {
                port: env.port,
                peers: []
            },
            production: {
                port: env.port,
                peers: []
            },
            test: {
                domain: "localhost",
                port: env.port,
                peers: []
            }
        }

        fs.writeFileSync(env.configFile, JSON.stringify(config, null, 2))

        this.instances.set(id, env)
        return env
    }

    /**
     * Cleanup test environment
     */
    static cleanup(id: string): void {
        const env = this.instances.get(id)
        if (!env) return

        // Kill any running processes
        if (fs.existsSync(env.pidFile)) {
            try {
                const pid = parseInt(fs.readFileSync(env.pidFile, "utf8"))
                process.kill(pid, "SIGKILL")
            } catch {}
        }

        // Remove service (Platform abstraction will handle OS differences)
        // This needs Platform to support test environment

        // Clean filesystem
        fs.rmSync(env.root, { recursive: true, force: true })

        this.instances.delete(id)
    }

    /**
     * Cleanup all test environments
     */
    static cleanupAll(): void {
        for (const id of this.instances.keys()) {
            this.cleanup(id)
        }

        // Clean base directory
        if (fs.existsSync(this.BASE_TEST_DIR)) {
            fs.rmSync(this.BASE_TEST_DIR, { recursive: true, force: true })
        }
    }

    /**
     * Get environment variables for test
     */
    static getEnv(env: TestEnvironment): NodeJS.ProcessEnv {
        return {
            ...process.env,
            AIR_NAME: env.name,
            AIR_ENV: "test",
            AIR_ROOT: env.root,
            AIR_PORT: env.port.toString(),
            AIR_CONFIG: env.configFile,
            AIR_PID_FILE: env.pidFile,
            AIR_SERVICE_NAME: env.serviceName,
            AIR_SSL_DIR: env.sslDir,
            AIR_TEST_MODE: "true",
            AIR_TEST_ID: env.id
        }
    }
}

export default TestEnvironmentManager
