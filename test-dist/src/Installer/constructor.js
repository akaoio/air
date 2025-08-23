/**
 * Constructor for Installer class
 */
export function constructor(options) {
    this.options = options || {};
    this.context = {
        rootDir: process.cwd(),
        isRoot: process.getuid?.() === 0 || false,
        platform: process.platform,
        hasSystemd: false,
        hasBun: typeof Bun !== 'undefined',
        hasNode: true
    };
    // Check for systemd
    if (this.context.platform === 'linux') {
        try {
            const { execSync } = require('child_process');
            execSync('which systemctl', { stdio: 'ignore' });
            this.context.hasSystemd = true;
        }
        catch {
            // No systemd
        }
    }
}
//# sourceMappingURL=constructor.js.map