#!/bin/bash

# Fetch all container IDs
container_ids=$(docker ps -a -q)

# Check if there are any containers to remove
if [ -z "$container_ids" ]; then
    echo "No containers to remove."
else
    # Remove all containers
    echo "Removing containers..."
    docker rm -f $container_ids
fi

