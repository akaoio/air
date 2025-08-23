/**
 * Read configuration with environment variable overrides
 */
export function read() {
    // Always return the current config from instance
    // It was already set in constructor with defaults
    let config = { ...this.config };
    // Apply environment variables
    if (process.env.NAME)
        config.name = process.env.NAME;
    if (process.env.ROOT)
        config.root = process.env.ROOT;
    if (process.env.BASH)
        config.bash = process.env.BASH;
    if (process.env.SYNC)
        config.sync = process.env.SYNC;
    if (process.env.DOMAIN)
        config.domain = process.env.DOMAIN;
    if (process.env.PORT)
        config.port = parseInt(process.env.PORT);
    if (process.env.SSL_KEY) {
        config.ssl = { ...config.ssl, key: process.env.SSL_KEY };
    }
    if (process.env.SSL_CERT) {
        config.ssl = { ...config.ssl, cert: process.env.SSL_CERT };
    }
    return config;
}
export default read;
//# sourceMappingURL=read.js.map