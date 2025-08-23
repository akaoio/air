/**
 * Check if we can execute a file
 */
import fs from 'fs';
export function canexecute(filepath) {
    try {
        fs.accessSync(filepath, fs.constants.X_OK);
        return true;
    }
    catch {
        return false;
    }
}
export default canexecute;
//# sourceMappingURL=canexecute.js.map