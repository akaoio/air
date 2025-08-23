/**
 * Go online with GUN user
 */
import { logger } from '../Logger/index.js';
export async function online(config, gun) {
    if (!gun) {
        return {
            success: false,
            error: 'GUN instance not initialized'
        };
    }
    try {
        const user = gun.user();
        const env = config.env;
        const envConfig = config[env];
        // Check for existing pair
        if (envConfig?.pair?.pub && envConfig?.pair?.priv) {
            await new Promise((resolve, reject) => {
                user.auth(envConfig.pair, (ack) => {
                    if (ack.err) {
                        reject(new Error(ack.err));
                    }
                    else {
                        logger.info('Authenticated with existing pair');
                        resolve(ack);
                    }
                });
            });
        }
        else {
            // Create new pair
            const pair = await gun.SEA.pair();
            // Save pair to config
            if (!envConfig.pair) {
                envConfig.pair = {
                    pub: pair.pub,
                    priv: pair.priv,
                    epub: pair.epub,
                    epriv: pair.epriv
                };
            }
            else {
                envConfig.pair.pub = pair.pub;
                envConfig.pair.priv = pair.priv;
                envConfig.pair.epub = pair.epub;
                envConfig.pair.epriv = pair.epriv;
            }
            // Create user
            await new Promise((resolve, reject) => {
                user.create(pair, (ack) => {
                    if (ack.err && ack.err !== 'User already created!') {
                        reject(new Error(ack.err));
                    }
                    else {
                        logger.info('User created');
                        resolve(ack);
                    }
                });
            });
            // Auth with new pair
            await new Promise((resolve, reject) => {
                user.auth(pair, (ack) => {
                    if (ack.err) {
                        reject(new Error(ack.err));
                    }
                    else {
                        logger.info('Authenticated with new pair');
                        resolve(ack);
                    }
                });
            });
        }
        // Set hub key if configured
        if (config.hub) {
            user.get('hub').put(config.hub);
        }
        return {
            success: true,
            user
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
export default online;
//# sourceMappingURL=online.js.map