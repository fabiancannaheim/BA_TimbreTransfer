import logging
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from spleeter.separator import Separator
from pydub import AudioSegment
import tempfile
import zipfile
import soundfile as sf
import io


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

# Load the model
separator = Separator('spleeter:4stems', MWF=False)

@app.post("/process/")
async def process_audio(file: UploadFile = File(...)):
    print("start processing audio...")
    try:
        print("read file...")
        # Read the uploaded file into memory
        file_content = await file.read()

        print("create audio segment")
        # Convert the audio content to AudioSegment
        audio_segment = AudioSegment.from_file(io.BytesIO(file_content), format=file.filename.split('.')[-1])


        print("export to WAV")
        # Export to WAV format
        with tempfile.TemporaryFile(suffix=".wav") as wav_file:
            audio_segment.export(wav_file, format="wav")
            wav_file.seek(0)

            # Read WAV audio data
            audio_data, sample_rate = sf.read(wav_file)

            # Process the audio data
            prediction = separator.separate(audio_data)

        print("Write to temp file")
        # Write to a temporary zip file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as temp_zip:
            with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
                for stem, data in prediction.items():
                    with tempfile.TemporaryFile() as stem_file:
                        sf.write(stem_file, data, sample_rate, format='wav')
                        stem_file.seek(0)
                        zf.writestr(f"{stem}.wav", stem_file.read())

            # Get the path to return in response
            temp_zip_path = temp_zip.name

        # Return the zip file as a file response
        return FileResponse(path=temp_zip_path, filename="stems.zip", media_type='application/zip')

    except Exception as e:
        logger.exception("Failed to process audio")
        raise HTTPException(status_code=500, detail=str(e))

