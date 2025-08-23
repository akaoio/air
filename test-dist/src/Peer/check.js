/**
 * Check if peer is already running via PID file
 */
import { check as checkProcess } from '../Process/index.js';
export function check(options) {
    return checkProcess({
        name: options?.name || process.env.NAME || 'air',
        root: options?.root || process.env.ROOT || process.cwd()
    });
}
export default check;
//# sourceMappingURL=check.js.map