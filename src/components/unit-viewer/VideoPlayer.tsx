'use client';

import React, { useRef } from 'react';

type MediaItem = {
  url: string;
  type: 'video' | 'image';
  thumbnailUrl?: string;
  isTransition?: boolean;
};

// ─── URL helpers ──────────────────────────────────────────────────────────────

function isYouTubeUrl(url: string) {
  return /youtube\.com|youtu\.be/i.test(url);
}
function isVimeoUrl(url: string) {
  return /vimeo\.com/i.test(url);
}
export function isEmbedUrl(url: string) {
  return isYouTubeUrl(url) || isVimeoUrl(url);
}

function getYouTubeEmbedUrl(url: string, loop = true): string | null {
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  const videoId = shortMatch?.[1] ?? watchMatch?.[1] ?? embedMatch?.[1];
  if (!videoId) return null;
  const loopParam = loop ? `&loop=1&playlist=${videoId}` : '';
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1${loopParam}`;
}

function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  if (!match) return null;
  return `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1&background=1&loop=1`;
}

function getEmbedUrl(url: string, loop = true): string | null {
  if (isYouTubeUrl(url)) return getYouTubeEmbedUrl(url, loop);
  if (isVimeoUrl(url)) return getVimeoEmbedUrl(url);
  return null;
}

// ─── MainVideo ────────────────────────────────────────────────────────────────

type MainVideoProps = {
  media: MediaItem;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  onReady?: () => void;
  onError?: () => void;
};

export function MainVideo({ media, className = '', autoPlay = true, loop = true, onReady, onError }: MainVideoProps) {
  const embedUrl = getEmbedUrl(media.url, loop);
  if (embedUrl) {
    return (
      <div className={`${className} bg-black`}>
        <iframe
          key={`main-${media.url}`}
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          frameBorder="0"
          onLoad={() => onReady?.()}
          onError={() => onError?.()}
        />
      </div>
    );
  }
  return (
    <video
      key={media.url}
      src={media.url}
      className={className}
      autoPlay={autoPlay}
      muted
      loop={loop}
      playsInline
      onCanPlay={() => onReady?.()}
      onError={() => onError?.()}
    />
  );
}

// ─── TransitionVideo ──────────────────────────────────────────────────────────

type TransitionVideoProps = {
  video: MediaItem;
  className?: string;
  onEnded: () => void;
  onError: () => void;
};

export function TransitionVideo({ video, className = '', onEnded, onError }: TransitionVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const embedUrl = getEmbedUrl(video.url, false);

  if (embedUrl) {
    return (
      <div className={`${className} bg-black`}>
        <iframe
          key={`trans-${video.url}`}
          src={embedUrl.replace('&loop=1', '')}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          frameBorder="0"
          onLoad={() => setTimeout(onEnded, 5000)}
          onError={onError}
        />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      key={`trans-${video.url}`}
      src={video.url}
      className={className}
      autoPlay
      muted
      playsInline
      onEnded={() => {
        if (videoRef.current?.duration) {
          videoRef.current.currentTime = videoRef.current.duration - 0.01;
          videoRef.current.pause();
        }
        onEnded();
      }}
      onError={onError}
    />
  );
}
