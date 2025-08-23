/**
 * Windows Platform Strategy
 * Handles Windows systems with Windows Service and Task Scheduler
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
export class WindowsStrategy {
    capabilities;
    constructor() {
        this.capabilities = this.detectCapabilities();
    }
    detectCapabilities() {
        return {
            platform: 'win32',
            hasSystemd: false,
            hasLaunchd: false,
            hasWindowsService: this.checkWindowsService(),
            hasPM2: this.checkCommand('pm2'),
            hasDocker: this.checkCommand('docker'),
            hasBun: typeof Bun !== 'undefined',
            hasNode: this.checkCommand('node'),
            hasDeno: false, // typeof Deno !== 'undefined',
            isRoot: this.isAdministrator(),
            canSudo: false // Windows uses UAC, not sudo
        };
    }
    checkWindowsService() {
        try {
            execSync('sc query', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    checkCommand(command) {
        try {
            execSync(`where ${command}`, { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    isAdministrator() {
        try {
            execSync('net session', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    async createService(config) {
        // Windows services require NSSM or similar for Node.js apps
        // For now, use Task Scheduler as alternative
        if (!this.capabilities.isRoot) {
            return {
                success: false,
                error: 'Administrator privileges required to create Windows service'
            };
        }
        try {
            const serviceName = `Air-${config.name}`;
            const runtime = this.capabilities.hasBun ? 'bun.exe' : 'node.exe';
            const execPath = path.join(config.root, 'src', 'main.ts');
            // Check if NSSM is available
            const hasNSSM = this.checkCommand('nssm');
            if (hasNSSM) {
                // Use NSSM to create proper Windows service
                execSync(`nssm install ${serviceName} ${runtime} ${execPath}`);
                execSync(`nssm set ${serviceName} AppDirectory ${config.root}`);
                execSync(`nssm set ${serviceName} Start SERVICE_AUTO_START`);
                return {
                    success: true,
                    type: 'windows-service',
                    message: `Service ${serviceName} created with NSSM`
                };
            }
            else {
                // Fallback to Task Scheduler
                const taskXml = this.generateTaskXml(config, runtime, execPath);
                const tempFile = path.join(os.tmpdir(), `${serviceName}.xml`);
                fs.writeFileSync(tempFile, taskXml);
                execSync(`schtasks /create /tn "${serviceName}" /xml "${tempFile}" /f`);
                fs.unlinkSync(tempFile);
                return {
                    success: true,
                    type: 'windows-service',
                    message: `Task ${serviceName} created in Task Scheduler`
                };
            }
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    generateTaskXml(config, runtime, execPath) {
        return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Air P2P Database - ${config.name}</Description>
  </RegistrationInfo>
  <Triggers>
    <BootTrigger>
      <Enabled>true</Enabled>
    </BootTrigger>
  </Triggers>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>3</Count>
    </RestartOnFailure>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${runtime}</Command>
      <Arguments>${execPath}</Arguments>
      <WorkingDirectory>${config.root}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>`;
    }
    async startService(name) {
        const serviceName = `Air-${name}`;
        try {
            // Try NSSM first
            if (this.checkCommand('nssm')) {
                execSync(`nssm start ${serviceName}`, { stdio: 'ignore' });
                return {
                    started: true,
                    method: 'windows-service'
                };
            }
            // Try Task Scheduler
            execSync(`schtasks /run /tn "${serviceName}"`, { stdio: 'ignore' });
            return {
                started: true,
                method: 'windows-service'
            };
        }
        catch {
            // Fallback to direct spawn
            return this.startDirect(name);
        }
    }
    async startDirect(name) {
        try {
            const runtime = this.capabilities.hasBun ? 'bun.exe' : 'node.exe';
            const configPath = path.join(process.cwd(), 'air.json');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const execPath = path.join(config.root || process.cwd(), 'src', 'main.ts');
            // Use 'start' command to spawn detached process
            const command = `start /B ${runtime} ${execPath}`;
            execSync(command, {
                cwd: config.root || process.cwd(),
                shell: 'cmd.exe',
                stdio: 'ignore'
            });
            return {
                started: true,
                method: 'spawn'
            };
        }
        catch (error) {
            return {
                started: false,
                error: error instanceof Error ? error.message : 'Failed to start'
            };
        }
    }
    async stopService(name) {
        const serviceName = `Air-${name}`;
        try {
            // Try NSSM
            if (this.checkCommand('nssm')) {
                execSync(`nssm stop ${serviceName}`, { stdio: 'ignore' });
                return true;
            }
            // Try Task Scheduler
            execSync(`schtasks /end /tn "${serviceName}"`, { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    async removeService(name) {
        const serviceName = `Air-${name}`;
        try {
            // Try NSSM
            if (this.checkCommand('nssm')) {
                execSync(`nssm remove ${serviceName} confirm`, { stdio: 'ignore' });
                return true;
            }
            // Try Task Scheduler
            execSync(`schtasks /delete /tn "${serviceName}" /f`, { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    async getServiceStatus(name) {
        const serviceName = `Air-${name}`;
        try {
            // Try NSSM
            if (this.checkCommand('nssm')) {
                const output = execSync(`nssm status ${serviceName}`, { encoding: 'utf8' });
                if (output.includes('SERVICE_RUNNING'))
                    return 'running';
                if (output.includes('SERVICE_STOPPED'))
                    return 'stopped';
            }
            // Try Task Scheduler
            const output = execSync(`schtasks /query /tn "${serviceName}"`, { encoding: 'utf8' });
            if (output.includes('Running'))
                return 'running';
            if (output.includes('Ready'))
                return 'stopped';
            return 'unknown';
        }
        catch {
            return 'unknown';
        }
    }
    async setupSSL(config) {
        const keyPath = path.join(config.root, 'ssl', 'key.pem');
        const certPath = path.join(config.root, 'ssl', 'cert.pem');
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            return {
                success: true,
                keyPath,
                certPath
            };
        }
        try {
            // Create SSL directory
            const sslDir = path.dirname(keyPath);
            fs.mkdirSync(sslDir, { recursive: true });
            // Check if OpenSSL is available
            const hasOpenSSL = this.checkCommand('openssl');
            if (hasOpenSSL) {
                const command = `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=${config.domain || 'localhost'}"`;
                execSync(command, { stdio: 'ignore' });
            }
            else {
                // Use PowerShell to generate self-signed certificate
                const psScript = `
$cert = New-SelfSignedCertificate -DnsName "${config.domain || 'localhost'}" -CertStoreLocation "Cert:\\LocalMachine\\My"
$pwd = ConvertTo-SecureString -String "password" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "${config.root}\\ssl\\cert.pfx" -Password $pwd
`;
                execSync(`powershell -Command "${psScript}"`, { stdio: 'ignore' });
                // Note: PFX format, not PEM - would need conversion
                return {
                    success: true,
                    certPath: path.join(config.root, 'ssl', 'cert.pfx'),
                    keyPath: path.join(config.root, 'ssl', 'cert.pfx')
                };
            }
            return {
                success: true,
                keyPath,
                certPath
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate SSL certificates'
            };
        }
    }
    getPaths() {
        const programData = process.env.PROGRAMDATA || 'C:\\ProgramData';
        const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        return {
            serviceDir: path.join(programData, 'Air', 'Services'),
            configDir: path.join(programData, 'Air', 'Config'),
            logDir: path.join(programData, 'Air', 'Logs'),
            dataDir: path.join(appData, 'Air', 'Data'),
            tempDir: path.join(os.tmpdir(), 'Air')
        };
    }
    getCapabilities() {
        return this.capabilities;
    }
    getName() {
        return 'Windows';
    }
}
export default WindowsStrategy;
//# sourceMappingURL=index.js.map