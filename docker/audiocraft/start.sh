#!/bin/bash

source /ac-env/bin/activate
cd /audiocraft

if [ "$START_MODE" == "musicgen" ]; then
    exec python -m demos.musicgen_app --share
elif [ "$START_MODE" == "audiogen" ]; then
    exec python -m demos.audiogen_app --share
elif [ "$START_MODE" == "jupyter" ]; then
    exec jupyter notebook --ip=0.0.0.0 --port=8888 --no-browser --allow-root
elseclear
    echo "No START_MODE specified or mode not recognized. Please set START_MODE to 'musicgen', 'audiogen' or 'jupyter'."
    tail -f /dev/null
fi