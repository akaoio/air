/**
 * @akaoio/air - Battle Test Configuration  
 * Using @akaoio/battle for comprehensive testing
 */

export default {
    name: "@akaoio/air",
    
    // Test configuration
    tests: {
        // Unit tests
        unit: {
            pattern: "src/**/*.test.ts",
            framework: "battle",
            timeout: 30000
        },
        
        // Integration tests
        integration: {
            pattern: "tests/integration/**/*.test.ts", 
            timeout: 60000,
            parallel: false  // Air tests need to run sequentially due to singleton
        },
        
        // E2E tests for distributed functionality
        e2e: {
            pattern: "tests/e2e/**/*.test.ts",
            timeout: 120000,
            parallel: false
        }
    },
    
    // Test environment setup
    environment: {
        // Force development mode for testing
        NODE_ENV: "test",
        FORCE_AIR: "true",  // Bypass singleton for tests
        
        // Test-specific Air configuration
        AIR_TEST_PORT_START: "9000",
        AIR_TEST_DATA_DIR: "./tmp/test-data"
    },
    
    // Coverage settings
    coverage: {
        enabled: true,
        threshold: {
            statements: 80,
            branches: 75,
            functions: 80,
            lines: 80
        },
        exclude: [
            "dist/**",
            "**/*.test.ts",
            "**/*.spec.ts"
        ]
    },
    
    // PTY testing for terminal interactions
    pty: {
        enabled: true,
        tests: [
            {
                name: "air-startup",
                command: "node dist/main.js",
                expect: "Server started successfully",
                timeout: 10000,
                env: { FORCE_AIR: "true" }
            },
            {
                name: "air-singleton-block", 
                command: "node dist/main.js",
                expect: "Another Air instance is running",
                timeout: 5000,
                // Don't use FORCE_AIR to test singleton
                env: {}
            }
        ]
    }
}