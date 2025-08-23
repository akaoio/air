/**
 * Load configuration
 */
import fs from 'fs';
import { logger } from '../Logger/index.js';
import path from 'path';
import { defaults } from './defaults.js';
export function load(configPath) {
    const filepath = configPath || this.configFile || this.configPath || path.join(process.cwd(), 'air.json');
    try {
        if (fs.existsSync(filepath)) {
            const config = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            return config;
        }
    }
    catch (error) {
        logger.error('Failed to load config:', error);
    }
    // Return defaults if no config exists
    return defaults.call(this);
}
export default load;
//# sourceMappingURL=load.js.map