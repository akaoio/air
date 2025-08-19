#!/usr/bin/env node

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * Security module for Air
 * Implements security best practices and validation
 */

export class Security {
    constructor() {
        this.platform = os.platform()
        this.isRoot = process.getuid && process.getuid() === 0
    }

    /**
     * Generate secure random keys
     */
    generatekey(length = 32) {
        return crypto.randomBytes(length).toString('hex')
    }

    /**
     * Generate secure password
     */
    generatepassword(length = 16) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
        const bytes = crypto.randomBytes(length)
        let password = ''
        
        for (let i = 0; i < length; i++) {
            password += charset[bytes[i] % charset.length]
        }
        
        return password
    }

    /**
     * Hash sensitive data
     */
    hash(data, algorithm = 'sha256') {
        return crypto.createHash(algorithm).update(data).digest('hex')
    }

    /**
     * Encrypt sensitive data
     */
    encrypt(text, password) {
        const algorithm = 'aes-256-gcm'
        const salt = crypto.randomBytes(32)
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256')
        const iv = crypto.randomBytes(16)
        
        const cipher = crypto.createCipheriv(algorithm, key, iv)
        
        let encrypted = cipher.update(text, 'utf8', 'hex')
        encrypted += cipher.final('hex')
        
        const authTag = cipher.getAuthTag()
        
        return {
            encrypted,
            salt: salt.toString('hex'),
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            algorithm
        }
    }

    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedData, password) {
        const algorithm = encryptedData.algorithm || 'aes-256-gcm'
        const salt = Buffer.from(encryptedData.salt, 'hex')
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256')
        const iv = Buffer.from(encryptedData.iv, 'hex')
        const authTag = Buffer.from(encryptedData.authTag, 'hex')
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv)
        decipher.setAuthTag(authTag)
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        
        return decrypted
    }

    /**
     * Validate configuration security
     */
    validateconfig(config) {
        const issues = []
        
        // Check for exposed secrets
        const sensitiveFields = ['key', 'secret', 'password', 'token', 'priv', 'epriv']
        const checkObject = (obj, path = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key
                
                if (typeof value === 'object' && value !== null) {
                    checkObject(value, currentPath)
                } else if (typeof value === 'string') {
                    // Check if sensitive field contains plain text secrets
                    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                        if (value.length > 0 && value.length < 200 && !value.startsWith('encrypted:')) {
                            issues.push({
                                type: 'warning',
                                path: currentPath,
                                message: 'Possible plain text secret detected'
                            })
                        }
                    }
                    
                    // Check for hardcoded IPs
                    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(value) && !key.includes('ip')) {
                        issues.push({
                            type: 'info',
                            path: currentPath,
                            message: 'Hardcoded IP address detected'
                        })
                    }
                }
            }
        }
        
        checkObject(config)
        
        // Check SSL configuration
        if (config.production?.ssl) {
            const ssl = config.production.ssl
            
            if (!ssl.key || !ssl.cert) {
                issues.push({
                    type: 'error',
                    path: 'production.ssl',
                    message: 'SSL configuration incomplete'
                })
            }
            
            // Check if SSL files exist and are readable
            if (ssl.key && !fs.existsSync(ssl.key)) {
                issues.push({
                    type: 'warning',
                    path: 'production.ssl.key',
                    message: 'SSL key file not found'
                })
            }
            
            if (ssl.cert && !fs.existsSync(ssl.cert)) {
                issues.push({
                    type: 'warning',
                    path: 'production.ssl.cert',
                    message: 'SSL certificate file not found'
                })
            }
        }
        
        // Check file permissions
        if (config.root) {
            const configPath = path.join(config.root, 'air.json')
            if (fs.existsSync(configPath)) {
                const stats = fs.statSync(configPath)
                const mode = '0' + (stats.mode & parseInt('777', 8)).toString(8)
                
                if (mode !== '0600' && mode !== '0640') {
                    issues.push({
                        type: 'error',
                        path: 'file',
                        message: `Configuration file permissions (${mode}) are too open`
                    })
                }
            }
        }
        
        return issues
    }

    /**
     * Sanitize user input
     */
    sanitize(input, type = 'string') {
        if (typeof input !== 'string') return input
        
        switch (type) {
            case 'filename':
                // Remove dangerous characters from filenames
                return input.replace(/[^a-zA-Z0-9._-]/g, '')
                
            case 'path':
                // Remove path traversal attempts
                return input.replace(/\.\./g, '').replace(/[^a-zA-Z0-9./_-]/g, '')
                
            case 'url':
                // Basic URL sanitization
                try {
                    const url = new URL(input)
                    return url.href
                } catch {
                    return ''
                }
                
            case 'command':
                // Escape shell command arguments
                return input.replace(/[;&|`$()<>]/g, '')
                
            default:
                // General string sanitization
                return input.replace(/[<>]/g, '')
        }
    }

    /**
     * Validate input against patterns
     */
    validate(input, type) {
        const patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            domain: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
            ip: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
            port: /^[1-9][0-9]{0,4}$/,
            alphanumeric: /^[a-zA-Z0-9]+$/,
            url: /^https?:\/\/.+/
        }
        
        const pattern = patterns[type]
        if (!pattern) return false
        
        return pattern.test(String(input))
    }

    /**
     * Check system security
     */
    checksystem() {
        const report = {
            score: 100,
            issues: [],
            recommendations: []
        }
        
        // Check if running as root
        if (this.isRoot) {
            report.score -= 20
            report.issues.push('Running as root user')
            report.recommendations.push('Run Air as a non-privileged user')
        }
        
        // Check Node.js version
        const nodeVersion = process.version
        const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1))
        
        if (majorVersion < 18) {
            report.score -= 10
            report.issues.push(`Node.js version ${nodeVersion} is outdated`)
            report.recommendations.push('Update to Node.js 18 or later')
        }
        
        // Check for security-related environment variables
        const dangerousEnvVars = ['NODE_TLS_REJECT_UNAUTHORIZED', 'NODE_DISABLE_COLORS']
        
        for (const envVar of dangerousEnvVars) {
            if (process.env[envVar]) {
                report.score -= 5
                report.issues.push(`Dangerous environment variable: ${envVar}`)
                report.recommendations.push(`Remove ${envVar} from environment`)
            }
        }
        
        // Check file permissions on sensitive directories
        const sensitivePaths = [
            { path: '/etc/letsencrypt', maxMode: '0755' },
            { path: process.env.HOME + '/.ssh', maxMode: '0700' }
        ]
        
        for (const item of sensitivePaths) {
            if (fs.existsSync(item.path)) {
                const stats = fs.statSync(item.path)
                const mode = '0' + (stats.mode & parseInt('777', 8)).toString(8)
                
                if (parseInt(mode, 8) > parseInt(item.maxMode, 8)) {
                    report.score -= 5
                    report.issues.push(`${item.path} permissions (${mode}) are too open`)
                    report.recommendations.push(`chmod ${item.maxMode} ${item.path}`)
                }
            }
        }
        
        // Calculate final grade
        if (report.score >= 90) report.grade = 'A'
        else if (report.score >= 80) report.grade = 'B'
        else if (report.score >= 70) report.grade = 'C'
        else if (report.score >= 60) report.grade = 'D'
        else report.grade = 'F'
        
        return report
    }

    /**
     * Create secure temporary file
     */
    tempfile(prefix = 'air-') {
        const tmpDir = os.tmpdir()
        const filename = `${prefix}${Date.now()}-${this.generatekey(8)}`
        return path.join(tmpDir, filename)
    }

    /**
     * Rate limiting helper
     */
    ratelimit(key, maxAttempts = 5, windowMs = 60000) {
        if (!this.rateLimitStore) {
            this.rateLimitStore = new Map()
        }
        
        const now = Date.now()
        const record = this.rateLimitStore.get(key) || { attempts: 0, resetAt: now + windowMs }
        
        // Reset if window expired
        if (now > record.resetAt) {
            record.attempts = 0
            record.resetAt = now + windowMs
        }
        
        record.attempts++
        this.rateLimitStore.set(key, record)
        
        return {
            allowed: record.attempts <= maxAttempts,
            remaining: Math.max(0, maxAttempts - record.attempts),
            resetAt: record.resetAt
        }
    }
}

export default new Security()