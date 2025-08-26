# Air P2P Database - Sudo-Free & Singleton Implementation

## ✅ Root Cause Fixes Applied

### 1. **Singleton Pattern Implementation**
- **XDG-compliant lock files**: `~/.local/state/air/air.pid` and `$XDG_RUNTIME_DIR/air.lock`
- **Process conflict detection**: Prevents multiple instances automatically
- **Clean exit handling**: Lock files cleaned up properly on exit
- **Cross-session persistence**: PID tracking survives reboots

### 2. **Complete Sudo Elimination** 
- **Package management**: No sudo apt install - user responsibility
- **SSL certificates**: User-scope paths `~/.local/share/air/ssl/`
- **Systemd services**: User-scope only `systemctl --user`
- **Cron jobs**: User crontab instead of system cron
- **File permissions**: All operations in user home directory

### 3. **User-Scope System Integration**

#### **Systemd Service (User-Scope)**
```ini
[Unit]
Description=Air P2P Database Service  
After=network.target

[Service]
Type=simple
WorkingDirectory=$root
ExecStart=npm start
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

**Location**: `~/.config/systemd/user/air.service`
**Management**: `systemctl --user [start|stop|restart|status] air`

#### **Cron Integration (User-Scope)**
```bash
# User crontab (no sudo)
0 0 * * * /path/to/update.sh --root /path/to/air >> /path/to/air.update.log 2>&1
```

**Management**: `crontab -l`, `crontab -e` (user-scope only)

### 4. **SSL Certificate Management (User-Scope)**

#### **Options Provided**:
1. **Reverse Proxy** (recommended): nginx/apache handles SSL
2. **acme.sh** (user-scope): `~/.acme.sh/acme.sh --install-cert -d domain.com`
3. **Manual certificates**: Place in `~/.local/share/air/ssl/`
4. **Cloudflare/CDN**: External SSL termination

#### **User-Scope Paths**:
- Certificate: `~/.local/share/air/ssl/cert.pem`
- Private key: `~/.local/share/air/ssl/privkey.pem`

### 5. **XDG Base Directory Compliance**

Following Access philosophy for eternal configuration management:

```
~/.config/air/           # Configuration
~/.local/share/air/      # Data and SSL certificates  
~/.local/state/air/      # Runtime state and PID files
```

### 6. **POSIX-Compliant Scripts**

All shell scripts converted from Bash to pure POSIX sh:
- `install.sh` - No sudo installation
- `uninstall.sh` - Clean user-scope removal
- `update.sh` - User-scope updates only
- `air.sh` - Management wrapper (Access-style)

## 🔒 Security Benefits

1. **Principle of Least Privilege**: No root access required
2. **User Isolation**: All operations in user context  
3. **Clean Permissions**: No system-wide file modifications
4. **Audit Trail**: User-scope systemd logs only
5. **Easy Cleanup**: Remove user directories only

## 🚀 Installation Without Sudo

```bash
# Clone or download Air
git clone https://github.com/user/air.git
cd air

# Install without sudo (interactive)
./install.sh --env=development --name=my-air --domain=localhost

# Or non-interactive
./install.sh \
  --env=development \
  --name=my-air \
  --domain=localhost \
  --port=8765 \
  --update=false
```

**Requirements** (user installs manually):
- nodejs, npm (required)
- jq (optional, for JSON config)
- git (optional, for updates)

## 📋 Management Commands

### **Via air.sh wrapper (Access-style)**:
```bash
./air.sh start      # Start Air P2P node
./air.sh stop       # Stop Air P2P node
./air.sh restart    # Restart Air P2P node
./air.sh status     # Show status and config
./air.sh logs       # Follow logs
./air.sh config     # Show configuration
```

### **Via systemd (user-scope)**:
```bash
systemctl --user start air
systemctl --user stop air
systemctl --user restart air  
systemctl --user status air
systemctl --user enable air    # Auto-start on login
systemctl --user disable air   # Disable auto-start
```

### **Via logs**:
```bash
journalctl --user -u air -f    # Follow service logs
journalctl --user -u air --since today
```

## 🛡️ Singleton Enforcement

Air now enforces singleton pattern automatically:

```bash
$ node main.js
Air singleton lock created (PID: 12345)
Server started successfully on port 8765

$ node main.js  # Second attempt
Air is already running (PID: 12345)
Use "air stop" to stop the running instance
```

**Lock files**:
- Active process: `$XDG_RUNTIME_DIR/air.lock` 
- Persistent PID: `~/.local/state/air/air.pid`

## 🔧 Migration from Sudo-Based Installation

For existing sudo-based installations:
```bash
# Stop old system service
sudo systemctl stop air
sudo systemctl disable air
sudo rm /etc/systemd/system/air.service

# Run migration script
./migrate-to-clean.sh

# Install new user-scope version
./install.sh
```

## 🌐 Network Access Integration

Air now integrates with **Access** for IP synchronization:
- **No more GoDaddy DDNS** in Air scripts
- **No more IP detection** in Air code
- **Access handles all DNS updates** automatically

```bash
# Configure Access for IP sync
access config godaddy --domain=yourdomain.com --key=KEY --secret=SECRET

# Air focuses purely on P2P database
./air.sh start
```

## ✅ Benefits Achieved

1. **✅ Singleton enforced** - No more multiple Air instances
2. **✅ No sudo required** - Runs entirely in user-scope  
3. **✅ XDG compliance** - Follows standard directory layout
4. **✅ POSIX scripts** - Works on any Unix-like system
5. **✅ User systemd** - Proper service management
6. **✅ User cron** - No system cron modifications
7. **✅ User SSL** - Multiple certificate options
8. **✅ Clean uninstall** - No system traces left behind
9. **✅ Access integration** - Proper separation of concerns

Air is now a true **user-scope application** following the Access philosophy of eternal, sudo-free infrastructure that works forever.