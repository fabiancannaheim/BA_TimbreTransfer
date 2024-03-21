import tensorflow as tf

# Path to the directory that contains the checkpoint files
checkpoint_dir = './2stems/'  # Replace this with the actual path to your '2stems' directory

# Disable eager execution to work with the graph
tf.compat.v1.disable_eager_execution()

# Create a new graph for the model
graph = tf.Graph()

with graph.as_default():
    # Restore the graph from the .meta file
    saver = tf.compat.v1.train.import_meta_graph(checkpoint_dir + 'model.meta')
    
    with tf.compat.v1.Session(graph=graph) as sess:
        # Restore the weights from the checkpoint
        saver.restore(sess, tf.train.latest_checkpoint(checkpoint_dir))

        # Specify the input and output tensors
        input_tensor = graph.get_tensor_by_name('waveform:0')  # Replace with actual input tensor name
        vocals_output_tensor = graph.get_tensor_by_name('vocals_spectrogram/mul:0')  # Replace with actual output tensor name
        accompaniment_output_tensor = graph.get_tensor_by_name('accompaniment_spectrogram/mul:0')  # Replace with actual output tensor name

        # Convert the TensorFlow session to a TFLite model
        converter = tf.compat.v1.lite.TFLiteConverter.from_session(sess, [input_tensor], [vocals_output_tensor, accompaniment_output_tensor])
        
        # Enable TensorFlow operations in TFLite by using TF Select
        converter.target_spec.supported_ops = [
            tf.lite.OpsSet.TFLITE_BUILTINS,  # Enable built-in ops
            tf.lite.OpsSet.SELECT_TF_OPS  # Enable TensorFlow ops
        ]
        
        # Convert the model
        tflite_model = converter.convert()

        # Save the TFLite model to a file
        with open('model.tflite', 'wb') as f:
            f.write(tflite_model)

        # Write the graph's definition to a text file
        tf.io.write_graph(graph_or_graph_def=sess.graph_def,
                          logdir='.',  # Specify the directory to save the file
                          name='graph.pbtxt',  # Name of the output file
                          as_text=True)  # Save as human-readable text
