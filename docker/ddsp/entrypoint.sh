#!/bin/bash

# Check if SSH keys already exist, generate if not
if [ ! -f /root/.ssh/id_rsa ]; then
    mkdir -p /root/.ssh
    ssh-keygen -t rsa -b 4096 -f /root/.ssh/id_rsa -q -N ""
    echo "SSH Public Key:"
    cat /root/.ssh/id_rsa.pub
fi

# Ensure correct permissions
chmod 700 /root/.ssh
chmod 600 /root/.ssh/id_rsa
chmod 644 /root/.ssh/id_rsa.pub

# Initialize SSH service
service ssh start

# Keep the container running after starting services
exec "$@"

