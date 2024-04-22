import React, { useState, useRef, useEffect } from "react";
import { IconButton, Slider, Typography, Grid } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import AudioUploader from "./AudioUploader";
import CircularProgress from "@mui/material/CircularProgress";
import * as tf from "@tensorflow/tfjs";
import axios from "axios";
import JSZip from "jszip";

const AudioPlayer = ({ onSongUploaded, selectedSinger }) => {
  const [baseFileName, setBaseFileName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopFlag, setLoopFlag] = useState(false);
  const [volumes, setVolumes] = useState([1, 1, 1, 1]); // Initialize volumes for 4 stems
  const numberOfStems = 4; // You can change this based on how many stems you have
  const gainNodes = useRef([]); // Ref to store gain nodes
  const sourceNodes = useRef([]); // Ref to store source nodes
  const [currentChunkIndex, setCurrentChunkIndex] = useState(1);
  const [chunks, setChunks] = useState([]);
  const [stems, setStems] = useState([]); // State to hold the audio buffers for each stem
  const [isLoading, setIsLoading] = useState(false);
  const stemNames = ["Vocals", "Drums", "Bass", "Accompaniment"];
  const getSliderColor = (index) => {
    const colors = ["#ff9800", "#cc1b1b", "#ffc000", "#9a4f00"]; // Example colors: Red, Blue, Purple, Green
    return colors[index % colors.length]; // Repeat colors if there are more sliders than colors
  };

  const audioCtxRef = useRef(null);

  if (!audioCtxRef.current) {
    audioCtxRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
  }

  //*******************************UPLOADING AND PROCESSING FILE*********************
  const handleFileUpload = async (file) => {
    const newName = file.name.replace(/\.(wav|mp3)$/, "");
    setBaseFileName(newName);

    console.log(newName);

    setIsLoading(true); // Start loading
    const formData = new FormData();
    formData.append("audio", file);

    try {
      const response = await axios.post(
        "http://160.85.252.197/api/spleeter/4stems",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          responseType: "arraybuffer", // Ensure you receive a blob response
        }
      );

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Assuming the response is a blob of a ZIP file
      const blob = new Blob([response.data], { type: "application/zip" });
      const zip = new JSZip();
      const zipContents = await zip.loadAsync(blob);
      const files = Object.keys(zipContents.files).filter(
        (fileName) => fileName.endsWith(".wav") // Assuming you want .wav files, adjust if necessary
      );

      // Prepare to load and decode each stem
      const stems = [];
      for (const fileName of files) {
        const fileData = await zipContents.files[fileName].async("blob");
        const arrayBuffer = await fileData.arrayBuffer();
        const audioBuffer = await audioCtxRef.current.decodeAudioData(
          arrayBuffer
        );
        stems.push(audioBuffer);
      }

      setStems(stems); // Assuming you have a setStems function to update your state
      setIsLoading(false); // Stop loading
      onSongUploaded(true); // Notify App that a song has been uploaded
    } catch (error) {
      console.error("Error sending file:", error);
      setIsLoading(false); // Ensure loading is stopped on error
      onSongUploaded(false); // Notify App that upload failed
    }
  };

  //*******************************SINGER SELECT DDSP CALL*********************

  useEffect(() => {
    if (!chunks || !chunks[0] || !chunks[0][0]) {
      setIsLoading(false);
      return;
    }

    const loadModelAndProcessAudio = async () => {
      setIsLoading(true); // Start loading

      try {
        // Assuming chunks[0][0] is the first chunk and is an AudioBuffer
        const audioBuffer = chunks[0][0];

        // For mono, we can just use one channel of audio data
        // This uses the first channel. If you need to average channels, you'll need to add that logic.
        const monoSamples = audioBuffer.getChannelData(0);

        // Create a tensor from the mono audio data
        // The shape will be [1, audioBuffer.length] because we are processing one channel (mono)
        const inputTensor = tf.tensor([monoSamples], [1, monoSamples.length]);
        console.log("Tensor created:", inputTensor);

        const model = await tf.loadGraphModel(
          "/models/js_sax_album_end2end_48khz/model.json"
        );

        // Use executeAsync for models with dynamic ops
        const outputTensor = await model.executeAsync(inputTensor);
        console.log("Prediction completed:", outputTensor);

        // Convert the tensor to an ArrayBuffer if necessary
        const buffer = await outputTensor.arrayBuffer();
        console.log("ArrayBuffer received, decoding...", buffer.byteLength);

        // Decode the audio data to an AudioBuffer
        const decodedAudioBuffer = await audioCtxRef.current.decodeAudioData(
          buffer
        );
        console.log("AudioBuffer decoded, processing chunks...");
        console.log(decodedAudioBuffer);

        // Update only the first chunk of the first stem
        setChunks((prevChunks) => {
          const updatedChunks = [...prevChunks];
          if (updatedChunks[0]) {
            updatedChunks[0][0] = decodedAudioBuffer; // Replace the processed chunk
          }
          console.log("First chunk updated:", updatedChunks[0][0]);
          return updatedChunks;
        });
      } catch (error) {
        console.error("Error during model loading or audio processing:", error);
      }

      setIsLoading(false);
    };

    loadModelAndProcessAudio();
  }, [selectedSinger]); // Make sure the effect is triggered by changes to either 'chunks' or 'selectedSinger'

  //*******************************SPLITTING INTO CHUNKS*********************
  useEffect(() => {
    if (stems.length > 0) {
      // Temporary array to hold chunks for each stem
      const allChunks = stems.map((stem) => splitBufferIntoChunks(stem, 2));
      setChunks(allChunks);
      setIsLoading(false); // Stop loading
    }
  }, [stems]); // Dependency on stems ensures this runs only when stems are updated

  const splitBufferIntoChunks = (buffer, chunkDurationSec) => {
    const sampleRate = buffer.sampleRate;
    const chunkLength = sampleRate * chunkDurationSec;
    const numberOfChunks = Math.ceil(buffer.duration / chunkDurationSec);
    const chunks = [];

    for (let i = 0; i < numberOfChunks; i++) {
      const startOffset = i * chunkLength;
      const endOffset = Math.min((i + 1) * chunkLength, buffer.length);

      const chunkBuffer = audioCtxRef.current.createBuffer(
        buffer.numberOfChannels,
        endOffset - startOffset,
        sampleRate
      );

      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const originalData = buffer.getChannelData(channel);
        const chunkData = chunkBuffer.getChannelData(channel);
        chunkData.set(originalData.subarray(startOffset, endOffset));
      }
      chunks.push(chunkBuffer);
    }
    return chunks;
  };

  //*******************************PLAY/PAUSE*********************
  const handlePlayPause = () => {
    console.log(chunks);
    if (!isPlaying && currentChunkIndex > 0) {
      setCurrentChunkIndex(currentChunkIndex - 1);
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying) {
      playChunkAtIndex(currentChunkIndex);
      setCurrentChunkIndex(currentChunkIndex + 1); // Advance the index for the next play call
    } else {
      // Not playing, so disconnect and stop all sources
      sourceNodes.current.forEach((source, index) => {
        if (source) {
          source.disconnect();
          source.stop(); // Stop each source
          sourceNodes.current[index] = null; // Clear the source reference
        }
      });
      sourceNodes.current = []; // Optionally clear the entire array after looping
    }
  }, [isPlaying, loopFlag]); // Reacts to changes in isPlaying and loopFlag

  //*******************************STOP*********************
  const handleStop = () => {
    // Stop and disconnect all sources
    sourceNodes.current.forEach((source, index) => {
      if (source) {
        source.stop(); // Stop the source
        source.disconnect(); // Disconnect it from the audio context
        sourceNodes.current[index] = null; // Clear the source from the array
      }
    });
    sourceNodes.current = []; // Clear the entire array to reset

    setCurrentChunkIndex(0); // Reset the chunk index to the start
    setIsPlaying(false); // Update the playing state to false
    console.log("Stopped Audio!");
  };

  //*******************************PLAY AT INDEX*********************
  const playChunkAtIndex = (index) => {
    console.log("entered index", isPlaying);
    if (index < chunks[0].length && isPlaying) {
      // Disconnect and stop any previously playing sources
      if (sourceNodes.current.length) {
        sourceNodes.current.forEach((source) => {
          if (source) {
            source.disconnect();
            source.stop();
          }
        });
      }

      // Clear previous sources
      sourceNodes.current = [];

      /*
      if (index + 1 < chunks[0].length) {
        processChunk(chunks[index + 1], index + 1).then((processedChunk) => {
          // Update the chunks array with the processed chunk
          const newChunks = [...chunks];
          newChunks[index + 1] = processedChunk;
          setChunks(newChunks);
        });
      } */

      // Assuming each chunk contains separate channel data for each stem,
      // and each stem is a separate channel in the buffer
      // Iterate over each stem to play its corresponding chunk at the given index
      for (let stemIndex = 0; stemIndex < numberOfStems; stemIndex++) {
        // Access the specific chunk for this stem at the current index
        const buffer = chunks[stemIndex][index];
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = buffer;

        // Connect each source to its corresponding gain node
        source.connect(gainNodes.current[stemIndex]);
        gainNodes.current[stemIndex].connect(audioCtxRef.current.destination);

        source.start();

        // Store the source in sourceNodes for later control
        sourceNodes.current.push(source);
      }

      // Set up the end event listener only on the last stem's source to manage playback
      const vocalSource = sourceNodes.current[0];
      vocalSource.onended = () => {
        if (index + 1 < chunks[0].length) {
          console.log("Entered callback", isPlaying, currentChunkIndex);
          setLoopFlag(!loopFlag);
        } else {
          setIsPlaying(false); // Stop playback if no more chunks are left
        }
      };
    }
  };

  // Remember to update your initialization of sourceNodes and gainNodes if not already defined:
  useEffect(() => {
    sourceNodes.current = [];
    gainNodes.current = Array.from({ length: numberOfStems }, () =>
      audioCtxRef.current.createGain()
    );
  }, []);

  //*******************************PROCESSING*********************
  async function processChunk(buffer) {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Chunk processed");
    // Return the processed buffer or a new buffer
    return buffer;
  }

  //*******************************SLIDER*********************
  const handleSliderChange = (event, newValue) => {
    if (stems.length > 0 && !isLoading) {
      handleStop(); // This stops the current playback and resets if necessary
      setCurrentChunkIndex(newValue); // Updates the chunk index without starting playback
    }
  };

  const handleSliderCommit = (event, newValue) => {
    if (stems.length > 0 && !isLoading) {
      console.log("Commit Slider");
      setIsPlaying(true);
      playChunkAtIndex(currentChunkIndex); // Resume playback from the new chunk if it was playing before
    }
  };

  //*******************************VOLUMES*********************
  useEffect(() => {
    // Initialize gain nodes once for each stem
    gainNodes.current = Array.from({ length: numberOfStems }, () =>
      audioCtxRef.current.createGain()
    );
  }, []);

  const handleVolumeChange = (index, newValue) => {
    const newVolumes = [...volumes];
    newVolumes[index] = newValue;
    setVolumes(newVolumes);
    gainNodes.current[index].gain.value = newValue; // Update the gain node value
  };

  return (
    <div
      id="audioPlayer"
      style={{
        padding: "10px 7px",
        paddingBottom: "30px",
        border: "3px solid rgba(0, 0, 0, 0.5)", // Semi-transparent black border
        borderRadius: "15px", // Rounded corners
        maxWidth: "800px",
        margin: "0 auto",
        boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.1)", // Soft shadow for depth
      }}
    >
      {isLoading && (
        <div
          style={{
            position: "fixed", // Overlay and fixed to the viewport
            top: "50%", // Position to 50% of the viewport height
            left: "50%", // Position to 50% of the viewport width
            transform: "translate(-50%, -50%)", // Offset the element to the center of the viewport
            width: "220px", // Specific width for the element
            height: "150px", // Specific height for the element
            backgroundColor: "rgba(121, 22, 22, 1)", // Dark red background with 0.5 opacity
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "10px", // Rounded borders
            zIndex: 9999,
            fontSize: "15px",
            fontWeight: "550",
            textTransform: "none",
            fontFamily: "Roboto, Helvetica, Arial, sans-serif",
          }}
        >
          <div style={{ textAlign: "center" }}>
            {" "}
            {/* Center the text and spinner vertically and horizontally */}
            <CircularProgress />
            <Typography variant="h6" style={{ marginTop: 20, color: "black" }}>
              Loading your stems...
            </Typography>
          </div>
        </div>
      )}
      <AudioUploader
        onFileUpload={handleFileUpload}
        style={{ margin: "0 auto", maxWidth: "100%", padding: "0 16px" }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            marginBottom: 16,
          }}
        >
          <IconButton
            onClick={handlePlayPause}
            style={{ opacity: stems.length > 0 ? 1 : 0.5 }}
            disabled={stems.length === 0 || isLoading}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton
            onClick={handleStop}
            style={{ opacity: stems.length > 0 ? 1 : 0.5 }}
            disabled={stems.length === 0 || isLoading}
          >
            <StopIcon />
          </IconButton>
        </div>

        <Slider
          min={0}
          max={chunks.length > 0 && chunks[0] ? chunks[0].length - 1 : 0}
          value={currentChunkIndex - 1}
          onChange={handleSliderChange}
          onChangeCommitted={handleSliderCommit}
          aria-labelledby="chunk-slider"
          sx={{ width: "90%", maxWidth: "800px" }}
          color="antrazit"
          disabled={stems.length === 0 || isLoading} // Disable the slider when stems are not loaded or still loading
        />

        {stems.length > 0 && (
          <Typography
            variant="caption"
            component="div"
            color="textSecondary"
            style={{
              fontSize: "15px",
              fontWeight: "550",
              borderRadius: "10px",
              textTransform: "none",
              fontFamily: "Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            {`Chunk ${currentChunkIndex} of ${
              chunks.length > 0 && chunks[0] ? chunks[0].length - 1 : 0
            }`}
          </Typography>
        )}
      </div>
      <Grid
        container
        direction="column"
        justifyContent="center"
        alignItems="center"
        spacing={2}
        style={{ marginTop: 20 }}
      >
        {stemNames.map((name, index) => (
          <Grid
            item
            xs={12}
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Typography
              variant="subtitle1"
              color="textSecondary"
              style={{
                fontSize: "15px",
                fontWeight: "550",
                borderRadius: "10px",
                textTransform: "none",
                fontFamily: "Roboto, Helvetica, Arial, sans-serif",
              }}
            >
              {name}
            </Typography>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                width: "90%",
                maxWidth: "800px",
              }}
            >
              <IconButton
                onClick={() =>
                  handleVolumeChange(index, Math.max(0, volumes[index] - 0.1))
                }
              >
                <VolumeDownIcon />
              </IconButton>
              <Slider
                orientation="horizontal"
                value={volumes[index]}
                min={0}
                max={1}
                step={0.01}
                onChange={(e, val) => handleVolumeChange(index, val)}
                aria-labelledby={`horizontal-slider-${index}`}
                sx={{ flexGrow: 1, color: getSliderColor(index) }} // Set the color dynamically
              />
              <IconButton
                onClick={() =>
                  handleVolumeChange(index, Math.min(1, volumes[index] + 0.1))
                }
              >
                <VolumeUpIcon />
              </IconButton>
            </div>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default AudioPlayer;
