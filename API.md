# API Documentation - 

Complete API reference for .

## Core API

### Air Class

#### Constructor

```typescript
constructor(options: AirOptions)
```

**Options**:
- `port?: number` - Server port (default: 8765)
- `host?: string` - Server host (default: '0.0.0.0')
- `peers?: string[]` - Initial peers to connect to
- `storage?: StorageOptions` - Storage configuration
- `security?: SecurityOptions` - Security settings

#### Methods

##### `get(key: string): AirReference`

Access data at the specified key path.

```typescript
const user = air.get('users').get('user123')
```

##### `put(data: any): Promise<boolean>`

Store data in the distributed database.

```typescript
await air.put({ name: 'John', age: 30 })
```

##### `on(event: string, callback: Function): void`

Listen for real-time events.

```typescript
air.on('peer.connect', (peer) => {
  console.log('Peer connected:', peer.id)
})
```

##### `start(): Promise<void>`

Start the Air server.

```typescript
await air.start()
```

##### `stop(): Promise<void>`

Stop the Air server.

```typescript
await air.stop()
```

### AirReference Class

#### Methods

##### `put(data: any): Promise<boolean>`

Store data at this reference.

```typescript
await air.get('messages').get('msg1').put({
  text: 'Hello',
  timestamp: Date.now()
})
```

##### `get(key: string): AirReference`

Get a child reference.

```typescript
const message = air.get('messages').get('msg1')
```

##### `on(callback: (data: any, key: string) => void): void`

Listen for changes at this reference.

```typescript
air.get('messages').on((data, key) => {
  console.log('Message updated:', data)
})
```

##### `map(): AirReference`

Iterate over all children.

```typescript
air.get('users').map().on((user, id) => {
  console.log('User:', id, user)
})
```

##### `once(callback: (data: any, key: string) => void): void`

Get current value once.

```typescript
air.get('config').get('version').once((version) => {
  console.log('Version:', version)
})
```

## Network API

### Events

#### `peer.connect`
Fired when a new peer connects.

```typescript
air.on('peer.connect', (peer: PeerInfo) => {
  console.log('New peer:', peer.id)
})
```

#### `peer.disconnect`
Fired when a peer disconnects.

```typescript
air.on('peer.disconnect', (peer: PeerInfo) => {
  console.log('Peer left:', peer.id)
})
```

#### `data.sync`
Fired when data synchronizes.

```typescript
air.on('data.sync', (key: string, data: any) => {
  console.log('Data synced:', key, data)
})
```

#### `network.error`
Fired on network errors.

```typescript
air.on('network.error', (error: Error) => {
  console.error('Network error:', error)
})
```

### Peer Management

#### `getPeers(): Promise<PeerInfo[]>`

Get list of connected peers.

```typescript
const peers = await air.getPeers()
console.log('Connected peers:', peers.length)
```

#### `connectToPeer(url: string): Promise<boolean>`

Connect to a specific peer.

```typescript
await air.connectToPeer('https://peer.example.com:8765/gun')
```

#### `disconnectFromPeer(peerId: string): Promise<boolean>`

Disconnect from a specific peer.

```typescript
await air.disconnectFromPeer('peer123')
```

## Storage API

### Configuration

```typescript
const air = new Air({
  storage: {
    type: 'file',
    path: './air-data',
    options: {
      compression: true,
      encryption: true
    }
  }
})
```

### Methods

#### `backup(): Promise<string>`

Create a backup of all data.

```typescript
const backupPath = await air.backup()
console.log('Backup created:', backupPath)
```

#### `restore(backupPath: string): Promise<boolean>`

Restore data from backup.

```typescript
await air.restore('./backup-2024-08-30.json')
```

#### `clear(): Promise<boolean>`

Clear all local data.

```typescript
await air.clear()
```

## Security API

### Authentication

```typescript
// Enable authentication
const air = new Air({
  security: {
    enabled: true,
    auth: {
      type: 'keypair',
      publicKey: 'public_key_here',
      privateKey: 'private_key_here'
    }
  }
})
```

### Methods

#### `authenticate(credentials: any): Promise<boolean>`

Authenticate with the network.

```typescript
await air.authenticate({
  username: 'user',
  password: 'pass'
})
```

#### `encrypt(data: any, key?: string): string`

Encrypt data for storage.

```typescript
const encrypted = air.encrypt({ secret: 'data' })
```

#### `decrypt(encryptedData: string, key?: string): any`

Decrypt data.

```typescript
const decrypted = air.decrypt(encryptedData)
```

## CLI API

### Commands

#### `air server`

Start Air server.

```bash
air server --port 8765 --host 0.0.0.0
```

**Options**:
- `--port, -p` - Port number (default: 8765)
- `--host, -h` - Host address (default: 0.0.0.0)
- `--peers` - Comma-separated list of peer URLs
- `--storage` - Storage directory path
- `--config` - Configuration file path

#### `air status`

Check network status.

```bash
air status
```

#### `air peers`

List connected peers.

```bash
air peers --json
```

#### `air monitor`

Monitor real-time network activity.

```bash
air monitor --filter messages
```

#### `air backup`

Create data backup.

```bash
air backup --output ./backup.json
```

#### `air restore`

Restore from backup.

```bash
air restore --input ./backup.json
```

## Type Definitions

### AirOptions

```typescript
interface AirOptions {
  port?: number
  host?: string
  peers?: string[]
  storage?: StorageOptions
  security?: SecurityOptions
}
```

### PeerInfo

```typescript
interface PeerInfo {
  id: string
  url: string
  connected: boolean
  lastSeen: number
  latency?: number
}
```

### StorageOptions

```typescript
interface StorageOptions {
  type: 'memory' | 'file' | 'redis'
  path?: string
  options?: any
}
```

### SecurityOptions

```typescript
interface SecurityOptions {
  enabled: boolean
  encryption?: string
  auth?: AuthOptions
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 1000 | Connection failed |
| 1001 | Authentication failed |
| 1002 | Invalid data format |
| 1003 | Storage error |
| 1004 | Network timeout |
| 1005 | Peer not found |
| 1006 | Encryption failed |
| 1007 | Sync conflict |

## Rate Limits

- **Connections**: 100 per minute per IP
- **Data Operations**: 1000 per minute per peer
- **Broadcasts**: 10 per minute per peer

---

*Generated with ❤️ by @akaoio/composer*