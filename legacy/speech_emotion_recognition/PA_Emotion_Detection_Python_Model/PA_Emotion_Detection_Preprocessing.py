import os
import pathlib
import numpy as np
import seaborn as sns
import tensorflow as tf
from tensorflow.keras import layers, models

# Pfad zur Datensammlung
DATASET_PATH = "C:\\Users\\seraf\\Documents\\Schule\\Module\\PA\\TensorflowModellTest\\PA_Emotion_Modell\\Trainings und Testdaten"
data_dir = pathlib.Path(DATASET_PATH)
if not data_dir.exists():
    raise Exception("Datenverzeichnis existiert nicht!")

# Laden der Daten
commands = np.array(['Angst', 'Ekel', 'Freude', 'Neutral', 'Trauer', 'Wut', 'None'])
train_ds, val_ds = tf.keras.utils.audio_dataset_from_directory(
    directory=data_dir,
    batch_size=200,
    validation_split=0.2,
    seed=42,
    output_sequence_length=48000,
    subset='both')

label_names = np.array(train_ds.class_names)
# Daten vorbereiten
def squeeze(audio, labels):
    return tf.squeeze(audio, axis=-1), labels

train_ds = train_ds.map(squeeze, tf.data.AUTOTUNE)
val_ds = val_ds.map(squeeze, tf.data.AUTOTUNE)
test_ds = val_ds.shard(num_shards=2, index=0)
val_ds = val_ds.shard(num_shards=2, index=1)

# Funktion zur Normalisierung des Audios
def normalize_audio(audio):
    mean = tf.reduce_mean(audio)
    std_dev = tf.math.reduce_std(audio)
    return (audio - mean) / std_dev

# Funktion zur Berechnung der Mel-Spektrogramme
def get_mel_spectrogram(waveform):
    spectrogram = tf.signal.stft(waveform, frame_length=2048, frame_step=1024)
    spectrogram = tf.abs(spectrogram)
    num_spectrogram_bins = spectrogram.shape[-1]
    linear_to_mel_weight_matrix = tf.signal.linear_to_mel_weight_matrix(
        512, num_spectrogram_bins, 16000, 50.0, 6000.0)
    mel_spectrogram = tf.tensordot(spectrogram, linear_to_mel_weight_matrix, 1)
    mel_spectrogram.set_shape(spectrogram.shape[:-1].concatenate(linear_to_mel_weight_matrix.shape[-1:]))
    return mel_spectrogram

# Funktion zur Berechnung der MFCCs
def get_mfccs(mel_spectrogram):
    log_mel_spectrogram = tf.math.log1p(mel_spectrogram)
    mfccs = tf.signal.mfccs_from_log_mel_spectrograms(log_mel_spectrogram)[..., :35]
    return mfccs

# Anwenden der Vorverarbeitung und Normalisierung auf die Datasets
def preprocess_dataset(ds):
    ds = ds.map(lambda audio, label: (normalize_audio(audio), label), num_parallel_calls=tf.data.AUTOTUNE)
    return ds.map(lambda audio, label: (get_mfccs(get_mel_spectrogram(audio)), label), num_parallel_calls=tf.data.AUTOTUNE)

train_ds = preprocess_dataset(train_ds)
val_ds = preprocess_dataset(val_ds)
test_ds = preprocess_dataset(test_ds)

# Modell bauen
def build_model(input_shape, num_labels):
    model = models.Sequential([
        layers.Input(shape=input_shape),
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

    model.summary()
    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    return model

# Festlegen der Input-Shape und der Anzahl der Klassen
input_shape = (45, 35)  # Zeitframes und Anzahl der MFCC-Koeffizienten
num_labels = len(commands)  # Anzahl der Klassifikationskategorien

# Erstellen des Modells
model = build_model(input_shape, num_labels)

# Training des Modells
EPOCHS = 30  # Anzahl der Epochen
history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS,
    callbacks=[tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=2, verbose=1)],
    verbose=1
)

# Speichern des Modells im SavedModel-Format (.keras)
model.save('model_saved_model')

# Laden des SavedModel-Formats
loaded_model = tf.keras.models.load_model('model_saved_model')

# Konvertieren des geladenen Modells in TensorFlow Lite Format
converter = tf.lite.TFLiteConverter.from_keras_model(loaded_model)
converter.optimizations = []
tflite_model = converter.convert()

# Speichern des TFLite-Modells in einer Datei
tflite_model_path = "C:\\Users\\seraf\\Documents\\Schule\\Module\\PA\\TensorflowModellTest\\PA_Emotion_Modell\\TFLite\\model.tflite"
with open(tflite_model_path, 'wb') as f:
    f.write(tflite_model)

# Visualisierung des Trainingsverlaufs
import matplotlib.pyplot as plt

plt.figure(figsize=(16, 6))
plt.subplot(1, 2, 1)
plt.plot(history.epoch, history.history['loss'], label='Training Loss')
plt.plot(history.epoch, history.history['val_loss'], label='Validation Loss')
plt.title('Training and Validation Loss')
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(history.epoch, history.history['accuracy'], label='Training Accuracy')
plt.plot(history.epoch, history.history['val_accuracy'], label='Validation Accuracy')
plt.title('Training and Validation Accuracy')
plt.legend()
plt.show()

# Modell evaluieren
y_pred = model.predict(test_ds)
y_pred = tf.argmax(y_pred, axis=1)
y_true = tf.concat([y for x, y in test_ds], axis=0)

confusion_mtx = tf.math.confusion_matrix(y_true, y_pred)
confusion_mtx = tf.cast(confusion_mtx, dtype=tf.float32)  # Konvertieren zu float für Division
sum_by_row = tf.reduce_sum(confusion_mtx, axis=1)  # Summe jeder Zeile
confusion_mtx_percentage = tf.divide(confusion_mtx, tf.reshape(sum_by_row, [-1, 1]))  # Normalisieren

plt.figure(figsize=(10, 8))
sns.heatmap(confusion_mtx_percentage,
            xticklabels=label_names,
            yticklabels=label_names,
            annot=True, fmt='.2%', cmap='Blues')  # Formatierung als Prozent
plt.xlabel('Vorhersage')
plt.ylabel('Tatsächlicher Wert')
plt.show()

