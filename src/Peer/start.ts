/**
 * Start peer
 */

import type { AirConfig } from '../types/index.js'
import { logger } from '../Logger/index.js'
import { check as checkProcess } from '../Process/check.js'
import { init } from './init.js'
import { run } from './run.js'
import { online } from './online.js'
import { sync } from './sync.js'

export interface StartResult {
    success: boolean
    config: AirConfig
    gun?: any
    user?: any
    error?: string
}

export async function start(config: AirConfig): Promise<StartResult> {
    try {
        logger.info(`Starting Air ${config.name} in ${config.env} mode...`)
        
        // Check if already running
        if (checkProcess(config)) {
            return {
                success: false,
                config,
                error: 'Air is already running. Use restart to restart.'
            }
        }
        
        // Initialize server
        const initResult = await init(config)
        if (!initResult.success) {
            return {
                success: false,
                config,
                error: initResult.error
            }
        }
        
        // Run GUN
        const runResult = await run(config, initResult.server)
        if (!runResult.success) {
            return {
                success: false,
                config,
                error: runResult.error
            }
        }
        
        // Go online
        const onlineResult = await online(config, runResult.gun)
        
        // Sync config if URL provided
        if (config.sync) {
            await sync(config)
        }
        
        return {
            success: true,
            config,
            gun: runResult.gun,
            user: onlineResult.user
        }
        
    } catch (error: any) {
        return {
            success: false,
            config,
            error: error.message
        }
    }
}

export default start