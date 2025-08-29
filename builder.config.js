/**
 * @akaoio/air - Builder Configuration
 * Using @akaoio/builder for TypeScript compilation
 */

export default {
    // Entry points - core Air P2P functionality with Stacker integration
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
        "src/stacker.ts",  // Re-enabled: Uses @akaoio/stacker npm package
        "src/cli.ts"
    ],
    
    // Build target - library for npm package
    target: "library",
    
    // Output formats
    formats: ["esm", "cjs"],
    
    // Fix module resolution in CJS builds
    format: {
        cjs: {
            splitting: false,
            interop: true
        },
        esm: {
            splitting: false
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
        "@akaoio/stacker",
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
    
    // Bundle internal modules to avoid cross-format imports
    bundle: true,
    noExternal: [],
    
    // Platform target
    platform: "node"
}