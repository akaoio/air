export const merge = (...args) => {
    // handle null/undefined inputs
    if (args.some(e => e === null || e === undefined)) {
        throw new Error('Cannot merge null or undefined values')
    }
    if (args.some(e => typeof e !== "object")) return
    
    const r = args.shift() || {}
    const seen = new WeakSet() // track circular references
    
    const mergeRecursive = (target, source, depth = 0) => {
        // prevent infinite recursion
        if (depth > 100) return target
        if (seen.has(source)) return target
        seen.add(source)
        
        // handle symbols properly
        const keys = [...Object.keys(source), ...Object.getOwnPropertySymbols(source)]
        
        keys.forEach(k => {
            const v = source[k]
            if (!target.hasOwnProperty(k)) {
                target[k] = v
            } else if (Array.isArray(target[k]) && Array.isArray(v)) {
                v.forEach(e => {
                    if (!target[k].includes(e)) target[k].push(e)
                })
            } else if (typeof target[k] === "object" && typeof v === "object" && 
                       target[k] !== null && v !== null && 
                       !Array.isArray(target[k]) && !Array.isArray(v)) {
                target[k] = mergeRecursive(target[k], v, depth + 1)
            } else {
                target[k] = v
            }
        })
        
        return target
    }
    
    args.forEach(o => {
        mergeRecursive(r, o)
    })
    
    return r
}
