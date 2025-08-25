/**
 * DDNS state management - load and save state
 */

import type { DDNSState } from "./types.js"

// Re-export type for use in other modules
export type { DDNSState } from "./types.js"
import * as fs from "fs"
import * as path from "path"

export function load(this: any): DDNSState | null {
    try {
        const statePath = path.join(process.cwd(), "ddns.json")

        if (!fs.existsSync(statePath)) {
            return null
        }

        const content = fs.readFileSync(statePath, "utf8")
        return JSON.parse(content)
    } catch (error) {
        throw error
    }
}

export function save(this: any, state: DDNSState): void {
    try {
        const statePath = path.join(process.cwd(), "ddns.json")
        const dir = path.dirname(statePath)

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
    } catch (error) {
        throw error
    }
}

// Export state for test compatibility
export const state = {
    load,
    save
}
