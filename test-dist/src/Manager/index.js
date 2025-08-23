/**
 * Manager Class - Configuration management
 * Pattern: Class = Directory + Method-per-file
 */
import { constructor } from './constructor.js';
import { read } from './read.js';
import { write } from './write.js';
import { sync } from './sync.js';
import { defaults } from './defaults.js';
import { validate } from './validate.js';
import { mergeenv } from './mergeenv.js';
export class Manager {
    // @ts-ignore - Used in method files
    options;
    // @ts-ignore - Used in method files
    config = null;
    constructor(options = {}) {
        constructor.call(this, options);
    }
    read(options = {}) {
        return read.call(this, options);
    }
    write(config, options = {}) {
        return write.call(this, config, options);
    }
    async sync(url, options = {}) {
        return sync.call(this, url || '', options);
    }
    defaults(options = {}) {
        return defaults.call(this, options);
    }
    validate(config, options = {}) {
        return validate.call(this, { ...options, config });
    }
    mergeenv(config) {
        return mergeenv.call(this, config);
    }
}
export default Manager;
// Re-export individual functions for backward compatibility
export { read } from './read.js';
export { write } from './write.js';
export { sync } from './sync.js';
export { defaults } from './defaults.js';
export { validate } from './validate.js';
export { mergeenv } from './mergeenv.js';
//# sourceMappingURL=index.js.map