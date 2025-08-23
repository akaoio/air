/**
 * Stop peer gracefully
 */
import { logger } from '../Logger/index.js';
import { clean as cleanProcess } from '../Process/clean.js';
export async function stop(config, server) {
    logger.info('Stopping Air...');
    try {
        // Stop server if provided
        if (server) {
            await new Promise((resolve) => {
                server.close(() => {
                    logger.info('Server stopped');
                    resolve();
                });
                // Force close after 5 seconds
                setTimeout(() => {
                    if (server) {
                        server.closeAllConnections?.();
                    }
                    resolve();
                }, 5000);
            });
        }
        // Clean PID file
        cleanProcess(config);
        logger.info('Air stopped');
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
export default stop;
//# sourceMappingURL=stop.js.map