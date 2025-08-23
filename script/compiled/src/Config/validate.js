/**
 * Validate configuration
 */
export function validate(config) {
    const errors = [];
    // Check required fields
    if (!config.name) {
        errors.push('Missing required field: name');
    }
    if (!config.env) {
        errors.push('Missing required field: env');
    }
    // root is optional, don't require it
    // if (!config.root) {
    //     errors.push('Missing required field: root')
    // }
    // Check environment config
    if (config.env && config[config.env]) {
        const envConfig = config[config.env];
        if (!envConfig.port || typeof envConfig.port !== 'number') {
            errors.push('Invalid or missing port number');
        }
        if (envConfig.port && (envConfig.port < 1 || envConfig.port > 65535)) {
            errors.push('Port must be between 1 and 65535');
        }
        if (!envConfig.domain) {
            errors.push('Missing domain in environment config');
        }
        if (!envConfig.peers || !Array.isArray(envConfig.peers)) {
            errors.push('Missing or invalid peers array');
        }
    }
    else if (config.env) {
        // Environment config is required if env is specified
        errors.push(`Missing environment config for: ${config.env}`);
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
export default validate;
