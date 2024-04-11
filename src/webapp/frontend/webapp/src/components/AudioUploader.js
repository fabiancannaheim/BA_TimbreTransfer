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
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "0 16px",
      }}
    >
      <Button variant="contained" component="label">
        Upload File
        <input type="file" hidden onChange={handleFileChange} />
      </Button>
    </div>
  );
}
