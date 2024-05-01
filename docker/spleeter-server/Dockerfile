FROM deezer/spleeter-gpu:3.6-4stems

RUN pip install fastapi uvicorn[standard] aiofiles python-multipart pydub && pip list

COPY start_model_server.py /app/

WORKDIR /app

RUN mkdir -p /app/temp

EXPOSE 8000

ENTRYPOINT []

CMD ["uvicorn", "start_model_server:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "debug"]
