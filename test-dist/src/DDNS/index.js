/**
 * DDNS Class - Dynamic DNS management
 * Pattern: Class = Directory + Method-per-file
 */
import { constructor } from './constructor.js';
import { detect } from './detect.js';
import { update } from './update.js';
import { load, save } from './state.js';
export class DDNS {
    // @ts-ignore - Used in method files
    state = null;
    // @ts-ignore - Used in method files
    config = null;
    constructor(config) {
        constructor.call(this, config);
    }
    async detect() {
        return detect.call(this);
    }
    async update(config, ips) {
        return update.call(this, config, ips);
    }
    load() {
        return load.call(this);
    }
    save(state) {
        return save.call(this, state);
    }
}
export default DDNS;
//# sourceMappingURL=index.js.map