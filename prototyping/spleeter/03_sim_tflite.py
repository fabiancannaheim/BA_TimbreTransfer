import numpy as np
import tensorflow as tf
import librosa
import soundfile as sf

# Function to convert audio to mel spectrogram
def audio_to_melspectrogram(audio, sr, n_fft=2048, hop_length=512, n_mels=512):
    spectrogram = librosa.stft(audio, n_fft=n_fft, hop_length=hop_length)
    mel_basis = librosa.filters.mel(sr=sr, n_fft=n_fft, n_mels=n_mels)
    mel_spectrogram = np.dot(mel_basis, np.abs(spectrogram))
    return mel_spectrogram

# Function to convert mel spectrogram to audio
def melspectrogram_to_audio(mel_spectrogram, sr, n_fft=2048, hop_length=512, n_mels=128):
    inv_mel_basis = np.linalg.pinv(librosa.filters.mel(sr=sr, n_fft=n_fft, n_mels=n_mels))
    audio = np.zeros((0,))
    for channel in range(mel_spectrogram.shape[-1]):
        spectrogram = np.dot(inv_mel_basis, mel_spectrogram[..., channel])
        audio_channel = librosa.griffinlim(spectrogram, hop_length=hop_length)
        audio_channel = audio_channel[:len(audio_channel)//2]  # Adjust to match original audio length
        audio = np.concatenate((audio, audio_channel))
    return audio

# Load your audio file
audio, sr = librosa.load('input_audio/02 the way you make me feel.mp3', sr=None)

# Pre-process the audio to get the mel spectrogram
mel_spectrogram = audio_to_melspectrogram(audio, sr)

# Assuming your model expects a specific input shape, reshape the spectrogram
input_data = np.expand_dims(mel_spectrogram, axis=[0, -1])  # Example shape adjustment

# Load the TensorFlow Lite model
interpreter = tf.lite.Interpreter(model_path="model.tflite")
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Ensure input_data matches the model's input shape
input_data = np.resize(input_data, input_details[0]['shape']).astype(np.float32)

interpreter.set_tensor(input_details[0]['index'], input_data)

# Run the model
interpreter.invoke()

# Retrieve the output and post-process it
output_data = interpreter.get_tensor(output_details[0]['index'])  # Adjust indexing based on your output
vocals_output = output_data[..., 0]  # Assuming first channel is vocals
accompaniment_output = output_data[..., 1]

print(np.shape(vocals_output))
print(np.shape(accompaniment_output))

# Convert each stem back to audio
vocals_audio = melspectrogram_to_audio(vocals_output.squeeze(), sr)
accompaniment_audio = melspectrogram_to_audio(accompaniment_output.squeeze(), sr)

# Save each audio track separately
sf.write('output_audio/vocals.wav', vocals_audio, sr)
sf.write('output_audio/accompaniment.wav', accompaniment_audio, sr)
