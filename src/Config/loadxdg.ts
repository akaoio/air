/**
 * XDG-compliant configuration loading for Air
 * Supports both module mode and super-peer mode
 */

import fs from "fs"
import type { AirConfig } from "../types/index.js"
import { defaults } from "./defaults.js"
import { detectAirMode, ensureDirectories, migrateLegacyPaths } from "../Path/xdg.js"
import { logger } from "../Logger/index.js"

export function loadXDG(this: any, configPath?: string): AirConfig {
    // Detect Air runtime mode and get appropriate paths
    const modeConfig = detectAirMode()

    // Ensure all required directories exist
    ensureDirectories(modeConfig)

    // Handle legacy migration for super-peer mode
    if (modeConfig.mode === "super-peer") {
        const migration = migrateLegacyPaths(modeConfig)
        if (migration.migrated) {
            for (const message of migration.messages) {
                logger.info("Migration:", message)
            }
        }
    }

    // Use provided path or mode-appropriate default
    const configFilePath = configPath || modeConfig.configPath

    try {
        if (fs.existsSync(configFilePath)) {
            const configContent = fs.readFileSync(configFilePath, "utf8")
            const config: AirConfig = JSON.parse(configContent)

            // Enhance config with mode information and paths
            config._runtime = {
                mode: modeConfig.mode,
                configPath: configFilePath,
                dataPath: modeConfig.dataPath,
                statePath: modeConfig.statePath,
                cachePath: modeConfig.cachePath,
                runtimePath: modeConfig.runtimePath,
                xdgCompliant: true
            }

            // Set root path based on mode
            if (modeConfig.mode === "super-peer") {
                config.root = modeConfig.dataPath
            } else {
                // Module mode: use current working directory
                config.root = process.cwd()
            }

            // Validate and merge with defaults
            const defaultConfig = defaults.call(this)
            return this.merge(defaultConfig, config)
        }
    } catch (error: any) {
        logger.error(`Failed to load config from ${configFilePath}:`, error.message)

        // Try to load from backup location if exists
        if (configPath && configPath !== modeConfig.configPath) {
            logger.info("Attempting to load from default location...")
            return loadXDG.call(this)
        }
    }

    // No config found, create default configuration
    logger.info(`No configuration found. Creating default config at: ${configFilePath}`)

    const defaultConfig = defaults.call(this)
    defaultConfig._runtime = {
        mode: modeConfig.mode,
        configPath: configFilePath,
        dataPath: modeConfig.dataPath,
        statePath: modeConfig.statePath,
        cachePath: modeConfig.cachePath,
        runtimePath: modeConfig.runtimePath,
        xdgCompliant: true
    }

    // Set appropriate root path
    if (modeConfig.mode === "super-peer") {
        defaultConfig.root = modeConfig.dataPath
    } else {
        defaultConfig.root = process.cwd()
    }

    // Save the default configuration
    try {
        this.saveXDG(defaultConfig, configFilePath)
    } catch (error: any) {
        logger.error("Failed to save default config:", error.message)
    }

    return defaultConfig
}

export default loadXDG
