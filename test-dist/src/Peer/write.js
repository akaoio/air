/**
 * Write configuration to file
 */
import { write as writeConfig } from '../Manager/index.js';
export function write(config) {
    try {
        // Use configManager from this instance if available
        if (this.configManager) {
            const options = this.configManager.configFile ?
                { configFile: this.configManager.configFile } : {};
            return this.configManager.write(config, options);
        }
        // Otherwise use the imported function
        return writeConfig(config);
    }
    catch (error) {
        return false;
    }
}
export default write;
//# sourceMappingURL=write.js.map