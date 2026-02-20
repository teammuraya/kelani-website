'use client';

import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

export type VideoDisplayArea = {
  offsetX: number;
  offsetY: number;
  displayWidth: number;
  displayHeight: number;
  ready: boolean;
};

const MAX_RETRIES = 60; // ~1 second at 60fps

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

  const retryCountRef = useRef(0);
  const rafIdRef = useRef<number>(0);

  const calculate = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video || !container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // If container or video has no dimensions yet, retry on next frame
    // This handles the case where video metadata loads before container is laid out
    if (containerWidth === 0 || containerHeight === 0 || !videoWidth || !videoHeight) {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        rafIdRef.current = requestAnimationFrame(calculate);
      }
      return;
    }

    // Reset retry count on success
    retryCountRef.current = 0;

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

    // Reset retry count when refs change
    retryCountRef.current = 0;

    // Calculate on video metadata load
    const handleLoadedMetadata = () => {
      retryCountRef.current = 0; // Reset retries on new metadata
      calculate();
    };

    // If video already has dimensions, calculate immediately
    if (video.videoWidth && video.videoHeight) {
      calculate();
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Recalculate on container resize
    const resizeObserver = new ResizeObserver(() => {
      retryCountRef.current = 0; // Reset retries on resize
      calculate();
    });
    resizeObserver.observe(container);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      resizeObserver.disconnect();
      // Cancel any pending animation frame
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [videoRef, containerRef, calculate]);

  return displayArea;
}
