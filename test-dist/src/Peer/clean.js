/**
 * Clean PID file
 */
import { clean as cleanProcess } from '../Process/index.js';
export function clean(options) {
    cleanProcess({
        name: options?.name || process.env.NAME || 'air',
        root: options?.root || process.env.ROOT || process.cwd()
    });
}
// Alias for backward compatibility
export function cleanup(options) {
    return clean(options);
}
export default clean;
//# sourceMappingURL=clean.js.map