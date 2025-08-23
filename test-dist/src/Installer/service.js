/**
 * System service setup - Refactored with Platform abstraction
 */
import { Platform } from '../Platform/index.js';
export async function service(config) {
    // Use Platform abstraction instead of checking platform manually
    const platform = Platform.getInstance();
    // Platform handles all OS-specific logic internally
    const result = await platform.createService(config);
    // Convert Platform ServiceResult to Installer ServiceResult
    return {
        created: result.success,
        enabled: result.success,
        error: result.error
    };
}
export default service;
//# sourceMappingURL=service.js.map