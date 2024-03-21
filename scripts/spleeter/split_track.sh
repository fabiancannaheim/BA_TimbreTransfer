#!/bin/bash

# Function to check if Spleeter is installed
function check_spleeter_installed {
    if ! spleeter --help > /dev/null 2>&1; then
        echo "Spleeter is not installed. Installing Spleeter..."
        pip install spleeter
        if [ $? -eq 0 ]; then
            echo "Spleeter installed successfully."
        else
            echo "Failed to install Spleeter. Please check your Python/pip setup."
            exit 1
        fi
    else
        echo "Spleeter is already installed."
    fi
}

# Function to set MODEL_PATH if not already set
function set_model_path {
    if [ -z "${MODEL_PATH}" ]; then
        export MODEL_PATH="/BA_TimbreTransfer/models/spleeter/pretrained_models"
        echo "MODEL_PATH was not set. It's now set to ${MODEL_PATH}"
    else
        echo "MODEL_PATH is already set to ${MODEL_PATH}"
    fi
}

if [ $# -eq 0 ]; then
    echo "No track name provided. Usage: $0 <track_name.mp3>"
    exit 1
fi

check_spleeter_installed
set_model_path

track_name=$1
track_path="/BA_TimbreTransfer/data/audio/spleeter_tracks/${track_name}"
output_path="/BA_TimbreTransfer/data/audio/spleeter_output"

if [ -f "${track_path}" ]; then
    spleeter separate -p spleeter:2stems -o "${output_path}" "${track_path}"
    echo "Track has been processed and output is available at ${output_path}"
else
    echo "The specified track does not exist at ${track_path}. Please check the file name and try again."
fi
