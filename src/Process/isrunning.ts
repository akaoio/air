/**
 * Check if a process is running
 */

export function isrunning(pid: number | string): boolean {
    try {
        const numPid = typeof pid === "string" ? parseInt(pid) : pid
        process.kill(numPid, 0)
        return true
    } catch {
        return false
    }
}

export default isrunning
