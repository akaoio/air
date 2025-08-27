/**
 * @akaoio/air - Type Definitions
 */

// GUN types - simplified
declare module "@akaoio/gun" {
    interface IGunConstructor {
        new (options?: any): IGun
        (options?: any): IGun
        serve(path?: string): any
        state(): any
    }
    
    interface IGun {
        get(key: string): IGun
        put(data: any, callback?: (ack: any) => void): IGun
        once(callback: (data: any, key?: string) => void): IGun
    }
    
    const GUN: IGunConstructor
    export default GUN
}