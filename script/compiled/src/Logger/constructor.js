export function constructor(name) {
    this.name = name;
    this.enabled = process.env.NODE_ENV !== 'test';
    this.filePath = null;
}
