# @akaoio/air

Distributed P2P graph database with single data source - The living network that connects all agents in real-time

> Air is the breath of the living agent ecosystem - enabling real-time P2P communication without central servers

**Version**: 2.1.0  
**License**: MIT  
**Repository**: https://github.com/akaoio/air

## Overview

Air is the foundational P2P database that powers the entire living agent system. Built on GUN for distributed, real-time data synchronization without central servers.

## Core Principles


### Distributed P2P Architecture
Peer-to-peer graph database using GUN for decentralized, real-time data synchronization

**Critical**: This is a foundational requirement



### Single Data Source
One unified data source shared across multiple instances for consistency

**Critical**: This is a foundational requirement



### Real-Time Synchronization
Instant data propagation across all connected peers without polling

**Critical**: This is a foundational requirement



### XDG Compliance
Follows XDG Base Directory specification for configuration management




## Features



## Installation

```bash
# Install via npm
npm install @akaoio/air

# Or install globally
npm install -g @akaoio/air

# Start air network
npx air start
```

## Usage

### Basic Usage

```javascript
import { Air } from '@akaoio/air'

// Connect to the Air network
const air = new Air({
  peers: ['https://air.akao.io:8765/gun']
})

// Store data
air.get('agents').get('my-agent').put({
  name: 'My Agent',
  status: 'online',
  timestamp: Date.now()
})

// Listen for real-time updates
air.get('agents').map().on((agent, key) => {
  console.log(`Agent ${key}:`, agent)
})
```

### Server Usage

```bash
# Start Air server on default port (8765)
air server

# Start with custom configuration
air server --port 9000 --host 0.0.0.0

# Start with peers
air server --peers https://peer1.com:8765,https://peer2.com:8765
```

### Command Line Interface

```bash
# Initialize Air configuration
air init

# Check network status
air status

# List connected peers
air peers

# Monitor real-time data
air monitor

# Health check
air health
```

## Architecture


### Peer
Core P2P node that manages connections and data synchronization

**Responsibility**: Peer discovery, connection management, and data replication


### GUN Database
Distributed graph database engine providing CRDT-based synchronization

**Responsibility**: Data storage, conflict resolution, and real-time updates


### Network Layer
WebSocket and WebRTC communication layer for peer connections

**Responsibility**: Network protocol handling and message routing


### Storage Backend
Persistent storage layer with pluggable adapters

**Responsibility**: Data persistence and retrieval


### Security Layer
Cryptographic security and access control

**Responsibility**: Authentication, encryption, and authorization



## API Reference

### Core Methods

#### `air.get(key)`
Access data at the specified key path.

```javascript
const user = air.get('users').get('user123')
```

#### `air.put(data)`
Store data in the distributed database.

```javascript
air.get('messages').get(Date.now()).put({
  text: 'Hello, Air!',
  sender: 'agent1'
})
```

#### `air.on(callback)`
Listen for real-time data changes.

```javascript
air.get('events').on((data, key) => {
  console.log('New event:', data)
})
```

## Configuration

Create an `air.config.js` file:

```javascript
module.exports = {
  port: 8765,
  host: '0.0.0.0',
  peers: [
    'https://air.akao.io:8765/gun',
    'https://backup.akao.io:8765/gun'
  ],
  storage: {
    type: 'file',
    path: './air-data'
  },
  security: {
    enabled: true,
    encryption: 'aes-256-gcm'
  }
}
```

## Network Topology

Air creates a mesh network of interconnected peers:

```
    Peer A ←→ Peer B
       ↑         ↑
       ↓         ↓  
    Peer C ←→ Peer D
```

Each peer maintains a complete copy of the data and synchronizes changes in real-time.

## Use Cases


- No central point of failure - fully distributed architecture

- Real-time updates - instant propagation across the network

- Offline resilience - works without constant connectivity

- Conflict-free - CRDT technology ensures consistency

- Privacy-preserving - data stays within your network

- Scalable - grows with your agent ecosystem


## Development

### Requirements

- Node.js 18+
- TypeScript 5+
- @akaoio/builder for compilation
- @akaoio/battle for testing

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Local Development

```bash
# Start local Air network
npm run dev

# In another terminal, start a peer
npm run peer

# Monitor network activity
npm run monitor
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|

| `AIR_PORT` | Default port for Air node | `8765` |

| `AIR_PEERS` | Default peer URLs to connect to | `` |

| `AIR_DATA_DIR` | Directory for persistent storage | `$HOME/.local/share/air` |

| `AIR_CONFIG_DIR` | Configuration directory | `$HOME/.config/air` |

| `AIR_DEV_MODE` | Enable development mode | `false` |


## Performance

- **Real-time**: Sub-millisecond synchronization
- **Scalability**: Handles thousands of concurrent connections
- **Reliability**: Automatic failover and data recovery
- **Efficiency**: Delta synchronization reduces bandwidth

## Security

- End-to-end encryption for sensitive data
- Cryptographic signatures for data integrity
- Peer authentication and authorization
- Rate limiting and DDoS protection

## Support

- **Issues**: [GitHub Issues](https://github.com/akaoio/air/issues)
- **Documentation**: [GitHub Wiki](https://github.com/akaoio/air/wiki)
- **Community**: [Discussions](https://github.com/akaoio/air/discussions)

---

* - The living network that connects everything*

*Built with ❤️ by AKAO.IO*

---
*Generated by [Composer](https://composer.akao.io) - Atomic documentation engine*