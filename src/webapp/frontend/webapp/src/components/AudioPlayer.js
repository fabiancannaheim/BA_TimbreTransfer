import React, { useState, useRef, useEffect } from "react";
import { IconButton, Slider, Typography, Grid } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";

const AudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef(new Audio());

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
      cleanAudioData();
    };
  }, [volume]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  };

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
    <div id="audioPlayer" style={{ margin: "0 auto", maxWidth: "800px" }}>
      <IconButton onClick={handlePlayPause}>
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <IconButton onClick={handleStop}>
        <StopIcon />
      </IconButton>
      <Typography variant="caption" component="div" color="textSecondary">
        {new Date(currentTime * 1000).toISOString().substr(14, 5)}
      </Typography>
      <Slider
        min={0}
        max={duration}
        value={currentTime}
        onChange={handleSliderChange}
        aria-labelledby="continuous-slider"
      />
      <Grid
        container
        direction="column" // Change the direction to column
        justifyContent="center"
        alignItems="center" // Align items to center horizontally
        spacing={2}
        style={{ marginTop: 20 }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid
            item
            xs={12} // Set to full width
            key={index}
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center", // This will center the slider horizontally
              alignItems: "center",
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
              onChange={(e, val) => handleVolumeChange(index, val)} // You may need to adjust this to handle each slider's value separately
              aria-labelledby={`horizontal-slider-${index}`}
              sx={{ width: 200 }} // Set a fixed width for the slider
            />
            <IconButton aria-label="increase volume">
              <VolumeUpIcon />
            </IconButton>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default AudioPlayer;
