/**
 * Get temporary directory (cross-platform)
 */
import path from 'path';
import { state } from './state.js';
export function tmp(filename = null) {
    const base = state.tmpdir || '/tmp';
    // Include 'air' subdirectory for air-specific temp files
    const airTmpDir = path.join(base, 'air');
    return filename ? path.join(airTmpDir, filename) : airTmpDir;
}
export default tmp;
//# sourceMappingURL=tmp.js.map