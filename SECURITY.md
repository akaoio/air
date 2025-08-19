# Air Security Best Practices

## Overview

This document outlines security best practices for deploying and maintaining Air GUN database instances. Following these guidelines will help ensure your Air deployment remains secure and resilient.

## Quick Security Check

Run the built-in security analyzer:

```bash
npm run security
```

This will provide:
- System security score (0-100)
- Configuration vulnerability scan
- File permission checks
- SSL certificate validation
- Actionable recommendations

## Installation Security

### 1. User Permissions

**Never run Air as root in production.**

```bash
# Create dedicated user
sudo useradd -m -s /bin/bash airuser
sudo usermod -aG airuser $USER

# Install Air as non-root user
su - airuser
git clone https://github.com/akaoio/air.git
cd air
npm install
```

### 2. File Permissions

Air automatically sets secure permissions, but verify:

```bash
# Configuration file should be readable only by owner
chmod 600 air.json

# SSL keys must be protected
chmod 600 /path/to/privkey.pem

# Data directory should be restricted
chmod 700 radata/
```

### 3. Environment Variables

Never store secrets in environment variables that can be read by other processes:

```bash
# BAD - Visible in process list
GODADDY_KEY=abc123 npm start

# GOOD - Store in air.json with proper permissions
npm run config  # Use interactive config
```

## Network Security

### 1. SSL/TLS Configuration

Always use SSL in production:

```bash
# During setup, enable SSL
npm run setup
# Choose "production" environment
# Enable SSL when prompted
```

Air automatically:
- Configures Let's Encrypt certificates
- Sets up auto-renewal via cron
- Enforces strong cipher suites

### 2. Firewall Rules

Configure firewall to allow only necessary ports:

```bash
# Allow HTTPS (production)
sudo ufw allow 443/tcp

# Allow custom port
sudo ufw allow 8765/tcp

# Enable firewall
sudo ufw enable
```

### 3. Peer Connections

Validate peer URLs before adding:

```javascript
// Good - Secure WebSocket
"peers": ["wss://trusted-peer.com/gun"]

// Bad - Unencrypted connection
"peers": ["ws://untrusted-peer.com/gun"]
```

## Configuration Security

### 1. Sensitive Data Protection

Air provides built-in encryption for sensitive configuration:

```javascript
// Configuration will be encrypted at rest
{
  "production": {
    "godaddy": {
      "key": "encrypted:...",
      "secret": "encrypted:..."
    }
  }
}
```

### 2. Configuration Validation

Run configuration security check:

```bash
npm run security
```

This validates:
- No plain text secrets
- Proper SSL configuration
- Secure file permissions
- No hardcoded IPs (when inappropriate)

### 3. Remote Configuration Sync

If using remote config sync, ensure:

```javascript
{
  "sync": "https://secure-config-server.com/air.json"
  // Always use HTTPS
  // Authenticate the server
  // Validate received configuration
}
```

## Authentication & Authorization

### 1. SEA Cryptographic Keys

Air uses GUN's SEA for cryptographic authentication:

```javascript
// Keys are auto-generated during setup
{
  "production": {
    "pair": {
      "pub": "...",   // Public key
      "priv": "...",  // Private key (keep secret!)
      "epub": "...",  // Encryption public key
      "epriv": "..."  // Encryption private key
    }
  }
}
```

**Never share private keys (priv, epriv)!**

### 2. Access Control

Implement application-level access control:

```javascript
// In your application code
import { db } from '@akaoio/air'

// Authenticate users before allowing writes
user.auth(username, password, (ack) => {
  if (ack.err) {
    // Deny access
    return
  }
  // Allow authenticated operations
})
```

## Monitoring & Auditing

### 1. Log Monitoring

Monitor Air logs for suspicious activity:

```bash
# View recent logs
npm run logs

# Watch logs in real-time
tail -f /var/log/air-*.log

# Check for errors
grep ERROR /var/log/air-*.log
```

### 2. Status Monitoring

Regular status checks:

```bash
# Check system status
npm run status

# Monitor alive status (heartbeat)
curl https://your-air-node.com/gun/alive
```

### 3. Security Alerts

Set up alerts for:
- Failed authentication attempts
- Unexpected restarts
- Certificate expiration
- Disk space issues

## Update & Patch Management

### 1. Regular Updates

Keep Air and dependencies updated:

```bash
# Update Air
git pull
npm update

# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### 2. Automated Updates

Use the update script for production:

```bash
# Set up weekly updates via cron
crontab -e
# Add: 0 3 * * 0 /path/to/air/update.sh
```

### 3. Backup Before Updates

Always backup before updating:

```bash
# Backup configuration and data
tar -czf air-backup-$(date +%Y%m%d).tar.gz air.json radata/

# Test updates in development first
ENV=development npm start
```

## Incident Response

### 1. Security Incident Checklist

If you suspect a security breach:

1. **Isolate** - Disconnect node from network if necessary
2. **Assess** - Review logs for unauthorized access
3. **Rotate** - Generate new cryptographic keys
4. **Update** - Apply security patches
5. **Monitor** - Increase monitoring temporarily

### 2. Key Rotation

Rotate keys if compromised:

```bash
# Regenerate SEA keys
npm run config
# Select "Generate new keys"

# Update SSL certificates
sudo certbot renew --force-renewal
```

### 3. Recovery

Restore from backup if needed:

```bash
# Stop Air
systemctl stop air-*

# Restore backup
tar -xzf air-backup-*.tar.gz

# Restart with new configuration
systemctl start air-*
```

## Security Checklist

### Initial Setup
- [ ] Non-root user configured
- [ ] File permissions set (600 for air.json)
- [ ] SSL/TLS enabled for production
- [ ] Firewall configured
- [ ] SEA keys generated

### Ongoing Maintenance
- [ ] Regular security scans (`npm run security`)
- [ ] Architecture validation (`npm run arch`)
- [ ] Log monitoring active
- [ ] Automated backups configured
- [ ] Update schedule established

### Production Deployment
- [ ] All development keys replaced
- [ ] Debug mode disabled
- [ ] Rate limiting configured
- [ ] Monitoring alerts active
- [ ] Incident response plan ready

## Common Security Issues

### Issue: Exposed Configuration File

**Symptom**: air.json readable by other users

**Fix**:
```bash
chmod 600 air.json
```

### Issue: Unencrypted Peer Connections

**Symptom**: Using ws:// instead of wss://

**Fix**:
```javascript
// Update peers to use secure WebSocket
"peers": ["wss://peer.example.com/gun"]
```

### Issue: Running as Root

**Symptom**: Security score below 80

**Fix**:
```bash
# Create service user and reinstall
sudo useradd -m airuser
sudo -u airuser npm install
```

### Issue: Outdated Dependencies

**Symptom**: npm audit shows vulnerabilities

**Fix**:
```bash
npm audit fix
npm update
```

## Compliance & Standards

Air follows security best practices aligned with:

- **OWASP** - Application Security Guidelines
- **CIS** - Center for Internet Security Benchmarks
- **NIST** - Cybersecurity Framework

## Security Contact

Report security vulnerabilities to:
- GitHub Issues (for non-critical issues)
- security@akaoio.com (for critical vulnerabilities)

## Additional Resources

- [GUN Security Documentation](https://gun.eco/docs/Security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

*Last Updated: December 2024*
*Version: 1.0.0*