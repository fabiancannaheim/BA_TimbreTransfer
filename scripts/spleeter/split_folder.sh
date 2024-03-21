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

# Check for correct number of arguments
if [ $# -ne 2 ]; then
    echo "Usage: $0 <input_folder_name> <output_folder_name>"
    exit 1
fi

input_folder_name=$1
output_folder_name=$2

input_path="/BA_TimbreTransfer/data/audio/spleeter_tracks/${input_folder_name}"
output_path="/BA_TimbreTransfer/data/audio/spleeter_output/${output_folder_name}"

# Main script
check_spleeter_installed
set_model_path

# Create the final output folder if it doesn't exist
mkdir -p "${output_path}"

# Process each audio file in the input directory
for file in "${input_path}"/*; do
    if [[ $file == *.mp3 || $file == *.wav ]]; then
        echo "Processing file: $file"
        spleeter separate -p spleeter:2stems -o "/BA_TimbreTransfer/data/audio/spleeter_output" "$file"
        # Extracting base filename to use for creating the source-specific output directory
        base_filename=$(basename "$file" | cut -d. -f1)
        # Move vocal files to the specified output folder
        mv "/BA_TimbreTransfer/data/audio/spleeter_output/${base_filename}/vocals.wav" "${output_path}/${base_filename}_vocals.wav"
        # Remove output folder
        rm -r "/BA_TimbreTransfer/data/audio/spleeter_output/${base_filename}"
    fi
done

echo "All vocal tracks have been processed and moved to ${output_path}"
