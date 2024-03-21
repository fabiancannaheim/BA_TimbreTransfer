# 🎚️🎧🎵 Advanced Audio Manipulation App 🎵🎧🎚️

## Project Overview

This project aims to develop a Swift application that allows users to upload audio tracks, split them into stems using Spleeter, apply DDSP timbre transfer models to modify stems like vocals, and reconstruct the track with the transferred timbre in real time. The project emphasizes DDSP models with a focus on real-time audio manipulation and the possibility of capturing and applying the voices of celebrities or users.

## Repository Structure

```
/project-root
    /docker                         # Docker configurations for development environment
    /docs                           # Documentation for the project
    /data                           # Datasets used for model training
    /models                         # Trained models
    /legacy                         # Legacy projects
        /speech_emotion_detection
    /src                            # Source code for the project
        /timbre_transfer            # DDSP related code
        /spleeter                   # Audio separation related code
        /swift_app                  # Swift application development
    /tests                          # Unit and integration tests
    /scripts                        # Utility scripts for setup, data preprocessing, etc.
    /notebooks                      # Jupyter notebooks for exploration and prototyping
    .dockerignore
    .gitignore
```

Each directory contains a README.md with detailed information about its contents and purpose.

## Development Environment Setup with Docker

Our project leverages Docker to ensure a consistent development environment across all team members' machines, simplifying dependency management and facilitating access to GPU resources for model training.

## Prerequisites

Docker installed on your development machine.
NVIDIA Docker for GPU acceleration (optional, required only if you intend to use GPU resources).

## Setting Up Your Development Environment

Clone the repository to your local machine using git clone <repository-url>.
Pull the necessary docker images from docker hub (refer to /docker/README.md)
Access the development environment through the Docker containers that have been set up. Use Docker commands to interact with these containers as needed.
For detailed instructions on using the Docker development environment, including custom configurations and GPU access, refer to /docker/README.md.

## Using GPU Resources

To leverage GPU resources for model training:
- Ensure your machine and Docker installation are configured to allow Docker containers to access the GPU.
- Follow the guidelines in /docker/README.md for setting up Docker to use GPUs.

## Project Setup and Running

To be coming soon ...

## Acknowledgments

This project stands on the shoulders of giants in the field of audio processing and machine learning. We extend our gratitude to the teams behind two pivotal tools that have significantly empowered our work:

The Differentiable Digital Signal Processing (DDSP) Team: Our project extensively utilizes the DDSP library for implementing timbre transfer models. The DDSP library has been an invaluable resource, offering a novel approach to combining classical signal processing with deep learning to achieve remarkable results in audio synthesis and manipulation. We are immensely thankful to the DDSP team at Google Magenta for their pioneering work and for making such a powerful tool openly available to the community. Their contributions have not only facilitated our project's development but also inspired us to explore innovative applications of machine learning in audio processing.

The Spleeter Team at Deezer: Spleeter, their state-of-the-art music separation tool, has been a cornerstone for our project, enabling us to split audio tracks into stems with unprecedented precision and ease. The Spleeter model's efficiency and effectiveness have greatly enhanced our workflow, allowing us to focus on the creative aspects of our project without getting bogged down by the complexities of audio separation. We extend our heartfelt appreciation to the Spleeter team for their commitment to advancing the field of music information retrieval and for generously sharing their work with the open-source community.

Both teams have not only provided the tools that are critical to our project but have also fostered a spirit of open collaboration and innovation that we deeply admire. Their dedication to advancing research and sharing knowledge openly has greatly benefited our project and the wider community. We are inspired by their work and hope to also contribute to the field in an impactful way.