'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type MediaItem = {
  url: string;
  type: 'video' | 'image';
  thumbnailUrl?: string;
  isTransition?: boolean;
  transitionFromIndex?: number;
  transitionToIndex?: number;
  displayOrder?: number;
};

type TransitionState = {
  isPlaying: boolean;
  transitionVideo: MediaItem | null;
  pendingIndex: number | null;
  progress: number;
};

const TRANSITION_TIMEOUT_MS = 15000;

export function useVideoTransition(
  transitionMedia: MediaItem[],
  onTransitionComplete: (targetIndex: number) => void
) {
  const [state, setState] = useState<TransitionState>({
    isPlaying: false,
    transitionVideo: null,
    pendingIndex: null,
    progress: 0,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRef = useRef<number | null>(null);

  const findTransition = useCallback(
    (fromIndex: number, toIndex: number): MediaItem | undefined => {
      return transitionMedia.find(
        (t) => t.transitionFromIndex === fromIndex && t.transitionToIndex === toIndex
      );
    },
    [transitionMedia]
  );

  const completeTransition = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    const target = pendingRef.current;
    pendingRef.current = null;
    setState({ isPlaying: false, transitionVideo: null, pendingIndex: null, progress: 100 });
    if (target !== null) onTransitionComplete(target);
  }, [onTransitionComplete]);

  const startTransition = useCallback(
    (fromIndex: number, toIndex: number, estimatedDurationMs = 3000): boolean => {
      const transition = findTransition(fromIndex, toIndex);
      if (!transition) return false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      pendingRef.current = toIndex;
      setState({ isPlaying: true, transitionVideo: transition, pendingIndex: toIndex, progress: 0 });
      const progressStep = 100 / (estimatedDurationMs / 100);
      progressIntervalRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, progress: Math.min(prev.progress + progressStep, 95) }));
      }, 100);
      timeoutRef.current = setTimeout(completeTransition, TRANSITION_TIMEOUT_MS);
      return true;
    },
    [findTransition, completeTransition]
  );

  const handleTransitionError = useCallback(() => completeTransition(), [completeTransition]);

  const cancelTransition = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    pendingRef.current = null;
    setState({ isPlaying: false, transitionVideo: null, pendingIndex: null, progress: 0 });
  }, []);

  const hasTransition = useCallback(
    (fromIndex: number, toIndex: number) => !!findTransition(fromIndex, toIndex),
    [findTransition]
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    },
    []
  );

  return {
    isPlayingTransition: state.isPlaying,
    transitionVideo: state.transitionVideo,
    transitionProgress: state.progress,
    startTransition,
    completeTransition,
    handleTransitionError,
    cancelTransition,
    hasTransition,
  };
}
