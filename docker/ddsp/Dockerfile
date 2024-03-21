FROM nvidia/cuda:11.2.2-cudnn8-devel-ubuntu20.04

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive \
    apt-get install -y git git-lfs \
    python3-dev python3-pip python3-venv \
    ffmpeg sudo wget openssh-server vim

RUN git lfs install

RUN mkdir /var/run/sshd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
COPY authorized_keys /root/.ssh/authorized_keys
RUN chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN pip install --upgrade pip setuptools wheel ddsp jupyter
RUN pip install "packaging~=20.9"
RUN pip install -U ddsp[data_preparation]

EXPOSE 22
EXPOSE 8888

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/sbin/sshd", "-D"]
