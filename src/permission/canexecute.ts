/**
 * Check if we can execute a file
 */

import fs from "fs"

export function canexecute(filepath: string): boolean {
    try {
        fs.accessSync(filepath, fs.constants.X_OK)
        return true
    } catch {
        return false
    }
}

export default canexecute
