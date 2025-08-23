/**
 * Constructor for DDNS class
 */
export function constructor(config) {
    this.config = config || null;
    this.options = config || {}; // Support both config and options
    this.state = null;
}
//# sourceMappingURL=constructor.js.map