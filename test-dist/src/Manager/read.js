/**
 * Read configuration from file
 */
import fs from 'fs';
import path from 'path';
import { merge } from '../lib/utils.js';
import { getpaths } from '../Path/index.js';
import { defaults } from './defaults.js';
import { logger } from '../Logger/index.js';
export function read(options = {}) {
    // Merge options with instance options if this is a Manager instance
    const allOptions = { ...this?.options, ...options };
    const paths = getpaths(allOptions.rootArg, allOptions.bashArg);
    const configFile = this?.configFile || allOptions.configFile || allOptions.path || paths.config || path.join(process.cwd(), 'air.json');
    try {
        if (!fs.existsSync(configFile)) {
            logger.debug(`Config file not found: ${configFile}`);
            return defaults(allOptions);
        }
        const content = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(content);
        // Merge with defaults
        return merge(defaults(allOptions), config);
    }
    catch (error) {
        logger.error(`Error reading config from ${configFile}:`, error.message);
        return defaults(allOptions);
    }
}
export default read;
//# sourceMappingURL=read.js.map