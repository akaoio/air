/**
 * Installer Class - Installation management
 * Pattern: Class = Directory + Method-per-file
 */
import { constructor } from './constructor.js';
import { check } from './check.js';
import { detect } from './detect.js';
import { configure } from './configure.js';
import { save } from './save.js';
import { ssl } from './ssl.js';
import { service } from './service.js';
import { start } from './start.js';
export class Installer {
    // @ts-ignore - Used in method files
    options;
    // @ts-ignore - Used in method files
    context;
    constructor(options) {
        constructor.call(this, options);
    }
    check() {
        return check.call(this);
    }
    detect(root) {
        return detect.call(this, root);
    }
    configure(options) {
        return configure.call(this, options || {});
    }
    save(config) {
        return save.call(this, config);
    }
    async ssl(config) {
        return ssl.call(this, config);
    }
    async service(config) {
        return service.call(this, config);
    }
    async start(config) {
        return start.call(this, config);
    }
}
export default Installer;
//# sourceMappingURL=index.js.map