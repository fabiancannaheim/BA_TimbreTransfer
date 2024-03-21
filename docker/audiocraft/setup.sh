#!/bin/bash

set -e

cd /

python3 -m venv ac-env
source /ac-env/bin/activate

pip install --upgrade pip setuptools wheel jupyter
git clone https://github.com/facebookresearch/audiocraft.git
cd /audiocraft
git fetch origin pull/185/head:PR185
python -m pip install -r requirements.txt