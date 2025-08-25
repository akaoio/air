/**
 * Clean PID file
 */

import { clean as cleanProcess } from "../Process/index.js"

export function clean(options?: { name?: string; root?: string }): void {
    cleanProcess({
        name: options?.name || process.env.NAME || "air",
        root: options?.root || process.env.ROOT || process.cwd()
    })
}

// Alias for backward compatibility
export function cleanup(options?: { name?: string; root?: string }): void {
    return clean(options)
}

export default clean
