/**
 * Get complete paths configuration
 */

import path from "path"
import { root } from "./root.js"
import { bash } from "./bash.js"

export interface PathsConfig {
    root: string
    bash: string
    config: string
    logs: string
}

export function getpaths(rootArg?: string, bashArg?: string): PathsConfig {
    const rootPath = rootArg ? path.resolve(rootArg) : root()
    const bashPath = bashArg ? path.resolve(bashArg) : bash()

    return {
        root: rootPath,
        bash: bashPath,
        config: path.join(rootPath, "air.json"),
        logs: path.join(rootPath, "logs")
    }
}

export default getpaths
