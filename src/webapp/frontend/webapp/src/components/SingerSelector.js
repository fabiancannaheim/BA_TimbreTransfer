import React, { useState } from "react";
import { Select, MenuItem, FormControl, InputLabel } from "@mui/material";

export default function SingerSelector({ onSingerChange }) {
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
        position: "absolute",
        top: 16,
        right: 16,
        minWidth: 50,
      }}
    >
      <InputLabel id="singer-select-label">Singer</InputLabel>
      <Select
        labelId="singer-select-label"
        id="singer-select"
        value={selectedSinger}
        label="Singer"
        onChange={handleSingerChange}
      >
        <MenuItem value="Singer 1">MJ</MenuItem>
        <MenuItem value="Singer 2">Beyonce</MenuItem>
        <MenuItem value="Singer 3">Basil</MenuItem>
        {/* ...add as many MenuItem components as you have singers... */}
      </Select>
    </FormControl>
  );
}
