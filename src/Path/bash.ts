/**
 * Get bash/scripts directory from air.json or auto-detect
 */

import path from "path"
import { state } from "./state.js"
import { root } from "./root.js"

export function bash(): string {
    // Check environment variable first
    if (process.env.AIR_BASH) {
        return path.resolve(process.env.AIR_BASH)
    }
    if (state.airConfig?.bash) {
        return path.resolve(state.airConfig.bash)
    }
    // Default to script directory
    return path.join(root(), "script")
}

export default bash
