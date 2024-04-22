import React from "react";
import { Slider, Grid } from "@mui/material";

export default function Controls({ onVolumeChange, onEffectChange }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Slider
          min={0}
          max={100}
          defaultValue={100}
          aria-labelledby="volume-slider"
          onChange={(_, value) => onVolumeChange(value)}
        />
      </Grid>
    </Grid>
  );
}
