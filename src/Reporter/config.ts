/**
 * Update configuration
 */

import { state } from "./state.js"

export function config(newConfig: any): void {
    state.config = newConfig
}

export default config
