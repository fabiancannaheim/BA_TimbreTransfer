import React from "react";
import AudioUploader from "./components/AudioUploader";
import AudioPlayer from "./components/AudioPlayer";
import StemSeparator from "./components/StemSeparator";
import TimbreTransfer from "./components/TimbreTransfer";
import Controls from "./components/Controls";

function App() {
  return (
    <div>
      <h1 style={{ textAlign: "center" }}>Voice Swapper!</h1>
      <AudioUploader />
      <AudioPlayer />
      <Controls />
    </div>
  );
}

export default App;
