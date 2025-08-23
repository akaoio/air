/**
 * Clean up PID file
 */
import fs from 'fs';
import { logger } from '../Logger/index.js';
import { getpidfile } from './getpidfile.js';
export function clean(config = {}) {
    const pidFile = getpidfile(config);
    try {
        if (fs.existsSync(pidFile)) {
            const currentPid = parseInt(fs.readFileSync(pidFile, 'utf8'));
            if (currentPid === process.pid) {
                fs.unlinkSync(pidFile);
                logger.info('PID file cleaned up');
            }
        }
    }
    catch (error) {
        logger.error('Error cleaning PID file:', error.message);
    }
}
export default clean;
//# sourceMappingURL=clean.js.map