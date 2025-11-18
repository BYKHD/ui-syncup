"use client";

import React, { useRef, useState, useEffect } from "react";

interface VideoPlayerProps {
  src: string;
  alt: string;
  mimeType: string;
  onVideoLoad?: (dimensions: { width: number; height: number }) => void;
}

export function VideoPlayer({
  src,
  alt,
  mimeType,
  onVideoLoad
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleVideoLoad = () => {
    const video = videoRef.current;
    if (video) {
      const dimensions = { width: video.videoWidth, height: video.videoHeight };
      setVideoLoaded(true);
      setVideoError(false);
      onVideoLoad?.(dimensions);
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
    setVideoLoaded(false);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('loadedmetadata', handleVideoLoad);
    video.addEventListener('error', handleVideoError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleVideoLoad);
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  if (videoError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Failed to load video</p>
          <p className="text-sm">{alt}</p>
          <p className="text-xs mt-2">Format: {mimeType}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center">
      {!videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-muted-foreground">Loading video...</div>
        </div>
      )}
      
      <video
        ref={videoRef}
        src={src}
        className={`max-w-full max-h-full transition-opacity duration-200 ${
          videoLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        controls
        preload="metadata"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
        }}
      >
        <source src={src} type={mimeType} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}