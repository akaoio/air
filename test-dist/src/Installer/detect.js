/**
 * Detect existing installation
 */
import fs from 'fs';
import path from 'path';
export function detect(root) {
    const configPath = path.join(root, 'air.json');
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        catch {
            return null;
        }
    }
    return null;
}
export default detect;
//# sourceMappingURL=detect.js.map