import React, { useState, useRef, useEffect } from "react";
import { IconButton, Slider, Typography, Grid } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import AudioUploader from "./AudioUploader";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";
import JSZip from "jszip";
import * as tf from "@tensorflow/tfjs";

// Adjusting some more specific flags to see if it helps resolve the shader issues
tf.env().set("WEBGL_PACK", true); // You may try toggling this again
tf.env().set("WEBGL_PACK_DEPTHWISECONV", true);
tf.env().set("WEBGL_CONV_IM2COL", true);
tf.env().set("WEBGL_MAX_TEXTURE_SIZE", 16384); // Depending on GPU capacity
tf.env().set("WEBGL_LAZILY_UNPACK", true);
tf.env().set("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION", 2); // If supported by your browser

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
  const [origChunks, setOrigChunks] = useState([]);
  const [stems, setStems] = useState([]); // State to hold the audio buffers for each stem
  const [isLoading, setIsLoading] = useState(false);
  const stemNames = ["Vocals", "Drums", "Bass", "Accompaniment"];
  const getSliderColor = (index) => {
    const colors = ["#ff9800", "#ff9800", "#ff9800", "#ff9800"]; // Example colors: Red, Blue, Purple, Green
    return colors[index % colors.length]; // Repeat colors if there are more sliders than colors
  };

  const audioCtxRef = useRef(null);

  if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
    audioCtxRef.current = new AudioContext({ sampleRate: 48000 });
  }
  //*******************************UPLOADING AND PROCESSING FILE*********************
  const handleFileUpload = async (file) => {
    console.log("Entered Function");
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

  //*******************************SPLITTING INTO CHUNKS*********************
  useEffect(() => {
    if (stems.length > 0) {
      // Temporary array to hold chunks for each stem
      const allChunks = stems.map((stem) => splitBufferIntoChunks(stem, 1));
      setChunks(allChunks);
      setOrigChunks(allChunks);
      setIsLoading(false); // Stop loading
    }
  }, [stems]); // Dependency on stems ensures this runs only when stems are updated

  useEffect(() => {
    if (selectedSinger == "Original") {
      console.log("Restored Original Chunks");
      setChunks(origChunks);
    }
  }, [selectedSinger]); // Dependency on stems ensures this runs only when stems are updated

  useEffect(() => {
    console.log("Current Selected Singer UseEffect:", selectedSinger); // Add this in both the parent and child components
  }, [selectedSinger]);

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

      if (
        index + 1 < chunks[0].length &&
        selectedSinger &&
        selectedSinger !== "Original"
      ) {
        processChunk(chunks[0][index + 1])
          .then((processedChunk) => {
            // Make sure processedChunk is valid before updating the state
            if (processedChunk) {
              setChunks((prevChunks) => {
                const newChunks = [...prevChunks];
                // Create a deep copy of the chunk array that needs updating
                newChunks[0] = [...newChunks[0]];
                // Update the specific chunk
                newChunks[0][index + 1] = processedChunk;
                // Return the newly updated state
                return newChunks;
              });
            }
          })
          .catch((error) => {
            console.error("Error processing chunk:", error);
          });
      }

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
          setLoopFlag(!loopFlag);
        } else {
          setIsPlaying(false); // Stop playback if no more chunks are left
        }
      };
    }
  };

  useEffect(() => {
    console.log("Updated chunks state:", chunks);
  }, [chunks]);

  async function processChunk(buffer) {
    try {
      // Average channels to create mono
      const processedAudioBuffer = await convertToMono(buffer);
      const monoSamples = processedAudioBuffer.getChannelData(0);
      console.log("Selected Singer:", selectedSinger);

      // Send data to the server
      const response = await fetch("http://160.85.43.209:8000/process/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: Array.from(monoSamples),
          model_name: selectedSinger,
        }),
      });

      if (response.ok) {
        console.log("Response: ", response);
        const responseData = await response.json();
        const outputArray = responseData.output_data[0];

        // Create an AudioBuffer directly with the response data
        const audioCtx = new (window.AudioContext ||
          window.webkitAudioContext)();
        const newBuffer = audioCtx.createBuffer(
          1,
          outputArray.length,
          audioCtx.sampleRate
        );
        newBuffer.copyToChannel(Float32Array.from(outputArray), 0);

        return newBuffer;
      } else {
        console.error("Error response from server:", response.statusText);
        return null;
      }
    } catch (error) {
      console.error("Error during chunk processing:", error);
      return null;
    }
  }

  // ConvertToMono function which creates an AudioBuffer that is mono
  async function convertToMono(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    let monoBuffer = new Float32Array(length);

    for (let channel = 0; channel < numberOfChannels; channel++) {
      let channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        monoBuffer[i] += channelData[i] / numberOfChannels;
      }
    }

    const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
    const newBuffer = offlineCtx.createBuffer(1, length, sampleRate);
    newBuffer.copyToChannel(monoBuffer, 0);
    return newBuffer; // No need to startRendering since no up/downsampling is required
  }

  // Remember to update your initialization of sourceNodes and gainNodes if not already defined:
  useEffect(() => {
    sourceNodes.current = [];
    gainNodes.current = Array.from({ length: numberOfStems }, () =>
      audioCtxRef.current.createGain()
    );
  }, []);

  //*******************************PROCESSING CALLING DDSP*********************

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
            backgroundColor: "black", // Dark red background with 0.5 opacity

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
            <Typography variant="h6" style={{ marginTop: 20, color: "white" }}>
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
            style={{ color: "#080808", opacity: stems.length > 0 ? 1 : 0.5 }}
            disabled={stems.length === 0 || isLoading}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton
            onClick={handleStop}
            style={{ color: "#080808", opacity: stems.length > 0 ? 1 : 0.5 }}
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
              color: "#0f0f0f",
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
              color: "#0f0f0f",
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
                color: "#080808",
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
