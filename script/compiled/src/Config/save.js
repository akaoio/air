/**
 * Save configuration
 */
import fs from 'fs';
import { logger } from '../Logger/index.js';
import path from 'path';
export function save(config, configPath) {
    const filepath = configPath || this.configFile || this.configPath || path.join(config.root || process.cwd(), 'air.json');
    try {
        // Create directory if it doesn't exist
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
        fs.writeFileSync(filepath, JSON.stringify(config, null, 2));
        return true;
    }
    catch (error) {
        logger.error('Failed to save config:', error);
        return false;
    }
}
export default save;
