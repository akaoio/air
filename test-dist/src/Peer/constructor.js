/**
 * Peer constructor - Initialize Peer instance
 */
import Gun from '@akaoio/gun';
import network from '../Network/index.js';
import { Manager } from '../Manager/index.js';
export function constructor(configOrOptions) {
    // Extract manager options from config
    const managerOptions = {
        rootArg: configOrOptions?.root,
        bashArg: configOrOptions?.bash,
        configFile: configOrOptions?.configFile
    };
    // Create config manager
    this.configManager = new Manager(managerOptions);
    // Read default config through manager
    const defaultConfig = this.configManager.read();
    // Merge provided options with defaults (options override defaults)
    if (configOrOptions) {
        this.config = { ...defaultConfig, ...configOrOptions };
        // Merge environment-specific configs
        const env = this.config.env || defaultConfig.env || 'development';
        if (defaultConfig[env] && configOrOptions[env]) {
            this.config[env] = {
                ...defaultConfig[env],
                ...configOrOptions[env]
            };
        }
    }
    else {
        this.config = defaultConfig;
    }
    // Ensure port is number
    if (this.config.port) {
        this.config.port = Number(this.config.port);
    }
    this.gun = null;
    this.server = null;
    this.user = null;
    // GUN and SEA references
    this.GUN = Gun;
    this.sea = Gun.SEA;
    // IP validation methods
    this.ip = {
        validate: (ip) => network.validate(ip),
        get: async () => network.get(),
        dns: async () => {
            const ips = await network.get();
            return ips.primary;
        },
        http: async () => {
            const ips = await network.get();
            return ips.primary;
        }
    };
}
//# sourceMappingURL=constructor.js.map