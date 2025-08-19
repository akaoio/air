#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Architecture validation and enforcement for Air
 * Prevents architectural drift and maintains code quality
 */

export class Architecture {
    constructor() {
        this.rules = this.loadrules()
        this.violations = []
    }

    /**
     * Load architecture rules
     */
    loadrules() {
        return {
            naming: {
                functions: {
                    pattern: /^[a-z]+$/,
                    description: 'Functions must use single-word lowercase names',
                    examples: ['read', 'write', 'sync', 'init']
                },
                groupedFunctions: {
                    pattern: /^[a-z]+\.[a-z]+$/,
                    description: 'Grouped functions use dot notation',
                    examples: ['ip.get', 'status.alive', 'status.ddns']
                },
                files: {
                    pattern: /^[a-z][a-z0-9]*(\.[a-z]+)?$/,
                    description: 'Files use lowercase with optional extension',
                    examples: ['peer.js', 'utils.js', 'config.json']
                }
            },
            structure: {
                directories: {
                    required: ['src', 'script', 'test'],
                    optional: ['logs', 'radata', 'tmp', 'docs'],
                    forbidden: ['node_modules/src', 'build', 'dist']
                },
                modules: {
                    core: ['Peer.js', 'db.js', 'main.js', 'index.js'],
                    utilities: ['utils.js', 'paths.js', 'syspaths.js', 'permissions.js'],
                    scripts: ['install.js', 'config.js', 'status.js', 'ddns.js']
                }
            },
            dependencies: {
                allowed: {
                    '@akaoio/gun': '^0.2020.1240',
                    'node-fetch': '^3.0.0'
                },
                forbidden: [
                    'request', // deprecated
                    'axios',   // use node-fetch instead
                    'lodash',  // avoid heavy dependencies
                    'moment'   // use native Date
                ],
                dev: {
                    allowed: ['prettier', 'eslint'],
                    forbidden: ['webpack', 'babel'] // keep it simple
                }
            },
            patterns: {
                singleton: {
                    files: ['permissions.js', 'security.js', 'architecture.js'],
                    description: 'Export singleton instance as default'
                },
                class: {
                    files: ['Peer.js', 'Security.js', 'Architecture.js'],
                    description: 'Export class for instantiation'
                },
                asyncAwait: {
                    description: 'Use async/await over callbacks',
                    required: true
                },
                promises: {
                    description: 'Return promises from async operations',
                    required: true
                }
            },
            security: {
                forbidden: [
                    'eval(',
                    'Function(',
                    'child_process.exec(',  // use execSync or spawn
                    'fs.chmod(',            // use fs.chmodSync
                    '__proto__',
                    'prototype.constructor'
                ],
                required: [
                    'input validation',
                    'error handling',
                    'permission checks'
                ]
            },
            testing: {
                coverage: {
                    minimum: 80,
                    target: 95
                },
                structure: {
                    pattern: /test\/(unit|integration|fixtures)\/.+\.test\.js$/,
                    description: 'Tests organized by type'
                }
            }
        }
    }

    /**
     * Validate function naming
     */
    validatefunctionname(name) {
        // Check for single-word function
        if (this.rules.naming.functions.pattern.test(name)) {
            return { valid: true, type: 'function' }
        }
        
        // Check for grouped function
        if (this.rules.naming.groupedFunctions.pattern.test(name)) {
            return { valid: true, type: 'grouped' }
        }
        
        // Invalid naming
        return {
            valid: false,
            error: 'Invalid function name',
            description: this.rules.naming.functions.description,
            examples: [...this.rules.naming.functions.examples, ...this.rules.naming.groupedFunctions.examples]
        }
    }

    /**
     * Scan codebase for violations
     */
    async scan(rootPath = path.join(__dirname, '..')) {
        this.violations = []
        
        // Check directory structure
        this.checkdirectories(rootPath)
        
        // Check file naming
        this.checkfilenaming(rootPath)
        
        // Check dependencies
        this.checkdependencies(rootPath)
        
        // Check code patterns
        await this.checkpatterns(rootPath)
        
        // Check security issues
        await this.checksecurity(rootPath)
        
        return this.violations
    }

