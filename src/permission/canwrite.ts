/**
 * Check if we have write permission to a path
 */

import fs from "fs"

export function canwrite(filepath: string): boolean {
    try {
        fs.accessSync(filepath, fs.constants.W_OK)
        return true
    } catch {
        return false
    }
}

export default canwrite
