#!/bin/bash
# Air DDNS Update Script

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

cd /home/x/Projects/air
bun run script/ddns.ts >> /home/x/Projects/air/logs/ddns.log 2>&1