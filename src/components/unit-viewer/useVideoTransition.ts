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
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    const target = pendingRef.current;
    pendingRef.current = null;
    setState({ isPlaying: false, transitionVideo: null, pendingIndex: null });
    if (target !== null) onTransitionComplete(target);
  }, [onTransitionComplete]);

  const startTransition = useCallback(
    (fromIndex: number, toIndex: number): boolean => {
      const transition = findTransition(fromIndex, toIndex);
      if (!transition) return false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      pendingRef.current = toIndex;
      setState({ isPlaying: true, transitionVideo: transition, pendingIndex: toIndex });
      timeoutRef.current = setTimeout(completeTransition, TRANSITION_TIMEOUT_MS);
      return true;
    },
    [findTransition, completeTransition]
  );

  const handleTransitionError = useCallback(() => completeTransition(), [completeTransition]);

  const cancelTransition = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pendingRef.current = null;
    setState({ isPlaying: false, transitionVideo: null, pendingIndex: null });
  }, []);

  const hasTransition = useCallback(
    (fromIndex: number, toIndex: number) => !!findTransition(fromIndex, toIndex),
    [findTransition]
  );

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return {
    isPlayingTransition: state.isPlaying,
    transitionVideo: state.transitionVideo,
    startTransition,
    completeTransition,
    handleTransitionError,
    cancelTransition,
    hasTransition,
  };
}
