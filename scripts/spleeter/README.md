## Contents

- `split_track.sh`: Script to split a single audio file into two stems. 
   Usage: ./split_tracks.sh <audio_file_name>
   Note that <audio_file_name> must be located in `/BA_TimbreTransfer/data/audio/spleeter_tracks`

- `split_folder.sh`: Script to split all audio files in a folder and collect the vocal stems into a single directory 
   Usage: ./split_tracks.sh <input_folder_name> <output_folder_name>
   - Note that <input_folder_name> must be located in `/BA_TimbreTransfer/data/audio/spleeter_tracks`
   - Note that <output_folder_name> will be located in `/BA_TimbreTransfer/data/audio/spleeter_output`