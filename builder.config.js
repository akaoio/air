/**
 * @akaoio/air - Builder Configuration
 * Using @akaoio/builder for TypeScript compilation
 */

export default {
    // Entry points - core Air P2P functionality (stacker integration via shell)
    entry: [
        "src/index.ts",
        "src/main.ts", 
        "src/db.ts",
        "src/peer.ts",
        "src/config.ts", 
        "src/lock-manager.ts",
        "src/utils.ts",
        "src/xdg-paths.ts",
        "src/types.ts",
        // "src/stacker.ts",  // Disabled: Stacker integration via shell layer
        "src/cli.ts"
    ],
    
    // Build target - library for npm package
    target: "library",
    
    // Output formats
    formats: ["esm", "cjs"],
    
    // Fix module resolution - enable proper splitting
    format: {
        cjs: {
            splitting: true,
            interop: "auto"
        },
        esm: {
            splitting: true
        }
    },
    
    // TypeScript settings
    dts: false,         // Skip .d.ts files (has errors)
    sourcemap: true,    // Generate source maps
    
    // Clean dist before build
    clean: true,
    
    // External dependencies - don't bundle
    external: [
        "@akaoio/gun", 
        // "@akaoio/stacker",  // Removed: Not an npm package
        "node:http",
        "node:https", 
        "node:fs",
        "node:os",
        "node:child_process",
        "node:net",
        "node:url",
        "node:path",
        "child_process"
    ],
    
    // Bundle internal modules properly
    bundle: false,  // Let Builder handle module resolution
    noExternal: ["@akaoio/gun"],  // Bundle only specific dependencies
    
    // Platform target
    platform: "node"
}