import os
import tensorflow as tf

trained_checkpoint_prefix = '../../../models/spleeter/pretrained_models/2stems/model'
export_dir = os.path.join('export_dir', '0')

graph = tf.Graph()
with tf.compat.v1.Session(graph=graph) as sess:
    # Restore from checkpoint
    loader = tf.compat.v1.train.import_meta_graph(trained_checkpoint_prefix + '.meta')
    loader.restore(sess, trained_checkpoint_prefix)

    waveform_tensor = tf.compat.v1.get_default_graph().get_tensor_by_name("waveform:0")
    waveform_tensor_info = tf.compat.v1.saved_model.utils.build_tensor_info(waveform_tensor)

    other_tensor = tf.compat.v1.get_default_graph().get_tensor_by_name("strided_slice_23:0")
    other_tensor_info = tf.compat.v1.saved_model.utils.build_tensor_info(other_tensor)

    vocals_tensor = tf.compat.v1.get_default_graph().get_tensor_by_name("strided_slice_13:0")
    vocals_tensor_info = tf.compat.v1.saved_model.utils.build_tensor_info(vocals_tensor)

    current_graph = tf.compat.v1.get_default_graph()

    separate_signature = (
        tf.compat.v1.saved_model.signature_def_utils.build_signature_def(
            inputs={ 'waveform': waveform_tensor_info },
            outputs={ 'vocals': vocals_tensor_info,
                      'accompaniment': other_tensor_info},
            method_name=tf.compat.v1.saved_model.signature_constants
          .PREDICT_METHOD_NAME))

    # Export checkpoint to SavedModel
    builder = tf.compat.v1.saved_model.builder.SavedModelBuilder(export_dir)
    builder.add_meta_graph_and_variables(sess, [tf.compat.v1.saved_model.tag_constants.SERVING],
                                        signature_def_map={
                                            tf.compat.v1.saved_model.signature_constants.DEFAULT_SERVING_SIGNATURE_DEF_KEY:
                                                separate_signature,
                                            },
                                         strip_default_attrs=True)
    builder.save()