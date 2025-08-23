/**
 * Network module - exports all network functions
 * Each function is independent and can be imported individually
 */
export { has } from './has.js';
export { validate } from './validate.js';
export { dns } from './dns.js';
export { get } from './get.js';
export { monitor } from './monitor.js';
export { interfaces } from './interfaces.js';
export { update } from './update.js';
// Export submodules
export * as ipv4 from './ipv4/index.js';
export * as ipv6 from './ipv6/index.js';
// Default export for backward compatibility
import { get } from './get.js';
import { validate } from './validate.js';
import { update } from './update.js';
const network = {
    get,
    validate,
    update
};
export default network;
//# sourceMappingURL=index.js.map