    /**
     * Check directory structure
     */
    checkdirectories(rootPath) {
        // Check required directories
        for (const dir of this.rules.structure.directories.required) {
            const dirPath = path.join(rootPath, dir)
            if (!fs.existsSync(dirPath)) {
                this.violations.push({
                    type: 'structure',
                    severity: 'error',
                    message: `Required directory missing: ${dir}`,
                    path: dirPath
                })
            }
        }
        
        // Check forbidden directories
        for (const dir of this.rules.structure.directories.forbidden) {
            const dirPath = path.join(rootPath, dir)
            if (fs.existsSync(dirPath)) {
                this.violations.push({
                    type: 'structure',
                    severity: 'warning',
                    message: `Forbidden directory exists: ${dir}`,
                    path: dirPath
                })
            }
        }
    }

    /**
     * Check file naming conventions
     */
    checkfilenaming(rootPath) {
        const checkDir = (dirPath, relativePath = '') => {
            if (!fs.existsSync(dirPath)) return
            
            const entries = fs.readdirSync(dirPath, { withFileTypes: true })
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name)
                const relPath = path.join(relativePath, entry.name)
                
                // Skip node_modules and hidden files
                if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                    continue
                }
                
                if (entry.isDirectory()) {
                    // Check directory name
                    if (!/^[a-z][a-z0-9]*$/.test(entry.name) && !['node_modules'].includes(entry.name)) {
                        this.violations.push({
                            type: 'naming',
                            severity: 'warning',
                            message: `Directory name should be lowercase: ${entry.name}`,
                            path: relPath
                        })
                    }
                    
                    // Recurse into directory
                    checkDir(fullPath, relPath)
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                    // Check JavaScript file naming
                    if (!this.rules.naming.files.pattern.test(entry.name)) {
                        this.violations.push({
                            type: 'naming',
                            severity: 'warning',
                            message: `File name should follow convention: ${entry.name}`,
                            path: relPath
                        })
                    }
                }
            }
        }
        
        checkDir(rootPath)
    }

    /**
     * Check dependencies
     */
    checkdependencies(rootPath) {
        const packagePath = path.join(rootPath, 'package.json')
        
        if (!fs.existsSync(packagePath)) return
        
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
        
        // Check forbidden dependencies
        const allDeps = {
            ...pkg.dependencies || {},
            ...pkg.devDependencies || {}
        }
        
        for (const dep of this.rules.dependencies.forbidden) {
            if (allDeps[dep]) {
                this.violations.push({
                    type: 'dependency',
                    severity: 'error',
                    message: `Forbidden dependency: ${dep}`,
                    path: 'package.json'
                })
            }
        }
        
        // Check for unnecessary dependencies
        const coreDeps = Object.keys(this.rules.dependencies.allowed)
        const actualDeps = Object.keys(pkg.dependencies || {})
        
        for (const dep of actualDeps) {
            if (!coreDeps.includes(dep) && !dep.startsWith('@types/')) {
                this.violations.push({
                    type: 'dependency',
                    severity: 'info',
                    message: `Unknown dependency: ${dep}`,
                    path: 'package.json'
                })
            }
        }
    }

    /**
     * Check code patterns
     */
    async checkpatterns(rootPath) {
        const srcPath = path.join(rootPath, 'src')
        
        if (!fs.existsSync(srcPath)) return
        
        const files = fs.readdirSync(srcPath).filter(f => f.endsWith('.js'))
        
        for (const file of files) {
            const filePath = path.join(srcPath, file)
            const content = fs.readFileSync(filePath, 'utf8')
            
            // Check for camelCase function names
            const camelCasePattern = /(?:function|const|let|var)\s+([a-z][a-zA-Z]+)\s*(?:\(|=)/g
            let match
            
            while ((match = camelCasePattern.exec(content)) !== null) {
                const funcName = match[1]
                
                // Skip known exceptions (constructors, etc.)
                if (funcName === 'constructor') continue
                
                const validation = this.validatefunctionname(funcName)
                if (!validation.valid) {
                    this.violations.push({
                        type: 'naming',
                        severity: 'error',
                        message: `Function uses camelCase: ${funcName}`,
                        path: `src/${file}`,
                        line: content.substring(0, match.index).split('\n').length,
                        suggestion: funcName.toLowerCase()
                    })
                }
            }
            
            // Check for callback patterns instead of async/await
            if (/\bcallback\s*\(/.test(content) && !file.includes('test')) {
                this.violations.push({
                    type: 'pattern',
                    severity: 'warning',
                    message: 'Use async/await instead of callbacks',
                    path: `src/${file}`
                })
            }
        }
    }

    /**
     * Check security issues
     */
    async checksecurity(rootPath) {
        const checkFile = (filePath, relativePath) => {
            const content = fs.readFileSync(filePath, 'utf8')
            
            for (const pattern of this.rules.security.forbidden) {
                if (content.includes(pattern)) {
                    const lines = content.split('\n')
                    const lineNum = lines.findIndex(line => line.includes(pattern)) + 1
                    
                    this.violations.push({
                        type: 'security',
                        severity: 'critical',
                        message: `Forbidden pattern: ${pattern}`,
                        path: relativePath,
                        line: lineNum
                    })
                }
            }
            
            // Check for hardcoded secrets
            const secretPatterns = [
                /api[_-]?key\s*[:=]\s*["'][^"']{20,}/gi,
                /password\s*[:=]\s*["'][^"']+/gi,
                /secret\s*[:=]\s*["'][^"']{20,}/gi
            ]
            
            for (const pattern of secretPatterns) {
                if (pattern.test(content)) {
                    this.violations.push({
                        type: 'security',
                        severity: 'critical',
                        message: 'Possible hardcoded secret detected',
                        path: relativePath
                    })
                }
            }
        }
        
        const scanDir = (dirPath, relativePath = '') => {
            if (!fs.existsSync(dirPath)) return
            
            const entries = fs.readdirSync(dirPath, { withFileTypes: true })
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name)
                const relPath = path.join(relativePath, entry.name)
                
                // Skip node_modules and test files
                if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
                    continue
                }
                
                if (entry.isDirectory()) {
                    scanDir(fullPath, relPath)
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                    checkFile(fullPath, relPath)
                }
            }
        }
        
        scanDir(rootPath)
    }

    /**
     * Generate report
     */
    report() {
        const report = {
            total: this.violations.length,
            critical: this.violations.filter(v => v.severity === 'critical').length,
            errors: this.violations.filter(v => v.severity === 'error').length,
            warnings: this.violations.filter(v => v.severity === 'warning').length,
            info: this.violations.filter(v => v.severity === 'info').length,
            violations: this.violations,
            passed: this.violations.length === 0
        }
        
        // Calculate score
        report.score = Math.max(0, 100 - 
            (report.critical * 25) - 
            (report.errors * 10) - 
            (report.warnings * 5) - 
            (report.info * 2))
        
        // Grade
        if (report.score >= 90) report.grade = 'A'
        else if (report.score >= 80) report.grade = 'B'
        else if (report.score >= 70) report.grade = 'C'
        else if (report.score >= 60) report.grade = 'D'
        else report.grade = 'F'
        
        return report
    }

    /**
     * Fix common violations automatically
     */
    async autofix(rootPath) {
        const fixes = []
        
        for (const violation of this.violations) {
            if (violation.type === 'naming' && violation.suggestion) {
                // Can potentially fix naming issues
                fixes.push({
                    path: violation.path,
                    from: violation.message.split(':')[1].trim(),
                    to: violation.suggestion,
                    type: 'rename'
                })
            }
        }
        
        return fixes
    }
}

export default new Architecture()