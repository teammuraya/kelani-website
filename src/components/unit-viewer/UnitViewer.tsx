'use client';

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Maximize2, X,
  FileText, Compass, Check, Loader2, Play, Pause,
} from 'lucide-react';
import { MainVideo, TransitionVideo, isEmbedUrl } from './VideoPlayer';
import { useVideoTransition } from './useVideoTransition';
import { PanoramaModal } from './PanoramaModal';
import { FloorPlanModal } from './FloorPlanModal';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MediaItem = {
  url: string;
  type: 'video' | 'image';
  thumbnailUrl?: string;
  isTransition?: boolean;
  transitionFromIndex?: number;
  transitionToIndex?: number;
  displayOrder?: number;
  caption?: string;
};

export type Panorama = {
  name: string;
  panoramaUrl: string;
  description?: string;
  initialView?: { yaw: number; pitch: number; fov: number };
};

export type UnitData = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number;
  price: number;
  status: 'available' | 'reserved' | 'sold';
  floor_number?: number;
  unit_type?: string;
  thumbnail_url?: string;
  banner_image_url?: string;
  floor_plan_url?: string;
  exterior_media?: MediaItem[];
  interior_media?: MediaItem[];
  gallery_media?: MediaItem[];
  panoramas?: Panorama[];
  amenities?: string[];
};

type Category = 'exterior' | 'interior' | 'gallery';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(p: number) {
  if (p >= 1_000_000) return `KES ${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000)     return `KES ${(p / 1_000).toFixed(0)}K`;
  return `KES ${p.toLocaleString()}`;
}

function statusCls(s: string) {
  if (s === 'available') return 'bg-emerald-500 text-white';
  if (s === 'reserved')  return 'bg-amber-500 text-white';
  return 'bg-red-500/80 text-white';
}

// ─── VideoThumbnail ───────────────────────────────────────────────────────────
// Exact replica of the thumbnail in HouseDetailsView

function VideoThumbnail({
  media, index, isActive, hasTransitionIndicator, fallback, onClick,
}: {
  media: MediaItem; index: number; isActive: boolean;
  hasTransitionIndicator: boolean; fallback: string; onClick: () => void;
}) {
  const [isLoaded, setIsLoaded]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const thumbUrl = media.type === 'video' ? (media.thumbnailUrl || fallback) : media.url;

  useEffect(() => {
    if (media.type !== 'video')     { setIsLoaded(true); return; }
    if (isEmbedUrl(media.url))      { setIsLoaded(true); return; }
    setIsLoading(true);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.oncanplay = () => { setIsLoaded(true); setIsLoading(false); };
    v.onerror   = () => { setIsLoaded(false); setIsLoading(false); };
    v.src = media.url;
    return () => { v.oncanplay = null; v.onerror = null; v.src = ''; };
  }, [media.url, media.type]);

  return (
    <button
      onClick={onClick}
      className={`relative w-24 h-20 rounded-lg overflow-hidden transition-all duration-300 ${
        isActive
          ? 'ring-2 ring-white shadow-xl scale-105'
          : 'opacity-60 hover:opacity-90 shadow-md hover:scale-[1.02]'
      }`}
    >
      <img src={thumbUrl} alt={`View ${index + 1}`} className="w-full h-full object-cover" />

      {/* Transition dot indicator */}
      {hasTransitionIndicator && !isActive && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-400 opacity-80" />
      )}

      {/* Load status indicator (green check = ready, spinner = loading) */}
      {media.type === 'video' && (
        <div className="absolute bottom-1 right-1">
          {isLoading && (
            <div className="w-4 h-4 rounded-full bg-yellow-500/80 flex items-center justify-center">
              <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
            </div>
          )}
          {isLoaded && !isLoading && (
            <div className="w-4 h-4 rounded-full bg-green-500/90 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// ─── MobileThumbnail ──────────────────────────────────────────────────────────

function MobileThumbnail({
  media, index, isActive, fallback, onClick,
}: {
  media: MediaItem; index: number; isActive: boolean; fallback: string; onClick: () => void;
}) {
  const thumbUrl = media.type === 'video' ? (media.thumbnailUrl || fallback) : media.url;
  return (
    <button
      onClick={onClick}
      className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-300 ${
        isActive ? 'ring-2 ring-white shadow-lg' : 'opacity-50 hover:opacity-80'
      }`}
    >
      <img src={thumbUrl} alt={`Thumb ${index + 1}`} className="w-full h-full object-cover" />
    </button>
  );
}

