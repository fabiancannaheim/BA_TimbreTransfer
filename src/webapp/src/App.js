import React, { useState } from "react";
import AudioPlayer from "./components/AudioPlayer";
import SingerSelector from "./components/SingerSelector";
import { orange } from "@mui/material/colors";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import "./App.css";

// Create a theme instance with orange as the primary color
const theme = createTheme({
  palette: {
    primary: {
      main: orange[500], // You can choose different shades of orange
    },
    // You can also change secondary or any other color
  },
  // If you want to override specific component styles globally, you can do so here
});

function App() {
  const [isSongUploaded, setIsSongUploaded] = useState(false);
  const [selectedSinger, setSelectedSinger] = useState("");

  const handleSongUploaded = (uploaded) => {
    setIsSongUploaded(uploaded);
  };

  const handleSingerChange = (singer) => {
    setSelectedSinger(singer);
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="title-banner">
        <h1>Voice Swapper!</h1>
        <div className="singer-selector">
          <SingerSelector
            onSingerChange={handleSingerChange}
            isSongUploaded={isSongUploaded}
          />
        </div>
      </div>
      <div className="audio-player-wrapper">
        <AudioPlayer
          onSongUploaded={handleSongUploaded}
          selectedSinger={selectedSinger}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
