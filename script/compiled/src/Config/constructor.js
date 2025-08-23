/**
 * Config constructor - Initialize Config manager instance
 */
export function constructor(configPath) {
    this.configFile = configPath || 'air.json';
    this.configPath = configPath || 'air.json';
    this.currentConfig = null;
}
