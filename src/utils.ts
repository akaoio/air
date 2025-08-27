/**
 * @akaoio/air - Utility Functions
 * Migrated from libs/utils.js
 */

/**
 * Deep merge multiple objects
 * Handles arrays and nested objects properly
 */
export const merge = (...args: any[]): any => {
    if (args.some(e => typeof e !== "object")) return
    const r = args.shift() || {}
    args.forEach(o => {
        Object.entries(o).forEach(([k, v]) => {
            if (!r[k]) return (r[k] = v)
            if (Array.isArray(r[k]) && Array.isArray(v))
                return v.forEach((e: any) => {
                    if (!r[k].includes(e)) r[k].push(e)
                })
            if (typeof r[k] === typeof v && typeof r[k] === "object") return (r[k] = merge(r[k], v))
        })
    })
    return r
}