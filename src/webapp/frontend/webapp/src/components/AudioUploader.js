import React from "react";
import { Button } from "@mui/material";

export default function AudioUploader({ onFileUpload }) {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <Button variant="contained" component="label">
        Upload File
        <input type="file" hidden onChange={handleFileChange} />
      </Button>
    </div>
  );
}
