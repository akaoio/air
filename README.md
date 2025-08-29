# @akaoio/air

Distributed P2P graph database with single data source - The living network that connects all agents in real-time

> Air is the breath of the living agent ecosystem - enabling real-time P2P communication without central servers

**Version**: 2.1.0  
**License**: MIT  
**Repository**: https://github.com/akaoio/air

## Overview

Air provides the distributed data layer for the Living Agent Network, enabling real-time P2P communication between agents using GUN database technology.

## Core Principles


### Distributed P2P Architecture
Peer-to-peer graph database using GUN for decentralized, real-time data synchronization



### Single Data Source
One unified data source shared across multiple instances for consistency



### Real-Time Synchronization
Instant data propagation across all connected peers without polling



### XDG Compliance
Follows XDG Base Directory specification for configuration management




## Features


- **Real-Time P2P Sync**: Instant synchronization across all connected peers without central servers

- **Conflict-Free Replication**: CRDT-based data types ensure eventual consistency without conflicts

- **Offline-First**: Works offline and syncs when connection is restored

- **Graph Database**: Flexible graph structure for complex data relationships

- **WebSocket Support**: Real-time bidirectional communication via WebSockets

- **Development Bypass**: Special development mode for testing without full P2P stack

- **TypeScript Native**: Written in TypeScript with full type safety

- **Living Agent Integration**: Native integration with the multi-agent ecosystem


## Installation

```bash
# Quick install with default settings
curl -sSL https://raw.githubusercontent.com/akaoio/stacker/main/install.sh | sh

# Install as systemd service
curl -sSL https://raw.githubusercontent.com/akaoio/stacker/main/install.sh | sh -s -- --systemd

# Install with custom prefix
curl -sSL https://raw.githubusercontent.com/akaoio/stacker/main/install.sh | sh -s -- --prefix=/opt/manager
```

## Usage

```bash
# Initialize a new Manager-based project
manager init

# Configure settings
manager config set update.interval 3600

# Install application
manager install --systemd

# Check health
manager health

# Update application
manager update
```

## Commands


### `start`
Start the Air P2P node

**Usage**: `air start [options]`



### `status`
Check node status and connections

**Usage**: `air status`



### `peers`
List connected peers

**Usage**: `air peers`



### `data`
Interact with the distributed database

**Usage**: `air data [get|put|subscribe] [path] [value]`









## Architecture Components


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



## Use Cases



## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|

| `AIR_PORT` | Default port for Air node | `8765` |

| `AIR_PEERS` | Default peer URLs to connect to | `` |

| `AIR_DATA_DIR` | Directory for persistent storage | `$HOME/.local/share/air` |

| `AIR_CONFIG_DIR` | Configuration directory | `$HOME/.config/air` |

| `AIR_DEV_MODE` | Enable development mode | `false` |


## 



### Benefits



## Development

Manager follows strict POSIX compliance and zero-dependency principles. All code must be pure POSIX shell without bashisms or GNU extensions.

### Contributing

1. Fork the repository
2. Create your feature branch
3. Ensure POSIX compliance
4. Add tests using the test framework
5. Submit a pull request

### Testing

```bash
# Run all tests
./tests/run-all.sh

# Run specific test suite
./tests/test-core.sh
```

## Support

- **Issues**: [GitHub Issues](https://github.com/akaoio/stacker/issues)
- **Documentation**: [Wiki](https://github.com/akaoio/stacker/wiki)
- **Community**: [Discussions](https://github.com/akaoio/stacker/discussions)

---

*@akaoio/air - The foundational framework that brings order to chaos*

*Built with zero dependencies for eternal reliability*