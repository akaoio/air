/**
 * Get PID file path
 */
import path from 'path';
export function getpidfile(config) {
    // Use this.config if available, otherwise use passed config
    const cfg = config || this?.config || {};
    const name = cfg.name || 'air';
    const root = cfg.root || process.cwd();
    const prefix = cfg.prefix || '.';
    const suffix = cfg.suffix || '.pid';
    return path.join(root, `${prefix}${name}${suffix}`);
}
export default getpidfile;
//# sourceMappingURL=getpidfile.js.map