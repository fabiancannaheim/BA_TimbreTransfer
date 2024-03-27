import os

"""
0 = all messages are logged (default behavior)
1 = INFO messages are not printed
2 = INFO and WARNING messages are not printed
3 = INFO, WARNING, and ERROR messages are not printed
"""

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '0' 

import glob
import pickle
import pprint
import numpy as np
import tensorflow as tf
import tensorboard as tb
import ddsp.processors as processors
import ddsp.training.data_preparation.prepare_tfrecord_lib as prep
from ddsp import core
from matplotlib import pyplot as plt
from ddsp.synths import (Harmonic, FilteredNoise)
from ddsp.losses import SpectralLoss
from ddsp.training import (data, decoders, encoders, models, preprocessing, postprocessing, train_util, trainers)


# GPU
tf.config.run_functions_eagerly(True)
tf.data.experimental.enable_debug_mode()
gpus = tf.config.experimental.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            print(gpu)
            tf.config.experimental.set_memory_growth(gpu, True)
    except RuntimeError as e:
        print(e)


# Colors
RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"
CYAN = "\033[36m"
RESET = "\033[0m"


# Locations
DATA_NAME = 'spleeter_output'
MODEL_NAME = 'jackson1'
CUR_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(os.path.dirname(CUR_DIR))
DATA_DIR = os.path.join(BASE_DIR, 'data')
AUDIO_DIR = os.path.join(DATA_DIR, 'audio', DATA_NAME)
TF_RECORD_DIR = os.path.join(DATA_DIR, 'tfrecords', DATA_NAME)
MODEL_DIR = os.path.join(BASE_DIR, 'models', MODEL_NAME)
AUDIO_FILEPATTERN = os.path.join(AUDIO_DIR, '*')
TF_RECORD_FILEPATTERN = os.path.join(TF_RECORD_DIR, '*/train.tfrecord*')
PICKLE_FILE_PATH = os.path.join(MODEL_DIR, 'dataset_statistics.plk')


# Preprocessing params
NUM_SHARDS = 20         # Number of tfrecord files to create
SAMPLE_RATE = 16000     # Number of samples per second
FRAME_RATE = 250        # Rate in which F0 and loudness are extracted
EXAMPLE_SECS = 4        # Duration of audio chunks
HOP_SECS = 1            # Hop size between example start points (in seconds)
EVAL_SPLIT = 0.0        # Fraction of the dataset to reserve for eval split
CHUNK_SECS = 20.0       # Maximum duration to consider for processing
CENTER = True           # Padding such that frame timestamps are centered
VITERBI = False         # Use viterbi decoding of pitch


# Postprocessing params
BATCH_SIZE = 16         # Batch size for computation of dataset statistics
POWER_FRAME_SIZE = 512  # Calculate power features on the fly with this frame size
POWER_FRAME_RATE = 250  # Calculate power features on the fly with this frame rate


# Model params
TIME_STEPS = 3000       
HAS_ENCODER = True  
Z_DIMS = 16             # Breadth of latent feature space
Z_TIME_STEPS = 125      # Temporal resolution of latent feature space 
RNN_CHANNELS = 512      # Dimensions of the RNN layer
RNN_TYPE = 'gru'        # or lstm
CH = 512                # Dimensions of the fully connected layers
LOSS_TYPE = 'L1'        # Type of loss function
LAYERS_PER_STACK = 3    # Fully connected layers per stack
LEARNING_RATE = 1e-3    # Speed at which your model learns; Too high can lead to instability; too low can cause slow convergence.
DECODER_AMPS_NUM = 1
DECODER_HARMONICS_NUM = 100
DECODER_NOISE_NUM = 65
DECODER_INPUT_KEYS = ('ld_scaled', 'f0_scaled', 'z') if HAS_ENCODER else ('ld_scaled', 'f0_scaled')



# Training params
NUM_STEPS = 500000
STEPS_PER_SAVE = 300
STEPS_PER_SUMMARY = 300
CKPTS_TO_KEEP = 20
TRAIN_BATCH_SIZE = 16
EARLY_STOP_LOSS_VALUE = 4.5
REPORT_LOSS_TO_HYPERTUNE = False


# Audio
mp3_files = glob.glob(os.path.join(AUDIO_DIR, '*.mp3'))
wav_files = glob.glob(os.path.join(AUDIO_DIR, '*.wav'))
audio_files = mp3_files + wav_files


# TFRecord directory if not exists 
if not os.path.exists(TF_RECORD_DIR): 
    os.makedirs(TF_RECORD_DIR)


