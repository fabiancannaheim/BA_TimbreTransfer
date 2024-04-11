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

const AudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [chunks, setChunks] = useState([]);
  const audioRef = useRef(new Audio());
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  let audioProcessingQueue = [];
  let currentlyProcessing = false;

  // New state to store processed audio buffers
  const [processedBuffers, setProcessedBuffers] = useState([]);
  const [playbackTime, setPlaybackTime] = useState(0); // For tracking resume position
  const sourceNodeRef = useRef(null); // For keeping track of the current source node

  const audioCtxRef = useRef(null);

  if (!audioCtxRef.current) {
    audioCtxRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
  }

  useEffect(() => {
    const audio = audioRef.current;

    // Set the initial audio volume
    audio.volume = volume;

    // Function to update the current time
    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    // Function to clean up the audio element when the component unmounts
    const cleanAudioData = () => {
      audio.pause();
      audio.removeEventListener("loadeddata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioData);
    };

    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("timeupdate", setAudioData);

    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
      cleanAudioData();
    };
  }, [volume]);

  //*******************************UPLOADING FILE*********************
  const handleFileUpload = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileResult = e.target.result;
      const buffer = await audioCtxRef.current.decodeAudioData(fileResult);
      const newChunks = splitBufferIntoChunks(buffer, 2);
      setChunks(newChunks);
      console.log("Chunks processed and stored in state.", newChunks.length);
    };
    reader.readAsArrayBuffer(file);
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
    setIsPlaying(!isPlaying); // Simply toggle the state
  };

  // Add useEffect to react to changes in isPlaying
  useEffect(() => {
    if (isPlaying) {
      console.log(`Resuming playback at chunk index: ${currentChunkIndex}`);
      playChunkAtIndex(currentChunkIndex);
    } else {
      console.log(`Playback paused.`);
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
    }
  }, [isPlaying]); // Dependency array includes isPlaying to act only when it changes

  //*******************************STOP*********************
  const handleStop = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    setCurrentChunkIndex(0);
    currentlyProcessing = false;
    console.log("Stopped Audio!");
  };

  //*******************************PLAY AT INDEX*********************
  const playChunkAtIndex = (index) => {
    if (index < chunks.length) {
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().then(() => {
          console.log(
            `Audio context resumed, now playing chunk at index: ${index}`
          );
          playBufferAtIndex(index);
        });
      } else {
        playBufferAtIndex(index);
      }
    } else {
      console.log("No more chunks to play.");
      setIsPlaying(false);
    }
  };

  const playBufferAtIndex = (index) => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }

    const buffer = chunks[index];
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtxRef.current.destination);
    source.start();

    console.log(`Playing chunk at index: ${index}`);
    setCurrentChunkIndex(index);

    source.onended = () => {
      console.log(`Chunk ${index} playback finished.`);
      if (index + 1 < chunks.length && isPlaying) {
        playChunkAtIndex(index + 1); // Play next chunk
      } else {
        setIsPlaying(false);
        currentlyProcessing = false;
        console.log("Playback finished or stopped.");
      }
    };

    sourceNodeRef.current = source; // Store the current source node
  };

  async function processChunk(buffer) {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Return the processed buffer or a new buffer
    return buffer;
  }

  const handleSliderChange = (event, newValue) => {
    const audio = audioRef.current;
    audio.currentTime = newValue;
    setCurrentTime(newValue);
  };

  const handleVolumeChange = (event, newValue) => {
    const audio = audioRef.current;
    audio.volume = newValue;
    setVolume(newValue);
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
          max={duration}
          value={currentTime}
          onChange={handleSliderChange}
          aria-labelledby="continuous-slider"
          sx={{ width: "100%", maxWidth: "800px" }}
        />
        <Typography variant="caption" component="div" color="textSecondary">
          {new Date(currentTime * 1000).toISOString().substr(14, 5)}
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
        {Array.from({ length: 4 }).map((_, index) => (
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
                width: isXs ? "90%" : "100%",
                maxWidth: "800px",
              }}
            >
              <IconButton aria-label="decrease volume">
                <VolumeDownIcon />
              </IconButton>
              <Slider
                orientation="horizontal"
                value={volume}
                min={0}
                max={1}
                step={0.01}
                onChange={(e, val) => handleVolumeChange(index, val)}
                aria-labelledby={`horizontal-slider-${index}`}
                sx={{ flexGrow: 1 }}
              />
              <IconButton aria-label="increase volume">
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
