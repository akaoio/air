/**
 * Sync configuration from remote
 */
import { logger } from '../Logger/index.js';
import { save } from '../Config/save.js';
import { merge } from '../Config/merge.js';
export async function sync(config) {
    if (!config.sync) {
        return {
            success: true,
            updated: false
        };
    }
    try {
        logger.info(`Syncing config from ${config.sync}`);
        const response = await fetch(config.sync);
        if (!response.ok) {
            throw new Error(`Failed to fetch config: ${response.status}`);
        }
        const remoteConfig = await response.json();
        const mergedConfig = merge(config, remoteConfig);
        const saved = save(mergedConfig);
        if (!saved) {
            throw new Error('Failed to save synced config');
        }
        logger.info('Configuration synced successfully');
        // Schedule next sync in 1 hour
        setTimeout(() => sync(mergedConfig), 3600000);
        return {
            success: true,
            updated: true
        };
    }
    catch (error) {
        logger.error('Sync failed:', error.message);
        // Retry in 5 minutes
        setTimeout(() => sync(config), 300000);
        return {
            success: false,
            updated: false,
            error: error.message
        };
    }
}
export default sync;
//# sourceMappingURL=sync.js.map