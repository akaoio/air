/**
 * Uninstaller Class - Uninstallation processes
 * Pattern: Class = Directory + Method-per-file
 */
import { constructor } from './constructor.js';
import { stop } from './stop.js';
import { remove } from './remove.js';
import { clean } from './clean.js';
export class Uninstaller {
    options;
    completed;
    errors;
    constructor(options = {}) {
        constructor.call(this, options);
    }
    async stop() {
        return stop.call(this);
    }
    async remove() {
        return remove.call(this);
    }
    async clean() {
        return clean.call(this);
    }
}
export default Uninstaller;
//# sourceMappingURL=index.js.map