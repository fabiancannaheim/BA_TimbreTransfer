import React, { useState, useEffect } from "react";
import { Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import axios from "axios"; // Import axios for making HTTP requests

export default function SingerSelector({ onSingerChange, isSongUploaded }) {
  const [selectedSinger, setSelectedSinger] = useState("");
  const [singers, setSingers] = useState([]);

  useEffect(() => {
    // Fetch the list of models from the backend API
    axios
      .get("http://160.85.43.209:8000/models/")
      .then((response) => {
        const models = response.data.model_names;
        // Include "Original" as a hardcoded singer
        setSingers(["Original", ...models]);
      })
      .catch((error) => {
        console.error("Error fetching models:", error);
      });
  }, []);

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
        color: "#080808", // Sets text color to black
      }}
      disabled={!isSongUploaded} // Disable the control if no song is uploaded
    >
      <InputLabel
        style={{
          color: "#0F0F0F", // Sets text color to black
        }}
        id="singer-select-label"
      >
        Swap
      </InputLabel>
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
        {singers.map((singer) => (
          <MenuItem key={singer} value={singer}>
            {singer.charAt(0).toUpperCase() + singer.slice(1)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
