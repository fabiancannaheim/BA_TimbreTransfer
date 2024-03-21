import tensorflow as tf
import numpy as np


# Load the TFLite model and allocate tensors.
interpreter = tf.lite.Interpreter(model_path="./model.tflite")

# To use TF Select ops, you need to use the TensorFlow Lite runtime that includes the necessary libraries.
# This typically means using a build of the TensorFlow Lite runtime that includes TF Select support.

# Set the TensorFlow Lite interpreter to use the Flex delegate.
interpreter.experimental_enable_resource_variables = True
interpreter.experimental_preserve_all_tensors = True

interpreter.allocate_tensors()

# Get input and output tensors.
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Test the model on some input data.
input_shape = input_details[0]['shape']
input_data = np.array(np.random.random_sample(input_shape), dtype=np.float32)
interpreter.set_tensor(input_details[0]['index'], input_data)

interpreter.invoke()

# The function `get_tensor()` returns a copy of the tensor data.
# Use `tensor()` in order to get a pointer to the tensor.
output_data = interpreter.get_tensor(output_details[0]['index'])
print(output_data)
