# @akaoio/air

> Distributed P2P database with IP synchronization

Tool to help you run GUN instances with ease

Air is in development and the "main" branch is the development branch.

## Features


- 🚀 **Automatic Startup**: Automatically runs on system startup for seamless operation

- 🔒 **SSL Certificate Management**: Automatically installs and renews Let's Encrypt SSL certificates

- 🔄 **GitHub Auto-Update**: Automatically pulls updates from GitHub repository

- 🌐 **Air Hub Integration**: Automatically joins the Air hub network for distributed connectivity

- 💓 **Heartbeat Status**: Automatically updates heartbeat status to user space

- 🔗 **Access Layer Integration**: IP synchronization handled by the Access layer


## Installation

### Standalone Super Peer

You can install Air as a standalone GUN peer. Just clone this repo.

```bash
sudo ./install.sh
```

### NodeJS module

You can also use Air in your NodeJS projects.

```javascript
import { db } from "air"
const main = async () => {
    await db.start() // Start the db instance
    const { GUN, gun, sea, user } = db
}
main()

```

## Requirements

You might need one of the following things:


- **domain**: Domain name configured to point to your server

- **port_forwarding**: NAT/port forwarding setup for Let's Encrypt

- **access_integration**: IP synchronization handled by Access layer (no GoDaddy configuration needed)


## Tested Platforms


- Raspberry OS on Raspberry Pi 4

- Ubuntu 19.10 on Acer Nitro 5


## Documentation

- **GUN**: https://github.com/amark/gun
- **Air**: Documentation coming soon

## License

MIT © AKAO Team

---

*Built with Air v0.1.0*
*Documentation generated with @akaoio/composer*