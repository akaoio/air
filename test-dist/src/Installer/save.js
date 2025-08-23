/**
 * Save configuration to file
 */
import fs from 'fs';
import path from 'path';
export function save(config) {
    const configPath = path.join(config.root, 'air.json');
    // Ensure directory exists
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    // Save configuration
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
export default save;
//# sourceMappingURL=save.js.map