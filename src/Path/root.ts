/**
 * Get root directory from air.json or auto-detect
 */

import path from 'path'
import { state } from './state.js'

export function root(): string {
    // Check environment variable first
    if (process.env.AIR_ROOT) {
        return path.resolve(process.env.AIR_ROOT)
    }
    if (state.airConfig?.root) {
        return path.resolve(state.airConfig.root)
    }
    return process.cwd()
}

export default root