// ─── PanoramaPicker sheet ─────────────────────────────────────────────────────

function PanoramaPicker({
  panoramas, onSelect, onClose,
}: {
  panoramas: Panorama[]; onSelect: (p: Panorama) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg p-6 z-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">360° Virtual Tour</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-white/50 text-sm mb-4">Select a space to explore</p>
        <div className="space-y-2">
          {panoramas.map((p, i) => (
            <button
              key={i} onClick={() => onSelect(p)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                360°
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{p.name}</p>
                {p.description && <p className="text-white/50 text-sm truncate">{p.description}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main UnitViewer ──────────────────────────────────────────────────────────
// Layout mirrors HouseDetailsView from homeplanner exactly.

export default function UnitViewer({
  unit, projectSlug, projectName,
}: {
  unit: UnitData; projectSlug: string; projectName: string;
}) {
  const [currentCategory, setCurrentCategory] = useState<Category>('exterior');
  const [currentMediaIndex, setCurrentMediaIndex]   = useState(0);
  const [isFullscreen, setIsFullscreen]             = useState(false);
  const [isPlayingVideo, setIsPlayingVideo]         = useState(true);
  const [isVideoReady, setIsVideoReady]             = useState(false);
  const [isTransitionFading, setIsTransitionFading] = useState(false);
  const [activePanorama, setActivePanorama]         = useState<Panorama | null>(null);
  const [showPanoramaPicker, setShowPanoramaPicker] = useState(false);
  const [showFloorPlan, setShowFloorPlan]           = useState(false);

  // ── Resolve media ──────────────────────────────────────────────────────────

  const getAllCategoryMedia = useCallback((): MediaItem[] => {
    switch (currentCategory) {
      case 'exterior': return unit.exterior_media ?? [];
      case 'interior': return unit.interior_media ?? [];
      case 'gallery':  return unit.gallery_media  ?? [];
      default:         return [];
    }
  }, [unit, currentCategory]);

  const allMedia      = useMemo(() => getAllCategoryMedia(), [getAllCategoryMedia]);
  const categoryMedia = useMemo(
    () => allMedia.filter(m => !m.isTransition).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [allMedia]
  );
  const transitionMedia = useMemo(() => allMedia.filter(m => m.isTransition), [allMedia]);

  // Fallback: if category is empty, show thumbnail as a single image
  const effectiveMedia = useMemo((): MediaItem[] => {
    if (categoryMedia.length > 0) return categoryMedia;
    if (unit.thumbnail_url) return [{ url: unit.thumbnail_url, type: 'image' }];
    return [];
  }, [categoryMedia, unit.thumbnail_url]);

  const totalMedia   = effectiveMedia.length;
  const currentMedia = effectiveMedia[currentMediaIndex] ?? { url: unit.thumbnail_url ?? '', type: 'image' as const };
  const fallbackThumb = unit.thumbnail_url ?? '';

  // ── Transition hook ────────────────────────────────────────────────────────

  const handleTransitionComplete = useCallback((targetIndex: number) => {
    setCurrentMediaIndex(targetIndex);
    setIsTransitionFading(true);
  }, []);

  const {
    isPlayingTransition, transitionVideo,
    startTransition, completeTransition,
    handleTransitionError, cancelTransition, hasTransition,
  } = useVideoTransition(transitionMedia, handleTransitionComplete);

  // ── Reset on category change ───────────────────────────────────────────────

  useEffect(() => {
    setCurrentMediaIndex(0);
    setIsVideoReady(false);
    setIsTransitionFading(false);
    cancelTransition();
    // auto-play if first item is video
    setTimeout(() => {
      const first = (getAllCategoryMedia()).filter(m => !m.isTransition)[0];
      setIsPlayingVideo(first?.type === 'video');
    }, 0);
  }, [currentCategory, cancelTransition, getAllCategoryMedia]);

  // auto-play whenever index changes
  useEffect(() => {
    setIsPlayingVideo(currentMedia.type === 'video');
  }, [currentMediaIndex, currentMedia.type, currentCategory]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const navigateToMedia = useCallback((toIndex: number) => {
    if (toIndex === currentMediaIndex) return;
    if (isPlayingTransition) cancelTransition();
    const from = effectiveMedia[currentMediaIndex];
    const to   = effectiveMedia[toIndex];
    if (from?.type === 'video' && to?.type === 'video') {
      if (startTransition(currentMediaIndex, toIndex)) return;
    }
    setCurrentMediaIndex(toIndex);
  }, [currentMediaIndex, effectiveMedia, isPlayingTransition, cancelTransition, startTransition]);

  const nextMedia = useCallback(() => {
    if (totalMedia > 0) navigateToMedia((currentMediaIndex + 1) % totalMedia);
  }, [totalMedia, currentMediaIndex, navigateToMedia]);

  const prevMedia = useCallback(() => {
    if (totalMedia > 0) navigateToMedia((currentMediaIndex - 1 + totalMedia) % totalMedia);
  }, [totalMedia, currentMediaIndex, navigateToMedia]);

  // ── Keyboard ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prevMedia();
      if (e.key === 'ArrowRight') nextMedia();
      if (e.key === 'Escape') {
        if (showPanoramaPicker) { setShowPanoramaPicker(false); return; }
        if (activePanorama)     { setActivePanorama(null);      return; }
        if (showFloorPlan)      { setShowFloorPlan(false);      return; }
        if (isPlayingTransition) { cancelTransition();          return; }
        if (isFullscreen)        { setIsFullscreen(false);      return; }
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [prevMedia, nextMedia, isFullscreen, showPanoramaPicker, activePanorama,
      showFloorPlan, isPlayingTransition, cancelTransition]);

  const hasPanoramas = (unit.panoramas ?? []).length > 0;
  const cats: Category[] = ['exterior', 'interior', 'gallery'];

  const catCount = (cat: Category) => {
    const arr = cat === 'exterior' ? unit.exterior_media
      : cat === 'interior' ? unit.interior_media : unit.gallery_media;
    return (arr ?? []).filter(m => !m.isTransition).length;
  };

  // ── Shared: background media renderer ─────────────────────────────────────

  const renderBackground = () => (
    <>
      {/* Transition video layer — z-[5] above main video but below UI */}
      {(isPlayingTransition || isTransitionFading) && transitionVideo && (
        <TransitionVideo
          video={transitionVideo}
          className="absolute inset-0 w-full h-full object-cover z-[5]"
          onEnded={completeTransition}
          onError={handleTransitionError}
        />
      )}

      {/* Main video / image */}
      {currentMedia.type === 'video' ? (
        <MainVideo
          media={currentMedia}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay loop
          onReady={() => { setIsVideoReady(true); setIsTransitionFading(false); }}
          onError={() => setIsVideoReady(false)}
        />
      ) : (
        <img
          src={currentMedia.url || fallbackThumb}
          alt={unit.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Paused overlay for direct mp4 when paused */}
      {currentMedia.type === 'video' && !isPlayingVideo && !isPlayingTransition && !isEmbedUrl(currentMedia.url) && (
        <button
          onClick={() => setIsPlayingVideo(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors z-10"
        >
          <div className="w-20 h-20 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-xl transition-transform hover:scale-110">
            <Play className="w-8 h-8 text-gray-800 ml-1" />
          </div>
        </button>
      )}
    </>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // FULLSCREEN MODE
  // ════════════════════════════════════════════════════════════════════════════

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        {renderBackground()}

        {/* Close */}
        <button
          onClick={() => { setIsFullscreen(false); cancelTransition(); }}
          className="absolute top-4 right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Prev / Next */}
        <button onClick={prevMedia} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={nextMedia} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white">
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Bottom nav */}
        <div className="absolute bottom-8 left-0 right-0 z-20 flex flex-col items-center gap-5">
          <div className="flex items-center gap-2">
            {cats.map(cat => (
              <button
                key={cat} onClick={() => setCurrentCategory(cat)}
                className={`px-6 py-2 font-semibold text-sm uppercase tracking-wider transition-all border-b-2 ${
                  currentCategory === cat ? 'text-white border-white' : 'text-white/70 hover:text-white border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={prevMedia} className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex gap-3">
              {effectiveMedia.slice(0, 6).map((m, i) => (
                <VideoThumbnail key={i} media={m} index={i} isActive={i === currentMediaIndex}
                  hasTransitionIndicator={hasTransition(currentMediaIndex, i)}
                  fallback={fallbackThumb} onClick={() => navigateToMedia(i)} />
              ))}
            </div>
            <button onClick={nextMedia} className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs z-20">
          {currentMediaIndex + 1} / {totalMedia}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER — mirrors HouseDetailsView layout exactly
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen md:h-screen relative overflow-hidden flex flex-col bg-black">

      {/* ─────────────────────────────────────────────────────────────────────
          MOBILE HEADER  (hidden on desktop)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="relative z-30 bg-black/80 backdrop-blur-md border-b border-white/10 md:hidden pt-20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href={`/projects/${projectSlug}/units`}
              className="bg-white/20 backdrop-blur-xl border border-white/30 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">{projectName}</p>
              <h1 className="text-white font-bold text-sm uppercase tracking-wide">{unit.name}</h1>
            </div>
          </div>

          {/* Mobile category tabs */}
          <div className="flex items-center gap-1">
            {cats.map(cat => (
              <button
                key={cat} onClick={() => setCurrentCategory(cat)}
                className={`px-4 py-2 font-semibold text-xs uppercase tracking-wider transition-all duration-300 border-b-2 ${
                  currentCategory === cat ? 'text-white border-white' : 'text-white/60 hover:text-white border-transparent'
                }`}
              >
                {cat}
                {catCount(cat) > 0 && <span className="ml-1 text-[9px] opacity-60">({catCount(cat)})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MAIN VIDEO / IMAGE AREA
          Mobile: h-[45vh]  |  Desktop: absolute inset-0 (full screen)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="relative h-[45vh] md:h-screen md:absolute md:inset-0">
        {renderBackground()}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 md:hidden pointer-events-none z-10" />
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 via-30% to-transparent pointer-events-none z-10" />

        {/* Mobile action buttons */}
        <div className="md:hidden absolute bottom-4 right-4 flex gap-2 z-20">
          <button
            onClick={() => setIsFullscreen(true)}
            className="bg-white/90 hover:bg-white text-gray-800 rounded-lg w-10 h-10 flex items-center justify-center shadow-lg"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          {currentMedia.type === 'video' && (
            <button
              onClick={() => setIsPlayingVideo(!isPlayingVideo)}
              className="bg-white/90 hover:bg-white text-gray-800 rounded-lg w-10 h-10 flex items-center justify-center shadow-lg"
            >
              {isPlayingVideo ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          DESKTOP: Back button  (top-left, z-30)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block absolute top-28 left-8 z-30">
        <Link
          href={`/projects/${projectSlug}/units`}
          className="bg-white/90 hover:bg-white text-gray-800 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs uppercase tracking-wide font-semibold">{projectName}</span>
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          DESKTOP: Top-right controls
      ───────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex absolute top-28 right-8 z-30 gap-2">
        {currentMedia.type === 'video' && !isEmbedUrl(currentMedia.url) && (
          <button
            onClick={() => setIsPlayingVideo(!isPlayingVideo)}
            className="bg-white/90 hover:bg-white text-gray-800 rounded-full px-4 py-2 shadow-lg backdrop-blur-sm text-xs uppercase tracking-wide font-semibold flex items-center gap-2"
          >
            {isPlayingVideo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlayingVideo ? 'Pause' : 'Play'}
          </button>
        )}
        <button
          onClick={() => setIsFullscreen(true)}
          className="bg-white/90 hover:bg-white text-gray-800 rounded-full px-6 py-2 shadow-lg backdrop-blur-sm text-xs uppercase tracking-widest font-bold"
        >
          Fullscreen
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          DESKTOP: Left Specs Panel  (top-40 left-8 z-30 w-[340px])
          Exact same layout as HouseDetailsView
      ───────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block absolute top-28 left-8 z-30 w-[340px]">
        <div className="space-y-4">

          {/* ── Image banner card ── */}
          <div className="relative rounded-2xl overflow-hidden h-44 bg-gray-900 shadow-2xl">
            {(unit.banner_image_url || unit.thumbnail_url) ? (
              <img src={unit.banner_image_url || unit.thumbnail_url} alt={unit.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
            )}
            {/* gradient bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {/* status badge */}
            <span className={`absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusCls(unit.status)}`}>
              {unit.status}
            </span>
            {/* unit type */}
            {unit.unit_type && (
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-black/50 text-white/80 backdrop-blur-sm">
                {unit.unit_type}
              </span>
            )}
          </div>

          {/* Unit name */}
          <div>
            <div className="text-white/50 text-[9px] uppercase tracking-wider font-medium mb-1">
              {unit.unit_type ?? 'Unit'}
            </div>
            <div className="text-white text-6xl font-bold tracking-tight leading-none">
              {unit.name.split(/\s+/).slice(0, 2).join(' ')}
            </div>
            <div className="text-white/40 text-sm mt-1">{unit.name}</div>
          </div>

          {/* Status badge */}
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusCls(unit.status)}`}>
            {unit.status}
          </span>

          {/* Stats grid — 3 columns like HouseDetailsView */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Beds',   value: String(unit.bedrooms) },
              { label: 'Baths',  value: String(unit.bathrooms) },
              { label: 'Sqft',   value: unit.area_sqft >= 1000 ? `${(unit.area_sqft/1000).toFixed(1)}K` : String(unit.area_sqft) },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <div className="text-white/50 text-[9px] uppercase tracking-wider font-medium">{label}</div>
                <div className="text-white text-2xl font-bold tracking-tight">{value}</div>
              </div>
            ))}
          </div>

          {/* Row breakdown — like room breakdown in HouseDetailsView */}
          <div className="space-y-0 pt-2">
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-white/50 uppercase text-[10px] tracking-wider font-medium">Price</span>
              <span className="text-white text-sm font-semibold">{formatPrice(unit.price)}</span>
            </div>
            {unit.floor_number != null && (
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-white/50 uppercase text-[10px] tracking-wider font-medium">Floor</span>
                <span className="text-white text-sm font-semibold">{unit.floor_number}</span>
              </div>
            )}
            {(unit.amenities ?? []).slice(0, 4).map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-white/50 uppercase text-[10px] tracking-wider font-medium flex items-center gap-1">
                  <Check className="w-3 h-3 text-olive-400" /> {a}
                </span>
              </div>
            ))}
          </div>

          {/* Floor plan — like "House Documentation" in HouseDetailsView */}
          {unit.floor_plan_url && (
            <div className="pt-2">
              <div className="text-white/50 text-[10px] uppercase tracking-wider font-medium mb-2">Floor Plan</div>
              <button
                onClick={() => setShowFloorPlan(true)}
                className="text-white text-xs font-semibold flex items-center gap-2 hover:text-white/80"
              >
                <FileText className="w-4 h-4" />
                VIEW_FLOOR_PLAN.PDF
              </button>
            </div>
          )}

          {/* Action buttons — mirrors "Select House" button style */}
          <div className="space-y-2 pt-2">
            {hasPanoramas && (
              <button
                onClick={() => setShowPanoramaPicker(true)}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 rounded-lg transition-all duration-300 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4" />
                360° Virtual Tour
              </button>
            )}
            <button
              onClick={() => setIsFullscreen(true)}
              className="w-full bg-gray-200/95 hover:bg-gray-100 text-gray-900 font-bold py-3 rounded-lg transition-all duration-300 shadow-lg uppercase tracking-widest text-xs"
            >
              Fullscreen Tour
            </button>
            <Link
              href="/contact"
              className="block text-center w-full bg-olive-500 hover:bg-olive-400 text-white font-bold py-3 rounded-lg transition-all duration-300 shadow-lg uppercase tracking-widest text-xs"
            >
              Inquire Now
            </Link>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          DESKTOP: Bottom Navigation  (bottom-8, z-30)
          Exact match of HouseDetailsView bottom section
      ───────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block absolute bottom-8 left-0 right-0 z-30">
        <div className="flex flex-col items-center gap-6">

          {/* Category tabs */}
          <div className="flex items-center gap-2">
            {cats.map(cat => (
              <button
                key={cat} onClick={() => setCurrentCategory(cat)}
                className={`px-6 py-2 font-semibold text-sm uppercase tracking-wider transition-all duration-300 border-b-2 ${
                  currentCategory === cat
                    ? 'text-white border-white'
                    : 'text-white/70 hover:text-white border-transparent'
                }`}
              >
                {cat}
                {currentCategory === cat && catCount(cat) > 0 && (
                  <span className="ml-2 text-xs opacity-60">{catCount(cat)}</span>
                )}
              </button>
            ))}
            {hasPanoramas && (
              <button
                onClick={() => setShowPanoramaPicker(true)}
                className="px-6 py-2 font-semibold text-sm uppercase tracking-wider text-white/70 hover:text-white border-b-2 border-transparent transition-all flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                Tour
              </button>
            )}
          </div>

          {/* Thumbnail carousel with load indicators */}
          {effectiveMedia.length > 0 && (
            <div className="flex items-center gap-4">
              <button
                onClick={prevMedia}
                className="bg-transparent hover:bg-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3">
                {effectiveMedia.slice(0, 6).map((media, index) => (
                  <VideoThumbnail
                    key={`thumb-${index}-${media.url}`}
                    media={media} index={index}
                    isActive={index === currentMediaIndex}
                    hasTransitionIndicator={hasTransition(currentMediaIndex, index)}
                    fallback={fallbackThumb}
                    onClick={() => navigateToMedia(index)}
                  />
                ))}
                {effectiveMedia.length > 6 && (
                  <span className="text-white/40 text-xs">+{effectiveMedia.length - 6}</span>
                )}
              </div>

              <button
                onClick={nextMedia}
                className="bg-transparent hover:bg-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* Transition spinner */}
          {isPlayingTransition && (
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Playing transition...</span>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MOBILE: Thumbnail strip  (-mt-8 z-20, same as HouseDetailsView)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="md:hidden relative -mt-8 z-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 justify-center">
            <button onClick={prevMedia} className="bg-transparent hover:bg-white/10 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 overflow-x-auto max-w-full px-1">
              {effectiveMedia.map((media, index) => (
                <MobileThumbnail
                  key={`m-${index}`} media={media} index={index}
                  isActive={index === currentMediaIndex}
                  fallback={fallbackThumb} onClick={() => navigateToMedia(index)}
                />
              ))}
            </div>
            <button onClick={nextMedia} className="bg-transparent hover:bg-white/10 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MOBILE: Specs card  (same structure as HouseDetailsView)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="md:hidden relative bg-black pb-10">
        <div className="space-y-5">

          {/* ── Mobile banner image ── */}
          {(unit.banner_image_url || unit.thumbnail_url) && (
            <div className="relative h-48 overflow-hidden">
              <img src={unit.banner_image_url || unit.thumbnail_url} alt={unit.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                <div>
                  <div className="text-white/50 text-[9px] uppercase tracking-wider">{unit.unit_type ?? 'Unit'}</div>
                  <div className="text-white font-bold text-xl">{unit.name}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusCls(unit.status)}`}>
                  {unit.status}
                </span>
              </div>
            </div>
          )}

          <div className="px-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <div className="text-white/50 text-[10px] uppercase tracking-wide">Unit</div>
              <div className="text-white text-xl font-bold">{unit.bedrooms}BR</div>
            </div>
            <div className="space-y-1">
              <div className="text-white/50 text-[10px] uppercase tracking-wide">Area</div>
              <div className="text-white text-base font-bold">{unit.area_sqft.toLocaleString()}<span className="text-xs ml-0.5">ft²</span></div>
            </div>
            <div className="space-y-1">
              <div className="text-white/50 text-[10px] uppercase tracking-wide">Price</div>
              <div className="text-white text-lg font-bold">{formatPrice(unit.price)}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="text-white/50 text-[10px] uppercase tracking-wide">Baths</div>
              <div className="text-white text-lg font-bold">{unit.bathrooms}</div>
            </div>
            {unit.floor_number != null && (
              <div className="space-y-1">
                <div className="text-white/50 text-[10px] uppercase tracking-wide">Floor</div>
                <div className="text-white text-lg font-bold">{unit.floor_number}</div>
              </div>
            )}
            {unit.unit_type && (
              <div className="space-y-1">
                <div className="text-white/50 text-[10px] uppercase tracking-wide">Type</div>
                <div className="text-white text-sm font-bold truncate">{unit.unit_type}</div>
              </div>
            )}
          </div>

          {unit.floor_plan_url && (
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => setShowFloorPlan(true)}
                className="text-white text-sm font-semibold flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Floor Plan
              </button>
            </div>
          )}

          <div className="space-y-3">
            {hasPanoramas && (
              <button
                onClick={() => setShowPanoramaPicker(true)}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-4 rounded-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4" /> 360° Virtual Tour
              </button>
            )}
            <Link href="/contact"
              className="block text-center w-full bg-white/90 hover:bg-white text-gray-800 font-bold py-4 rounded-xl shadow-lg uppercase tracking-widest text-xs"
            >
              Inquire About This Unit
            </Link>
            <Link href={`/projects/${projectSlug}/units`}
              className="block text-center w-full bg-gray-300/90 hover:bg-gray-200 text-gray-800 font-semibold py-4 rounded-xl shadow-lg uppercase tracking-wide text-xs"
            >
              ← Back to Units
            </Link>
          </div>
          </div> {/* end px-4 */}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────────────── */}
      {showFloorPlan && unit.floor_plan_url && (
        <FloorPlanModal url={unit.floor_plan_url} onClose={() => setShowFloorPlan(false)} />
      )}
      {showPanoramaPicker && hasPanoramas && (
        <PanoramaPicker
          panoramas={unit.panoramas!}
          onSelect={p => { setActivePanorama(p); setShowPanoramaPicker(false); }}
          onClose={() => setShowPanoramaPicker(false)}
        />
      )}
      {activePanorama && (
        <PanoramaModal panorama={activePanorama} onClose={() => setActivePanorama(null)} />
      )}
    </div>
  );
}
