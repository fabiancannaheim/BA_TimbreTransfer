import React from "react";
import AudioUploader from "./components/AudioUploader";
import AudioPlayer from "./components/AudioPlayer";
import SingerSelector from "./components/SingerSelector";
import StemSeparator from "./components/StemSeparator";
import TimbreTransfer from "./components/TimbreTransfer";
import Controls from "./components/Controls";
import { orange } from "@mui/material/colors";
import { createTheme, ThemeProvider } from "@mui/material/styles";
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
  return (
    <ThemeProvider theme={theme}>
      <h1 style={{ textAlign: "center" }}>Voice Swapper!</h1>
      <SingerSelector />
      <AudioUploader />

      <AudioPlayer />
    </ThemeProvider>
  );
}

export default App;
