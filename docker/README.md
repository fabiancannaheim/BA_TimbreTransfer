# Docker for Development

This directory contains Docker configurations to support our development environment, enabling easy access to GPU resources and consistent Python environments. Our Docker images are hosted on Docker Hub, ensuring that team members can quickly pull the necessary images to start development.

## Getting Started

Before starting, ensure Docker  installed on your machine. To initiate the development environment, run:

### DDSP
```
docker pull fabiancannaheim/ddsp_nvidia_cuda_11.2.2-cudnn8-devel-ubuntu20.04
```
```
docker run 
    --gpus all 
    -v BA_TimbreTransfer:/BA_TimbreTransfer 
    -p 8888:8888 
    -p 6006:6006 
    fabiancannaheim/ddsp_nvidia_cuda_11.2.2-cudnn8-devel-ubuntu20.04
    jupyter notebook --ip=0.0.0.0 --port=8888 --no-browser --allow-root
```

-v: map host directory to container directory (gives access to data)
-p: map container port to host port (8888 for jupyter notebook, 6006 for tensorboard)

### AudioCraft
```
docker pull fabiancannaheim/audiocraft_nvidia_cuda_11.2.2_cudnn8-runtime_ubuntu20.04
```
To run AudioCraft with Jupyter Notebook:<br>
```
docker run 
    --gpus all 
    -p 8888:8888
    -e START_MODE=jupyter 
    fabiancannaheim/audiocraft_nvidia_cuda_11.2.2_cudnn8-runtime_ubuntu20.04
```
To run MusicGen with GUI:<br>
```
docker run 
    --gpus all 
    -p 7860:7860 
    -e START_MODE=musicgen 
    -e SPACE_ID=1 
    fabiancannaheim/audiocraft_nvidia_cuda_11.2.2_cudnn8-runtime_ubuntu20.04
```
 
## Accessing GPU Resources

Our Docker setup is configured to allow access to GPU resources for model training. Make sure your Docker engine is set up to support NVIDIA Docker if you plan to utilize GPU acceleration.

For detailed instructions on using our Docker environment for development, including accessing GPU resources, refer to the main project README and the documentation in this directory.
