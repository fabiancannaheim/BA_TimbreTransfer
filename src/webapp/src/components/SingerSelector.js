import React, { useState } from "react";
import { Select, MenuItem, FormControl, InputLabel } from "@mui/material";

export default function SingerSelector({ onSingerChange, isSongUploaded }) {
  const [selectedSinger, setSelectedSinger] = useState("");

  const handleSingerChange = (event) => {
    const singer = event.target.value;
    setSelectedSinger(singer);
    if (onSingerChange) {
      onSingerChange(singer);
    }
  };

  return (
    <FormControl
      style={{
        minWidth: 100, // Ensuring a minimum width of 100px
        color: "black", // Sets text color to black
      }}
      disabled={!isSongUploaded} // Disable the control if no song is uploaded
    >
      <InputLabel id="singer-select-label">Original</InputLabel>
      <Select
        labelId="singer-select-label"
        id="singer-select"
        value={selectedSinger}
        label="Singer"
        onChange={handleSingerChange}
        style={{
          color: "white", // Sets text color to white
        }}
      >
        <MenuItem value="sax">Sax</MenuItem>
        <MenuItem value="Beyonce">Beyonce</MenuItem>
        <MenuItem value="Basil">Basil</MenuItem>
        {/* ...add as many MenuItem components as you have singers... */}
      </Select>
    </FormControl>
  );
}
