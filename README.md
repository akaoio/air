# What is Air

Air is a tool to help you run GUN instances with ease. It was designed to run on Raspberry Pi computers at home. IP synchronization is now handled by the Access layer.

Air is in development and the "main" branch is the development branch.

# Docs

-   GUN: https://github.com/amark/gun
-   Air: not written yet.

# Features

-   Automatically run on system startup.
-   Automatically install/renew Let'sEncrypt SSL certificate.
-   Automatically pull update from github.
-   Automatically join Air hub.
-   Automatically update heartbeat status to user space.
-   IP synchronization handled by Access layer.

# Install

## NAT/port forwarding

You might need one of the following things:

-   A domain name configured to point to your server
-   Make sure you have setup NAT/port forwarding so that Let'sEncrypt bot can find you on the internet
-   IP synchronization is handled by the Access layer (no GoDaddy configuration needed)

Tested on: Raspberry OS on Raspberry Pi 4, Ubuntu 19.10 on Acer Nitro 5.

## Standalone Super Peer.

You can install Air as a standalone GUN peer. Just clone this repo.

```bash
sudo ./install.sh
```

## NodeJS module

You can also use Air in your NodeJS projects.

```javascript
import { db } from "air"
const main = async () => {
    await db.start() // Start the db instance
    const { GUN, gun, sea, user } = db
}
main()
```
