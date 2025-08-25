/**
 * System paths module - exports all path functions
 * Each function is independent and can be imported individually
 */

export { state } from "./state.js"
export { root } from "./root.js"
export { bash } from "./bash.js"
export { tmp } from "./tmp.js"
export { getpaths } from "./getpaths.js"

// Export types
export type { PathState } from "./state.js"
export type { PathsConfig } from "./getpaths.js"

// Create default export for backward compatibility
import { tmp } from "./tmp.js"

const syspaths = {
    tmp
}

export default syspaths
