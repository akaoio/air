/**
 * Merge configurations
 */
export function merge(...configs) {
    const result = {};
    for (const config of configs) {
        if (!config)
            continue;
        for (const key in config) {
            const value = config[key];
            if (value === null) {
                result[key] = null;
                continue;
            }
            if (value === undefined) {
                result[key] = undefined;
                continue;
            }
            if (typeof value === 'object' && !Array.isArray(value)) {
                result[key] = merge(result[key] || {}, value);
            }
            else {
                result[key] = value;
            }
        }
    }
    return result;
}
export default merge;
//# sourceMappingURL=merge.js.map