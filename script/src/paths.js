"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaths = exports.getBashPath = exports.getRootPath = exports.detectPaths = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Use process.cwd() as a reliable cross-platform base directory
const __dirname = process.cwd();
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
        script: path_1.default.resolve(__dirname, '..'),
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
    };
    // Check if we're in node_modules (npm package)
    const scriptPath = paths.script;
    if (scriptPath.includes('node_modules')) {
        paths.isPackage = true;
        // Go up from node_modules/air to project root
        const parts = scriptPath.split(path_1.default.sep);
        const nodeModulesIndex = parts.lastIndexOf('node_modules');
        paths.root = parts.slice(0, nodeModulesIndex).join(path_1.default.sep);
    }
    else {
        // Running standalone or in development
        // Check if air.json exists in current directory
        const cwdConfig = path_1.default.join(process.cwd(), 'air.json');
        const scriptConfig = path_1.default.join(scriptPath, 'air.json');
        if (fs_1.default.existsSync(cwdConfig)) {
            // User is in a project with air.json
            paths.root = process.cwd();
        }
        else if (fs_1.default.existsSync(scriptConfig)) {
            // Running from Air source directory
            paths.root = scriptPath;
            paths.isDevelopment = true;
        }
        else {
            // New installation, use current directory
            paths.root = process.cwd();
        }
    }
    // Set bash directory
    paths.bash = path_1.default.join(paths.script, 'script');
    // Set config path
    paths.config = path_1.default.join(paths.root, 'air.json');
    return paths;
};
exports.detectPaths = detectPaths;
/**
 * Get the correct root path for Air
 * Priority: CLI args > ENV > detected path
 */
const getRootPath = (cliArg = null) => {
    if (cliArg)
        return path_1.default.resolve(cliArg);
    if (process.env.AIR_ROOT)
        return path_1.default.resolve(process.env.AIR_ROOT);
    if (process.env.ROOT)
        return path_1.default.resolve(process.env.ROOT);
    const detected = detectPaths();
    return detected.root;
};
exports.getRootPath = getRootPath;
/**
 * Get the correct bash/script path
 */
const getBashPath = (cliArg = null) => {
    if (cliArg)
        return path_1.default.resolve(cliArg);
    if (process.env.AIR_BASH)
        return path_1.default.resolve(process.env.AIR_BASH);
    if (process.env.BASH)
        return path_1.default.resolve(process.env.BASH);
    const detected = detectPaths();
    return detected.bash;
};
exports.getBashPath = getBashPath;
/**
 * Get full paths configuration
 */
const getPaths = (rootArg = null, bashArg = null) => {
    const detected = detectPaths();
    return {
        root: getRootPath(rootArg),
        bash: getBashPath(bashArg),
        config: path_1.default.join(getRootPath(rootArg), 'air.json'),
        logs: path_1.default.join(getRootPath(rootArg), 'logs'),
        script: detected.script,
        isPackage: detected.isPackage,
        isDevelopment: detected.isDevelopment
    };
};
exports.getPaths = getPaths;
exports.default = {
    detectPaths,
    getRootPath,
    getBashPath,
    getPaths
};
