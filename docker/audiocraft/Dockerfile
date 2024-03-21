FROM nvidia/cuda:11.2.2-cudnn8-devel-ubuntu20.04

COPY setup.sh /usr/local/bin/setup.sh
COPY start.sh /usr/local/bin/start.sh

RUN chmod +x /usr/local/bin/setup.sh /usr/local/bin/start.sh

RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y git python3-dev python3-pip python3-venv ffmpeg

RUN bash /usr/local/bin/setup.sh

EXPOSE 7860 7861 8888 8889

WORKDIR /

ENTRYPOINT ["/usr/local/bin/start.sh"]