/**
 * Updater Class - Update processes
 * Pattern: Class = Directory + Method-per-file
 */
import { constructor } from './constructor.js';
import { git } from './git.js';
import { packages } from './packages.js';
import { restart } from './restart.js';
export class Updater {
    options;
    updateStatus;
    constructor(options = {}) {
        constructor.call(this, options);
    }
    async git() {
        return git.call(this);
    }
    async packages() {
        return packages.call(this);
    }
    async restart() {
        return restart.call(this);
    }
}
export default Updater;
//# sourceMappingURL=index.js.map