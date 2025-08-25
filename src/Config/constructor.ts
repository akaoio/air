/**
 * Config constructor - Initialize Config manager instance
 */

import { getConfigPath } from "../paths.js"

export function constructor(this: any, configPath?: string) {
    const resolvedPath = configPath || getConfigPath()
    this.configFile = resolvedPath
    this.configPath = resolvedPath
    this.currentConfig = null
}