# Create tfrecords if not present
if len(os.listdir(TF_RECORD_DIR)) == 0:
    print(GREEN + "No tfrecords found. Prepare tfrecords..." + RESET)
    prep.prepare_tfrecord(
        tf.io.gfile.glob(AUDIO_FILEPATTERN),
        TF_RECORD_FILEPATTERN,
        NUM_SHARDS, 
        SAMPLE_RATE, 
        FRAME_RATE,
        EXAMPLE_SECS,
        HOP_SECS,
        EVAL_SPLIT,
        CHUNK_SECS,
        CENTER,
        VITERBI
    )
else:
    print(GREEN + f"Tfrecords found in {TF_RECORD_DIR}. Skip preprocessing..." + RESET)


# Training data
data_provider = data.TFRecordProvider(TF_RECORD_FILEPATTERN, centered=CENTER)


# Model directory if not exists 
if not os.path.exists(MODEL_DIR): 
    os.makedirs(MODEL_DIR)


# Compute dataset statistics if not present
if not os.path.isfile(PICKLE_FILE_PATH):
    print(GREEN + "No dataset statistics found. Compute dataset statistics..." + RESET)
    dataset = data_provider.get_dataset(shuffle=False)
    ds = data_provider.get_batch(BATCH_SIZE, repeats=1)
    ds_stats = postprocessing.compute_dataset_statistics(data_provider, BATCH_SIZE, POWER_FRAME_SIZE, POWER_FRAME_RATE)
    if PICKLE_FILE_PATH is not None:
        with tf.io.gfile.GFile(PICKLE_FILE_PATH, 'wb') as f:
            pickle.dump(ds_stats, f)
        print(GREEN + f'Done! Saved dataset statistics to: {PICKLE_FILE_PATH}' + RESET)
else:
    print(GREEN + f"Dataset statistics found in {PICKLE_FILE_PATH}. Skip computation..." + RESET)


# Number of samples
dataset = data_provider.get_dataset(shuffle=False)
batch = next(iter(dataset))
n_samples = batch['audio'].shape[0]
    

print(GREEN + "Build model..." + RESET)

# Neural networks
preprocessor = preprocessing.F0LoudnessPreprocessor(time_steps=TIME_STEPS) 

encoder = encoders.MfccTimeDistributedRnnEncoder(rnn_channels=RNN_CHANNELS,
                                                 rnn_type=RNN_TYPE,
                                                 z_dims=Z_DIMS,
                                                 z_time_steps=Z_TIME_STEPS)

decoder = decoders.RnnFcDecoder(rnn_channels = RNN_CHANNELS, rnn_type = RNN_TYPE,
                                ch = CH, layers_per_stack = LAYERS_PER_STACK,
                                input_keys = DECODER_INPUT_KEYS,
                                output_splits = (('amps', DECODER_AMPS_NUM),
                                                 ('harmonic_distribution', DECODER_HARMONICS_NUM),
                                                 ('noise_magnitudes', DECODER_NOISE_NUM)))
# Processors
harmonic = Harmonic(n_samples = n_samples, sample_rate = SAMPLE_RATE, name='harmonic')
noise = FilteredNoise(window_size=0, initial_bias=-10.0, name='noise')
add = processors.Add(name='add')
processor_group = processors.ProcessorGroup(dag=[(harmonic, ['amps', 'harmonic_distribution', 'f0_hz']),
                                                 (noise,    ['noise_magnitudes']),
                                                 (add,      ['noise/signal', 'harmonic/signal'])], 
                                            name='processor_group')

# Loss function
spectral_loss = SpectralLoss(loss_type=LOSS_TYPE, mag_weight=1.0, logmag_weight=1.0)

# Model
model = models.Autoencoder(preprocessor=preprocessor,
                           encoder=encoder if HAS_ENCODER else '',
                           decoder=decoder,
                           processor_group=processor_group,
                           losses=[spectral_loss])


# Strategy
device = "/gpu:0"
strategy = tf.distribute.OneDeviceStrategy(device)
trainer = trainers.Trainer(model, strategy, learning_rate=LEARNING_RATE)


# Train model
tb.notebook.start('--logdir "{}"'.format(TF_RECORD_DIR))
print(GREEN + "Start training..." + RESET)
train_util.train(
    data_provider,
    trainer,
    batch_size=TRAIN_BATCH_SIZE,
    num_steps=NUM_STEPS,
    steps_per_summary=STEPS_PER_SUMMARY,
    steps_per_save=STEPS_PER_SAVE,
    save_dir=MODEL_DIR,
    restore_dir=MODEL_DIR,
    early_stop_loss_value=EARLY_STOP_LOSS_VALUE,
    report_loss_to_hypertune=REPORT_LOSS_TO_HYPERTUNE
)

