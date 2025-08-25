export function constructor(this: any, name: string) {
    this.name = name
    this.enabled = process.env.NODE_ENV !== "test"
    this.filePath = null
}
