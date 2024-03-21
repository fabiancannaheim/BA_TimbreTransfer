#!/bin/bash

# Port to expose container
PORT=${1:-2222}

if [ -n "$2" ]; then
  NAME_ARG="--name $2"
else
  NAME_ARG=""
fi

# Define the Docker image name
DOCKER_IMAGE="fabiancannaheim/ddsp_nvidia_cuda_11.2.2-cudnn8-devel-ubuntu20.04:1.1.8"

# Check if the Docker image exists locally
image_exists=$(docker images -q $DOCKER_IMAGE)

if [ -z "$image_exists" ]; then
  # If the image does not exist, pull it from Docker Hub
  echo "Image $DOCKER_IMAGE not found. Pulling from Docker Hub..."
  docker pull $DOCKER_IMAGE
else
  echo "Image $DOCKER_IMAGE exists locally."
fi

# Run the Docker container as before
CONTAINER_ID=$(docker run \
    	       -d \
	       $NAME_ARG \
    	       -p $PORT:22 \
    	       --gpus all \
    	       $DOCKER_IMAGE \
    	       tail -f /dev/null)

echo "Container $CONTAINER_ID exposed on port $PORT"

sleep 5

docker logs $CONTAINER_ID | grep "SSH Public Key:" -A 1
