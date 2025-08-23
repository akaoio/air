/**
 * Run GUN instance
 */
import path from 'path';
import { logger } from '../Logger/index.js';
import fs from 'fs';
export async function run(config, server) {
    if (!server) {
        return {
            success: false,
            error: 'Server not initialized'
        };
    }
    try {
        const Gun = (await import('@akaoio/gun')).default;
        const SEA = Gun.SEA;
        const dataPath = path.join(config.root, 'radata');
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }
        const env = config.env;
        const envConfig = config[env];
        const gunOptions = {
            web: server,
            peers: [],
            file: dataPath,
            axe: false,
            multicast: false,
            radisk: true,
            localStorage: false,
            sessionStorage: false,
            verify: SEA.verify,
            SEA
        };
        // Add peers if configured
        if (envConfig?.peers && envConfig.peers.length > 0) {
            gunOptions.peers = envConfig.peers;
            logger.info(`Connecting to ${envConfig.peers.length} peer(s)`);
        }
        const gun = Gun(gunOptions);
        return {
            success: true,
            gun
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
export default run;
//# sourceMappingURL=run.js.map