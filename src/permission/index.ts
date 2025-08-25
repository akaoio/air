/**
 * Permissions module - exports all permission functions
 * Each function is independent and can be imported individually
 */

export { state } from "./state.js"
export { canwrite } from "./canwrite.js"
export { canread } from "./canread.js"
export { canexecute } from "./canexecute.js"

// Export types
export type { PermissionState } from "./state.js"

// Create default export for backward compatibility
import { canwrite } from "./canwrite.js"
import { canread } from "./canread.js"
import { canexecute } from "./canexecute.js"

const permissions = {
    canwrite,
    canread,
    canexecute
}

export default permissions
