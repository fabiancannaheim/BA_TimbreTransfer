import tensorflow as tf
from google.protobuf import text_format
from tensorflow.python.platform import gfile

# Path to your 'graph.pbtxt' file
graph_pbtxt_path = './graph.pbtxt'
log_dir = './logs'

with tf.compat.v1.Session() as sess:
    # Load the graph definition from the .pbtxt file
    graph_def = tf.compat.v1.GraphDef()
    with gfile.GFile(graph_pbtxt_path, 'rb') as f:
        text_format.Merge(f.read().decode("utf-8"), graph_def)
    
    # Import the graph_def into the current default Graph
    tf.import_graph_def(graph_def, name='')

    # Use FileWriter to write the graph definition to log files
    writer = tf.compat.v1.summary.FileWriter(log_dir, sess.graph)
    writer.close()