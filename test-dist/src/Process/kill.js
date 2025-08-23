/**
 * Kill process by PID
 */
export function kill(pid) {
    try {
        const numPid = typeof pid === 'string' ? parseInt(pid) : pid;
        process.kill(numPid, 'SIGTERM');
        return true;
    }
    catch {
        return false;
    }
}
export default kill;
//# sourceMappingURL=kill.js.map