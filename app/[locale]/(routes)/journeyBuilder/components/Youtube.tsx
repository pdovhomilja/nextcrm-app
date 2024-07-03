"use client";
import React from "react";
import YouTube from "react-youtube";

const Youtube = () => {
  return (
    <YouTube
      videoId="lmYtUwsbdYU"
      opts={{
        height: "390",
        width: "640",
        playerVars: {
          // https://developers.google.com/youtube/player_parameters
          autoplay: 1,
        },
      }}
    />
  );
};

export default Youtube;
