/**
 * Restart peer with exponential backoff
 */

import type { AirConfig } from '../types/index.js'
import { logger } from '../Logger/index.js'
import { stop } from './stop.js'
import { start } from './start.js'

export interface RestartOptions {
    count?: number
    max?: number
    baseDelay?: number
    maxDelay?: number
}

export interface RestartResult {
    success: boolean
    attempt: number
    error?: string
}

export async function restart(
    config: AirConfig,
    options: RestartOptions = {}
): Promise<RestartResult> {
    const opts = {
        count: options.count || 0,
        max: options.max || 5,
        baseDelay: options.baseDelay || 5000,
        maxDelay: options.maxDelay || 60000
    }
    
    const attempt = opts.count + 1
    
    if (attempt > opts.max) {
        logger.error(`Max restart attempts (${opts.max}) reached`)
        return {
            success: false,
            attempt,
            error: 'Max restart attempts reached'
        }
    }
    
    logger.info(`Restart attempt ${attempt}/${opts.max}`)
    
    try {
        // Stop current instance
        await stop(config)
        
        // Calculate delay with exponential backoff
        let delay = Math.min(opts.baseDelay * Math.pow(2, opts.count), opts.maxDelay)
        
        // Add jitter (±20%)
        const jitter = delay * 0.2
        delay = delay + (Math.random() * jitter * 2 - jitter)
        
        logger.info(`Waiting ${Math.round(delay / 1000)}s before restart...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // Try to start
        const result = await start(config)
        
        if (result.success) {
            logger.info('Restart successful')
            return {
                success: true,
                attempt
            }
        } else {
            // Recursive retry
            return restart(config, {
                ...opts,
                count: attempt
            })
        }
        
    } catch (error: any) {
        logger.error(`Restart failed:`, error.message)
        
        // Recursive retry
        return restart(config, {
            ...opts,
            count: attempt
        })
    }
}

export default restart