#!/bin/bash
# Fix SSL certificate permissions after renewal
# This script should be placed in /etc/letsencrypt/renewal-hooks/deploy/

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    exit 1
fi

# Create letsencrypt group if it doesn't exist
groupadd -f letsencrypt

# Set proper ownership and permissions
chgrp -R letsencrypt /etc/letsencrypt/live/$DOMAIN
chgrp -R letsencrypt /etc/letsencrypt/archive/$DOMAIN

# Make certificates readable by group
chmod 750 /etc/letsencrypt/live/$DOMAIN
chmod 750 /etc/letsencrypt/archive/$DOMAIN
chmod 640 /etc/letsencrypt/archive/$DOMAIN/*.pem

echo "Fixed SSL permissions for $DOMAIN"

# Restart Air service if it exists
if systemctl list-units --full -all | grep -Fq "air.service"; then
    systemctl restart air
    echo "Restarted Air service"
fi