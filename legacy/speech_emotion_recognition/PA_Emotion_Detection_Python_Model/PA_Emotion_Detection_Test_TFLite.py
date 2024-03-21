import os
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split

# Pfad zur Datensammlung
DATASET_PATH = "C:\\Users\\seraf\\Documents\\Schule\\Module\\PA\\TensorflowModellTest\\PA_Emotion_Modell\\Trainings und Testdaten"
LABELS = ['Angst', 'Ekel', 'Freude', 'Neutral', 'None', 'Trauer', 'Wut']


def load_data(dataset_path, sr=16000, duration=3):
    all_waveforms = []
    all_labels = []
    max_length = sr * duration  # Maximale Länge der Waveform in Samples
    for label in LABELS:
        label_dir = os.path.join(dataset_path, label)
        for wav_file in os.listdir(label_dir):
            if wav_file.lower().endswith('.wav'):
                file_path = os.path.join(label_dir, wav_file)
                waveform, _ = tf.audio.decode_wav(tf.io.read_file(file_path))
                waveform = tf.squeeze(waveform, axis=-1)

                # Wellenform auf maximale Länge kürzen oder mit Nullen auffüllen
                waveform_length = tf.shape(waveform)[0]
                padding = tf.maximum(max_length - waveform_length, 0)
                zero_padding = tf.zeros([padding], dtype=tf.float32)
                waveform = tf.concat([waveform, zero_padding], 0)
                waveform = waveform[:max_length]  # Kürzen, falls länger als max_length

                all_waveforms.append(waveform)
                all_labels.append(LABELS.index(label))
    return np.array(all_waveforms), np.array(all_labels)


# Laden der Daten
waveforms, labels = load_data(DATASET_PATH)
X_train, X_test, y_train, y_test = train_test_split(waveforms, labels, test_size=0.4, random_state=42)

# TensorFlow Lite-Modell laden
# TensorFlow Lite-Modell laden
interpreter = tf.lite.Interpreter(
    model_path="C:\\Users\\seraf\\Documents\\Schule\\Module\\PA\\TensorflowModellTest\\PA_Emotion_Modell\\TFLite\\model.tflite")
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Vorhersagen auf den Validierungsdaten
predicted_labels = []
for waveform in X_val:
    # Sicherstellen, dass die Wellenform die richtige Länge hat
    if len(waveform) > 48000:
        waveform = waveform[:48000]
    elif len(waveform) < 48000:
        waveform = np.pad(waveform, (0, 48000 - len(waveform)), 'constant')

    # Erweitern der Dimension, um die Batch-Größe zu repräsentieren
    waveform = np.expand_dims(waveform, axis=0)

    # Sicherstellen, dass die Wellenform die richtige Form hat
    if waveform.shape == (1, 48000):
        interpreter.set_tensor(input_details[0]['index'], waveform)
        interpreter.invoke()
        output_data = interpreter.get_tensor(output_details[0]['index'])
        predicted_label = np.argmax(output_data, axis=1)
        predicted_labels.extend(predicted_label)
    else:
        print("Fehlerhafte Wellenform-Form:", waveform.shape)

# Berechnung der Konfusionsmatrix
cm = confusion_matrix(y_val, predicted_labels)
cm_percent = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]

# Plot der Konfusionsmatrix
plt.figure(figsize=(10, 8))
sns.heatmap(cm_percent, annot=True, fmt=".1%", cmap="Blues", xticklabels=LABELS, yticklabels=LABELS)
plt.xlabel('Vorhergesagte Labels')
plt.ylabel('Tatsächliche Labels')
plt.title('Konfusionsmatrix in Prozent')
plt.show()