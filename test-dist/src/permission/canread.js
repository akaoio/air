/**
 * Check if we have read permission to a path
 */
import fs from 'fs';
export function canread(filepath) {
    try {
        fs.accessSync(filepath, fs.constants.R_OK);
        return true;
    }
    catch {
        return false;
    }
}
export default canread;
//# sourceMappingURL=canread.js.map