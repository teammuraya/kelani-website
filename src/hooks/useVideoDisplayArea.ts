'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';

export type VideoDisplayArea = {
  offsetX: number;
  offsetY: number;
  displayWidth: number;
  displayHeight: number;
  ready: boolean;
};

/**
 * Calculate the actual display area of a video element using object-contain.
 * When a video has a different aspect ratio than its container, letterboxing occurs.
 * This hook calculates where the video actually renders within the container.
 */
export function useVideoDisplayArea(
  videoRef: RefObject<HTMLVideoElement | null>,
  containerRef: RefObject<HTMLDivElement | null>
): VideoDisplayArea {
  const [displayArea, setDisplayArea] = useState<VideoDisplayArea>({
    offsetX: 0,
    offsetY: 0,
    displayWidth: 0,
    displayHeight: 0,
    ready: false,
  });

  const calculate = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video || !container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Get video's intrinsic dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // If video dimensions aren't available yet, use container dimensions as fallback
    if (!videoWidth || !videoHeight || containerWidth === 0 || containerHeight === 0) {
      setDisplayArea({
        offsetX: 0,
        offsetY: 0,
        displayWidth: containerWidth,
        displayHeight: containerHeight,
        ready: false,
      });
      return;
    }

    const containerAspectRatio = containerWidth / containerHeight;
    const videoAspectRatio = videoWidth / videoHeight;

    let displayWidth: number;
    let displayHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (videoAspectRatio > containerAspectRatio) {
      // Video is wider than container - letterbox top/bottom
      displayWidth = containerWidth;
      displayHeight = containerWidth / videoAspectRatio;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // Video is taller than container - letterbox left/right
      displayHeight = containerHeight;
      displayWidth = containerHeight * videoAspectRatio;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    }

    setDisplayArea({
      offsetX,
      offsetY,
      displayWidth,
      displayHeight,
      ready: true,
    });
  }, [videoRef, containerRef]);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video || !container) return;

    // Calculate on video metadata load
    const handleLoadedMetadata = () => {
      calculate();
    };

    // If video already has dimensions, calculate immediately
    if (video.videoWidth && video.videoHeight) {
      calculate();
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Recalculate on container resize
    const resizeObserver = new ResizeObserver(() => {
      calculate();
    });
    resizeObserver.observe(container);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      resizeObserver.disconnect();
    };
  }, [videoRef, containerRef, calculate]);

  return displayArea;
}
