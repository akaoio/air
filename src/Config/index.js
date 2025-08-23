/**
 * Config Class - Configuration management class
 * Each method is in separate file following "Một hàm một file" principle
 */
import { constructor } from './constructor.js';
import { load } from './load.js';
import { save } from './save.js';
import { merge } from './merge.js';
import { defaults } from './defaults.js';
import { validate } from './validate.js';
export class Config {
    constructor(configPath) {
        constructor.call(this, configPath);
    }
    load(configPath) {
        return load.call(this, configPath);
    }
    save(config, configPath) {
        return save.call(this, config, configPath);
    }
    merge(...configs) {
        return merge.call(this, ...configs);
    }
    defaults() {
        return defaults.call(this);
    }
    validate(config) {
        return validate.call(this, config);
    }
}
export default Config;
//# sourceMappingURL=index.js.map