/**
 * Validate configuration
 */
import fs from 'fs';
import { read } from './read.js';
export function validate(options = {}) {
    const errors = [];
    const config = options.config || read(options);
    // Check required fields
    if (!config.env) {
        errors.push('Environment not specified');
    }
    if (!config.name) {
        errors.push('Name not specified');
    }
    // Check environment config exists
    const envConfig = config[config.env];
    if (!envConfig) {
        errors.push(`Environment config for '${config.env}' not found`);
    }
    else {
        // Check port
        if (!envConfig.port || envConfig.port < 1 || envConfig.port > 65535) {
            errors.push('Invalid port number');
        }
        // Check SSL if production
        if (config.env === 'production' && envConfig.ssl) {
            if (!fs.existsSync(envConfig.ssl.key)) {
                errors.push(`SSL key file not found: ${envConfig.ssl.key}`);
            }
            if (!fs.existsSync(envConfig.ssl.cert)) {
                errors.push(`SSL cert file not found: ${envConfig.ssl.cert}`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
export default validate;
//# sourceMappingURL=validate.js.map