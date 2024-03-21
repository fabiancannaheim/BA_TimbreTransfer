import os
import pathlib
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models

# Pfad zur Datensammlung
DATASET_PATH = "C:\\Users\\seraf\\Documents\\Schule\\Module\\PA\\TensorflowModellTest\\PA_Emotion_Modell\\Trainings und Testdaten"
data_dir = pathlib.Path(DATASET_PATH)
if not data_dir.exists():
    raise Exception("Datenverzeichnis existiert nicht!")

# Laden der Daten
commands = np.array(['Angst', 'Ekel', 'Freude', 'Neutral', 'None', 'Trauer', 'Wut'])
train_ds, val_ds = tf.keras.utils.audio_dataset_from_directory(
    directory=data_dir,
    batch_size=200,
    validation_split=0.2,
    seed=42,
    output_sequence_length=48000,
    subset='both')

# Daten vorbereiten
train_ds = train_ds.map(lambda audio, label: (tf.squeeze(audio, axis=-1), label))
val_ds = val_ds.map(lambda audio, label: (tf.squeeze(audio, axis=-1), label))
test_ds = val_ds.shard(num_shards=2, index=0)
val_ds = val_ds.shard(num_shards=2, index=1)


# Mel-Spektrogramm und MFCCs direkt im Modell berechnen
class AudioPreprocessingLayer(layers.Layer):
    def __init__(self):
        super(AudioPreprocessingLayer, self).__init__()

    def call(self, waveform):
        # Normalisierung
        mean = tf.reduce_mean(waveform)
        std_dev = tf.math.reduce_std(waveform)
        normalized_waveform = (waveform - mean) / std_dev

        # Mel-Spektrogramm
        spectrogram = tf.signal.stft(normalized_waveform, frame_length=2048, frame_step=1024)
        spectrogram = tf.abs(spectrogram)
        num_spectrogram_bins = spectrogram.shape[-1]
        linear_to_mel_weight_matrix = tf.signal.linear_to_mel_weight_matrix(
            512, num_spectrogram_bins, 16000, 50.0, 6000.0)
        mel_spectrogram = tf.tensordot(spectrogram, linear_to_mel_weight_matrix, 1)
        mel_spectrogram.set_shape(spectrogram.shape[:-1].concatenate(linear_to_mel_weight_matrix.shape[-1:]))

        # MFCCs
        log_mel_spectrogram = tf.math.log1p(mel_spectrogram)
        mfccs = tf.signal.mfccs_from_log_mel_spectrograms(log_mel_spectrogram)[..., :35]
        mfccs = spectrogram[..., :35]
        return mfccs


# Modell bauen
def build_model(input_shape, num_labels):
    model = models.Sequential([
        layers.Input(shape=input_shape),
        AudioPreprocessingLayer(),
        layers.Reshape((45, 35, 1)),
        layers.Conv2D(32, (5, 5), activation='relu', padding='same'),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.175),
        layers.Conv2D(128, (5, 5), activation='relu', padding='same'),
        layers.MaxPooling2D((2, 2)),
        layers.Flatten(),
        layers.Dense(128, activation='sigmoid'),
        layers.Dropout(0.15),
        layers.Dense(num_labels, activation='softmax'),
    ])

    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    return model


input_shape = (48000,)  # ursprüngliche Wellenformlänge
num_labels = len(commands)

model = build_model(input_shape, num_labels)

# Training des Modells
EPOCHS = 20
history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS,
    callbacks=[tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=2, verbose=1)],
    verbose=1
)

# Vorhersagen auf dem Testdatensatz
y_pred = model.predict(test_ds)
predicted_classes = tf.argmax(y_pred, axis=1)

# Klassenindizes in Klassennamen umwandeln
class_names = commands  # oder train_ds.class_names, wenn es verfügbar ist

# Tatsächliche Labelnamen
true_label_names = np.array(class_names)[true_labels]

# Vorhergesagte Labelnamen
predicted_label_names = np.array(class_names)[predicted_classes]

# Konfusionsmatrix mit Klassenindizes erstellen
confusion_mtx = tf.math.confusion_matrix(true_labels, predicted_classes)

# Konfusionsmatrix in Prozent umwandeln
confusion_mtx_percentage = confusion_mtx / tf.reduce_sum(confusion_mtx, axis=1)[:, tf.newaxis]

# Konfusionsmatrix visualisieren mit Klassennamen
plt.figure(figsize=(10, 8))
sns.heatmap(confusion_mtx_percentage, annot=True, fmt='.2%', cmap='Blues',
            xticklabels=class_names, yticklabels=class_names)
plt.xlabel('Vorhergesagte Labels')
plt.ylabel('Tatsächliche Labels')
plt.title('Prozentuale Konfusionsmatrix')
plt.show()

# Konvertieren in TFLite-Modell
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

# Speichern des TFLite-Modells
tflite_model_path = "C:\\Users\\seraf\\Documents\\Schule\\Module\\PA\\TensorflowModellTest\\PA_Emotion_Modell\\TFLite\\model.tflite"
with open(tflite_model_path, 'wb') as f:
    f.write(tflite_model)
