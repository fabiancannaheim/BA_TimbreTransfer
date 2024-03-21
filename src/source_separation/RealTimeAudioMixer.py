import os
import time
import resampy
import pyaudio
import librosa
import numpy as np
import soundfile as sf

os.chdir(os.path.dirname(os.path.abspath(__file__)))

p = pyaudio.PyAudio()

CHUNK_SIZE = 2048 
DDSP_INFERENCE_TIME = 0.01

TRACK_NAME = 'Taylor_Swift_Anti_Hero'
PARENT_DIR = os.path.join('..', '..', 'data', 'audio', 'spleeter_output')



def read_audio(file_path):
    data, samplerate = sf.read(file_path, dtype='float32')
    return data, samplerate

def callback(in_data, frame_count, time_info, status):
    global vocals, accompaniment, CHUNK_SIZE
    vocal_chunk = vocals[:CHUNK_SIZE]
    accompaniment_chunk = accompaniment[:CHUNK_SIZE]
    processed_vocal_chunk = apply_ddsp_model_to_chunk(vocal_chunk)
    mixed_chunk = processed_vocal_chunk + accompaniment_chunk
    vocals = vocals[CHUNK_SIZE:]
    accompaniment = accompaniment[CHUNK_SIZE:]
    if len(mixed_chunk) < CHUNK_SIZE:
        mixed_chunk = np.pad(mixed_chunk, (0, CHUNK_SIZE - len(mixed_chunk)), mode='constant', constant_values=0)
    return (mixed_chunk.tobytes(), pyaudio.paContinue)

def apply_ddsp_model_to_chunk(audio_chunk):
    # Apply timbre transfer model
    time.sleep(DDSP_INFERENCE_TIME)
    processed_chunk = audio_chunk  
    return processed_chunk

def extend_to_stereo(audio):
    if audio.ndim == 1:
        stereo_audio = np.column_stack((audio, audio))
    elif audio.ndim == 2 and audio.shape[1] == 1: 
        stereo_audio = np.column_stack((audio, audio)) 
    elif audio.ndim == 2 and audio.shape[1] == 2:
        stereo_audio = audio
    else:
        raise ValueError("Input audio must be mono or stereo")
    return stereo_audio


# Read audio
vocals_path = os.path.join(PARENT_DIR, TRACK_NAME, 'vocals.wav')
accompaniment_path = os.path.join(PARENT_DIR, TRACK_NAME, 'accompaniment.wav')
vocals, sr_vocals = read_audio(vocals_path)
accompaniment, sr_accompaniment = read_audio(accompaniment_path)

# Adjust sample rate if necessary
if sr_vocals < sr_accompaniment:
    vocals = librosa.resample(vocals, orig_sr=sr_vocals, target_sr=44100)
    sr_vocals = 44100
elif sr_accompaniment < sr_vocals:
    accompaniment = librosa.resample(accompaniment, orig_sr=sr_accompaniment, target_sr=44100)
    sr_accompaniment = 44100

# Adjust length if necessary 
min_length = min(len(vocals), len(accompaniment))
vocals = vocals[:min_length]
accompaniment = accompaniment[:min_length]

# Extend to stereo if necessary
vocals = extend_to_stereo(vocals)
accompaniment = extend_to_stereo(accompaniment)

# Add tracks
mixed_audio = vocals + accompaniment

# Open stream
stream = p.open(format=pyaudio.paFloat32,
                channels=2,
                rate=sr_vocals,
                output=True,
                stream_callback=callback,
                frames_per_buffer=CHUNK_SIZE)


stream.start_stream()
while stream.is_active():
    pass
stream.stop_stream()
stream.close()

p.terminate()