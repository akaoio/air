/**
 * Global state for permissions
 */
import os from 'os';
// Singleton state
export const state = {
    isRoot: process.getuid ? process.getuid() === 0 : false,
    user: os.userInfo().username,
    platform: os.platform()
};
export default state;
//# sourceMappingURL=state.js.map