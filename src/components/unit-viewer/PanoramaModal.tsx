'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    pannellum: {
      viewer: (container: HTMLElement, config: any) => any;
    };
  }
}

type Panorama = {
  name: string;
  panoramaUrl: string;
  description?: string;
  initialView?: { yaw: number; pitch: number; fov: number };
};

export function PanoramaModal({
  panorama,
  onClose,
}: {
  panorama: Panorama;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.pannellum) { setLoaded(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
    script.onload = () => setLoaded(true);
    script.onerror = () => setError('Failed to load panorama viewer');
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded || !containerRef.current || !panorama.panoramaUrl) return;
    setLoading(true);
    try {
      if (viewerRef.current) viewerRef.current.destroy();
      viewerRef.current = window.pannellum.viewer(containerRef.current, {
        type: 'equirectangular',
        panorama: panorama.panoramaUrl,
        autoLoad: true,
        autoRotate: -2,
        compass: false,
        showZoomCtrl: true,
        showFullscreenCtrl: true,
        mouseZoom: true,
        yaw: panorama.initialView?.yaw ?? 0,
        pitch: panorama.initialView?.pitch ?? 0,
        hfov: panorama.initialView?.fov ?? 100,
        minHfov: 30,
        maxHfov: 120,
      });
      setTimeout(() => setLoading(false), 500);
    } catch {
      setError('Failed to load panorama');
      setLoading(false);
    }
    return () => {
      try { viewerRef.current?.destroy(); } catch {}
      viewerRef.current = null;
    };
  }, [loaded, panorama.panoramaUrl, panorama.initialView]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h2 className="text-white font-semibold">{panorama.name}</h2>
          {panorama.description && <p className="text-white/60 text-sm">{panorama.description}</p>}
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
      <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <p className="text-white text-sm">Loading panorama...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center text-white">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={onClose} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20">Close</button>
          </div>
        </div>
      )}
      {!loading && !error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-full text-white/80 text-sm pointer-events-none">
          Drag to look around · Scroll to zoom
        </div>
      )}
    </div>
  );
}
