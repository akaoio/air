/**
 * Kill process by PID
 */

export function kill(pid: number | string): boolean {
    try {
        const numPid = typeof pid === "string" ? parseInt(pid) : pid
        process.kill(numPid, "SIGTERM")
        return true
    } catch {
        return false
    }
}

export default kill
