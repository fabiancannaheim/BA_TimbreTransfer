import os
import time
import pprint as pp

"""
0 = all messages are logged (default behavior)
1 = INFO messages are not printed
2 = INFO and WARNING messages are not printed
3 = INFO, WARNING, and ERROR messages are not printed
"""

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '0' 

import librosa
import numpy as np
import soundfile as sf
import tensorflow as tf

# Constants
RED = "\033[31m"
GREEN = "\033[32m"
BLUE = "\033[34m"
YELLOW = "\033[33m"
RESET = "\033[0m"

def load_audio_waveform(audio_path, sr=44100):
    audio, _ = librosa.load(audio_path, sr=sr, mono=False)
    if audio.ndim == 1:
        audio = np.tile(audio, (2, 1))
    return audio

def save_audio_stems(outputs, sample_rate, output_path, stem_names=['vocals', 'accompaniment']):
    for i, stem_output in enumerate(outputs):
        full_stem = np.concatenate(stem_output, axis=0)
        full_stem = np.clip(full_stem, -1.0, 1.0)
        full_stem = full_stem.astype(np.float32)
        sf.write(f'{output_path}/{stem_names[i]}.wav', full_stem, sample_rate)

def cprint(message, color, clear = True):
     if clear:
        os.system('clear')
     print(color + message + RESET)


# Params
sample_rate = 44100
chunk_duration = 2.0
chunk_size = int(chunk_duration * sample_rate)
stem_names = ['vocals', 'accompaniment']


# Paths
model_path =   '../../../models/spleeter/tflite/2stems.tflite'
audio_path =   '../../../data/audio/spleeter_tracks/Diana_Ross_Upside_Down.mp3'
output_path = f"../../../data/audio/spleeter_output/tflite/split_{int(time.time())}"


# Audio file check
if not os.path.isfile(audio_path):
    cprint(f"File {audio_path} does not exist", RED, False)


# Output folder check
if not os.path.isdir(output_path):
    os.mkdir(output_path)
    cprint(f"Output folder created: {output_path}", BLUE, False)
    

# Load audio
cprint(f"Load audio waveform with sample rate {sample_rate}", BLUE, False)
audio = load_audio_waveform(audio_path, sample_rate)
num_chunks = int(np.ceil(audio.shape[1] / chunk_size))


# Model init
interpreter = tf.lite.Interpreter(model_path=model_path)
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Model resize
first_chunk = audio[:, :chunk_size].T
cprint(f"Resizing model to input shape {first_chunk.shape}", BLUE, False)
interpreter.resize_tensor_input(input_details[0]['index'], first_chunk.shape)
interpreter.allocate_tensors()


# Inference loop
outputs = [[] for _ in output_details]
for i in range(num_chunks):
    cprint(f"Processing chunks ... ({int((i/num_chunks)*100)}%)", YELLOW, True)
    start_sample = i * chunk_size
    end_sample = start_sample + chunk_size
    audio_chunk = audio[:, start_sample:end_sample]
    if audio_chunk.shape[1] < chunk_size:
            padding = chunk_size - audio_chunk.shape[1]
            audio_chunk = np.pad(audio_chunk, ((0, 0), (0, padding)), 'constant', constant_values=(0, 0))
    audio_chunk = audio_chunk.T
    interpreter.set_tensor(input_details[0]['index'], audio_chunk.astype(np.float32))
    interpreter.invoke()
    for j, detail in enumerate(output_details):
        output_data = interpreter.get_tensor(detail['index'])
        outputs[j].append(output_data)


# Postprocessing
cprint(f"Chunks processed. Reconstruct audio...", BLUE, False)
save_audio_stems(np.array(outputs), sample_rate, output_path, stem_names)
cprint(f"DONE!", GREEN, False)