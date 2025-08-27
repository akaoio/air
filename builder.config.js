/**
 * @akaoio/air - Builder Configuration
 * Using @akaoio/builder for TypeScript compilation
 */

export default {
    // Entry points - all TypeScript files including Manager integration
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
        "src/manager.ts",
        "src/cli.ts"
    ],
    
    // Build target - library for npm package
    target: "library",
    
    // Output formats
    formats: ["esm", "cjs"],
    
    // TypeScript settings
    dts: false,         // Skip .d.ts files (has errors)
    sourcemap: true,    // Generate source maps
    
    // Clean dist before build
    clean: true,
    
    // External dependencies - don't bundle
    external: [
        "@akaoio/gun", 
        "node-fetch",
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
    
    // Platform target
    platform: "node"
}