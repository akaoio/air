/**
 * Type definitions for Air - TypeScript/Bun edition
 * Strict typing to prevent JavaScript's bullshit
 */
// Runtime detection
export function getRuntime() {
    // @ts-ignore - Bun global
    if (typeof Bun !== 'undefined')
        return 'bun';
    // @ts-ignore - Deno global
    if (typeof Deno !== 'undefined')
        return 'deno';
    return 'node';
}
// Performance timer based on runtime
export function getPerfTimer() {
    const runtime = getRuntime();
    if (runtime === 'bun') {
        // Bun has native performance.now()
        return () => performance.now();
    }
    else if (runtime === 'node') {
        // Node.js high-resolution time
        const { performance } = require('perf_hooks');
        return () => performance.now();
    }
    else {
        // Fallback to Date
        return () => Date.now();
    }
}
