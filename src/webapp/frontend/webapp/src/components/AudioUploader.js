import React from "react";
import { Button } from "@mui/material";

export default function AudioUploader({ onFileUpload }) {
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        maxWidth: "820px",
        margin: "0 auto",
        padding: "0 12px",
      }}
    >
      <Button
        variant="contained"
        component="label"
        style={{
          fontSize: "15px",
          fontWeight: "500",
          borderRadius: "10px",
          textTransform: "none",
          fontFamily: "Roboto, Helvetica, Arial, sans-serif",
          color: "#5b5b5b",
        }}
      >
        Upload File
        <input type="file" hidden onChange={handleFileChange} />
      </Button>
    </div>
  );
}
