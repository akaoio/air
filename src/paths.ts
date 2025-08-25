import fs from "fs"
import path from "path"

// Use process.cwd() as a reliable cross-platform base directory
const __dirname = process.cwd()

/**
 * Smart path detection for Air
 * Detects whether Air is running as:
 * 1. Standalone project (air.json in current dir)
 * 2. NPM package (air.json in parent project)
 * 3. Development mode (running from source)
 */
const detectPaths = () => {
    const paths = {
        // Script location (where Air code lives)
        script: path.resolve(__dirname, ".."),
        // Project root (where air.json should be)
        root: null,
        // Bash/script directory
        bash: null,
        // Config file path
        config: null,
        // Whether running as npm package
        isPackage: false,
        // Whether in development mode
        isDevelopment: false
    }

    // Check if we're in node_modules (npm package)
    const scriptPath = paths.script
    if (scriptPath.includes("node_modules")) {
        paths.isPackage = true
        // Go up from node_modules/air to project root
        const parts = scriptPath.split(path.sep)
        const nodeModulesIndex = parts.lastIndexOf("node_modules")
        paths.root = parts.slice(0, nodeModulesIndex).join(path.sep)
    } else {
        // Running standalone or in development
        // Check if air.json exists in current directory
        const cwdConfig = path.join(process.cwd(), "air.json")
        const scriptConfig = path.join(scriptPath, "air.json")

        if (fs.existsSync(cwdConfig)) {
            // User is in a project with air.json
            paths.root = process.cwd()
        } else if (fs.existsSync(scriptConfig)) {
            // Running from Air source directory
            paths.root = scriptPath
            paths.isDevelopment = true
        } else {
            // New installation, use current directory
            paths.root = process.cwd()
        }
    }

    // Set bash directory
    paths.bash = path.join(paths.script, "script")

    // Set config path - respect environment variable
    if (process.env.AIR_CONFIG) {
        paths.config = path.resolve(process.env.AIR_CONFIG)
    } else if (process.env.AIR_CONFIG_PATH) {
        paths.config = path.resolve(process.env.AIR_CONFIG_PATH)
    } else {
        // Default to air.json in root, but also check for custom name
        const configName = process.env.AIR_CONFIG_NAME || "air.json"
        paths.config = path.join(paths.root, configName)
    }

    return paths
}

/**
 * Get the correct root path for Air
 * Priority: CLI args > ENV > detected path
 */
const getRootPath = (cliArg = null) => {
    if (cliArg) return path.resolve(cliArg)
    if (process.env.AIR_ROOT) return path.resolve(process.env.AIR_ROOT)
    if (process.env.ROOT) return path.resolve(process.env.ROOT)

    const detected = detectPaths()
    return detected.root
}

/**
 * Get the correct bash/script path
 */
const getBashPath = (cliArg = null) => {
    if (cliArg) return path.resolve(cliArg)
    if (process.env.AIR_BASH) return path.resolve(process.env.AIR_BASH)
    if (process.env.BASH) return path.resolve(process.env.BASH)

    const detected = detectPaths()
    return detected.bash
}

/**
 * Get the correct config path
 * Priority: CLI args > ENV > default location
 */
const getConfigPath = (cliArg = null, rootPath = null) => {
    if (cliArg) return path.resolve(cliArg)
    if (process.env.AIR_CONFIG) return path.resolve(process.env.AIR_CONFIG)
    if (process.env.AIR_CONFIG_PATH) return path.resolve(process.env.AIR_CONFIG_PATH)

    // Default to air.json in root directory
    const root = rootPath || getRootPath()
    const configName = process.env.AIR_CONFIG_NAME || "air.json"
    return path.join(root, configName)
}

/**
 * Get full paths configuration
 */
const getPaths = (rootArg = null, bashArg = null, configArg = null) => {
    const detected = detectPaths()
    const root = getRootPath(rootArg)

    return {
        root: root,
        bash: getBashPath(bashArg),
        config: getConfigPath(configArg, root),
        logs: path.join(root, "logs"),
        script: detected.script,
        isPackage: detected.isPackage,
        isDevelopment: detected.isDevelopment
    }
}

export { detectPaths, getRootPath, getBashPath, getConfigPath, getPaths }

export default {
    detectPaths,
    getRootPath,
    getBashPath,
    getConfigPath,
    getPaths
}
