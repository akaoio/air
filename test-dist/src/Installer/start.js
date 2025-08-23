/**
 * Start the Air service - Refactored with Platform abstraction
 */
import { Platform } from '../Platform/index.js';
export async function start(config) {
    // Use Platform abstraction for starting service
    const platform = Platform.getInstance();
    // Platform handles all OS-specific logic internally
    return platform.startService(config.name);
}
export default start;
//# sourceMappingURL=start.js.map