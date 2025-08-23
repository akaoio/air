/**
 * Permissions module - exports all permission functions
 * Each function is independent and can be imported individually
 */
export { state } from './state.js';
export { canwrite } from './canwrite.js';
export { canread } from './canread.js';
export { canexecute } from './canexecute.js';
// Create default export for backward compatibility
import { canwrite } from './canwrite.js';
import { canread } from './canread.js';
import { canexecute } from './canexecute.js';
const permissions = {
    canwrite,
    canread,
    canexecute
};
export default permissions;
//# sourceMappingURL=index.js.map