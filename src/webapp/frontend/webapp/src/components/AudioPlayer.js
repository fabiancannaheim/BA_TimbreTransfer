import React, { useState, useRef, useEffect } from "react";
import {
  IconButton,
  Slider,
  Typography,
  Grid,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import AudioUploader from "./AudioUploader";
import JSZip from "jszip";

const AudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopFlag, setLoopFlag] = useState(false);
  const [volumes, setVolumes] = useState([1, 1, 1, 1]); // Initialize volumes for 4 stems
  const numberOfStems = 4; // You can change this based on how many stems you have
  const gainNodes = useRef([]); // Ref to store gain nodes
  const sourceNodes = useRef([]); // Ref to store source nodes
  const [currentChunkIndex, setCurrentChunkIndex] = useState(1);
  const [chunks, setChunks] = useState([]);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const sourceNodeRef = useRef(null); // For keeping track of the current source node

  const audioCtxRef = useRef(null);

  if (!audioCtxRef.current) {
    audioCtxRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
  }

  //*******************************UPLOADING AND PROCESSING FILE*********************
  const handleFileUpload = async (file) => {
    // Send the file directly as it's already a WAV file
    const formData = new FormData();
    formData.append("audio", file); // 'audio' is the field name the server expects
    console.log(file);
    return false;

    try {
      const response = await fetch(
        "http://160.85.252.197/api/spleeter/2stems",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(response);

      // Assuming the response is a blob of a ZIP file
      const blob = await response.blob();
      const zip = new JSZip();
      const zipContents = await zip.loadAsync(blob);
      const files = Object.keys(zipContents.files).filter((fileName) =>
        fileName.endsWith(".mp3")
      );
      console.log(files);
      // Process each WAV file found in the zip
      for (const fileName of files) {
        const fileData = await zipContents.files[fileName].async("blob");
        processDownloadedBlob(fileData, fileName); // Process each file
      }
    } catch (error) {
      console.error("Error sending file:", error);
    }
  };

  // Function to process each downloaded blob
  const processDownloadedBlob = async (blob, fileName) => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
    const newChunks = splitBufferIntoChunks(audioBuffer, 2);
    setChunks(newChunks);
    console.log(
      `Processed chunks from ${fileName} stored in state.`,
      newChunks.length
    );
  };

  //*******************************SPLITTING INTO CHUNKS*********************
  function splitBufferIntoChunks(buffer, chunkDurationSec) {
    const sampleRate = buffer.sampleRate;
    const chunkLength = sampleRate * chunkDurationSec;
    const numberOfChunks = Math.ceil(buffer.duration / chunkDurationSec);
    const chunks = [];

    for (let i = 0; i < numberOfChunks; i++) {
      const startOffset = i * chunkLength;
      const endOffset = Math.min((i + 1) * chunkLength, buffer.length);

      // Create a new buffer for each chunk
      const chunkBuffer = audioCtxRef.current.createBuffer(
        buffer.numberOfChannels,
        endOffset - startOffset,
        sampleRate
      );

      // Copy the relevant data from the original buffer to the chunk buffer
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const originalData = buffer.getChannelData(channel);
        const chunkData = chunkBuffer.getChannelData(channel);
        // Copy segment of data from original buffer to the new chunk buffer
        chunkData.set(originalData.subarray(startOffset, endOffset));
      }
      chunks.push(chunkBuffer);
    }
    console.log("Array of Chunks: ", chunks);
    return chunks;
  }

  //*******************************PLAY/PAUSE*********************
  const handlePlayPause = () => {
    console.log("handeplay isplaying:", isPlaying);
    if (!isPlaying && currentChunkIndex > 0) {
      setCurrentChunkIndex(currentChunkIndex - 1);
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    console.log(
      "Entered useEffect for isPlaying",
      isPlaying,
      currentChunkIndex
    );
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
    if (index < chunks.length && isPlaying) {
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
      if (index + 1 < chunks.length) {
        processChunk(chunks[index + 1], index + 1).then((processedChunk) => {
          // Update the chunks array with the processed chunk
          const newChunks = [...chunks];
          newChunks[index + 1] = processedChunk;
          setChunks(newChunks);
        });
      } */

      // Assuming each chunk contains separate channel data for each stem,
      // and each stem is a separate channel in the buffer
      for (let stemIndex = 0; stemIndex < numberOfStems; stemIndex++) {
        const buffer = chunks[index];
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = buffer;

        // Connect each source to its corresponding gain node
        source.connect(gainNodes.current[stemIndex]);
        gainNodes.current[stemIndex].connect(audioCtxRef.current.destination);

        source.start();

        // Keep track of all sources
        sourceNodes.current.push(source);
      }

      // Set up the end event listener only on the last stem's source to manage playback
      const vocalSource = sourceNodes.current[0];
      vocalSource.onended = () => {
        if (index + 1 < chunks.length) {
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
    handleStop(); // This stops the current playback and resets if necessary
    setCurrentChunkIndex(newValue); // Updates the chunk index without starting playback
  };

  const handleSliderCommit = (event, newValue) => {
    console.log("Commit Slider");
    setIsPlaying(true);
    playChunkAtIndex(currentChunkIndex); // Resume playback from the new chunk if it was playing before
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
    <div id="audioPlayer">
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
          <IconButton onClick={handlePlayPause}>
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton onClick={handleStop}>
            <StopIcon />
          </IconButton>
        </div>
        <Slider
          min={0}
          max={chunks.length - 1}
          value={currentChunkIndex - 1}
          onChange={handleSliderChange}
          onChangeCommitted={handleSliderCommit}
          aria-labelledby="chunk-slider"
          sx={{ width: "100%", maxWidth: "800px" }}
        />
        <Typography variant="caption" component="div" color="textSecondary">
          {`Chunk ${currentChunkIndex} of ${chunks.length}`}
        </Typography>
      </div>
      <Grid
        container
        direction="column"
        justifyContent="center"
        alignItems="center"
        spacing={2}
        style={{ marginTop: 20 }}
      >
        {Array.from({ length: numberOfStems }).map((_, index) => (
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
            <Typography variant="subtitle1">Stem {index + 1}</Typography>
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
                sx={{ flexGrow: 1 }}
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
