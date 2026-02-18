'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  FileText,
  Compass,
  MapPin,
  Bed,
  Bath,
  Maximize,
  DollarSign,
  Check,
  Loader2,
  Play,
  Pause,
} from 'lucide-react';
import { MainVideo, TransitionVideo, isEmbedUrl } from './VideoPlayer';
import { useVideoTransition } from './useVideoTransition';
import { PanoramaModal } from './PanoramaModal';
import { FloorPlanModal } from './FloorPlanModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaItem = {
  url: string;
  type: 'video' | 'image';
  thumbnailUrl?: string;
  isTransition?: boolean;
  transitionFromIndex?: number;
  transitionToIndex?: number;
  displayOrder?: number;
  caption?: string;
};

type Panorama = {
  name: string;
  panoramaUrl: string;
  description?: string;
  initialView?: { yaw: number; pitch: number; fov: number };
};

type Unit = {
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
  floor_plan_url?: string;
  exterior_media?: MediaItem[];
  interior_media?: MediaItem[];
  gallery_media?: MediaItem[];
  panoramas?: Panorama[];
  amenities?: string[];
};

type Category = 'exterior' | 'interior' | 'gallery';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  if (price >= 1_000_000) return `KES ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `KES ${(price / 1_000).toFixed(0)}K`;
  return `KES ${price.toLocaleString()}`;
}

function statusColor(status: string) {
  if (status === 'available') return 'bg-emerald-500/90 text-white';
  if (status === 'reserved') return 'bg-amber-500/90 text-white';
  return 'bg-red-500/90 text-white';
}

// ─── Thumbnail Component ───────────────────────────────────────────────────────

function VideoThumbnail({
  media,
  index,
  isActive,
  fallback,
  onClick,
}: {
  media: MediaItem;
  index: number;
  isActive: boolean;
  fallback: string;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(isEmbedUrl(media.url) || media.type === 'image');
  const thumbnailUrl =
    media.type === 'video' ? media.thumbnailUrl || fallback : media.url;

  useEffect(() => {
    if (media.type !== 'video' || isEmbedUrl(media.url)) return;
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.oncanplay = () => setLoaded(true);
    v.onerror = () => setLoaded(false);
    v.src = media.url;
    return () => { v.oncanplay = null; v.onerror = null; v.src = ''; };
  }, [media.url, media.type]);

  return (
    <button
      onClick={onClick}
      className={`relative w-24 h-16 rounded-xl overflow-hidden transition-all duration-300 shrink-0 ${
        isActive
          ? 'ring-2 ring-white shadow-xl scale-105'
          : 'opacity-50 hover:opacity-90 hover:scale-102 shadow-md'
      }`}
    >
      <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
      {media.type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${loaded ? 'bg-black/40' : 'bg-black/60'}`}>
            {loaded
              ? <Play className="w-3 h-3 text-white ml-0.5" />
              : <Loader2 className="w-3 h-3 text-white animate-spin" />}
          </div>
        </div>
      )}
      {isActive && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full" />
      )}
    </button>
  );
}

// ─── Panorama Picker ───────────────────────────────────────────────────────────

function PanoramaPicker({
  panoramas,
  onSelect,
  onClose,
}: {
  panoramas: Panorama[];
  onSelect: (p: Panorama) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-charcoal-900 border border-white/10 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">360° Virtual Tour</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-white/50 text-sm mb-4">Select a space to explore</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {panoramas.map((p, i) => (
            <button
              key={i}
              onClick={() => onSelect(p)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                360°
              </div>
              <div>
                <p className="text-white font-medium">{p.name}</p>
                {p.description && <p className="text-white/50 text-sm">{p.description}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 ml-auto shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main UnitViewer ──────────────────────────────────────────────────────────

export default function UnitViewer({
  unit,
  projectSlug,
  projectName,
}: {
  unit: Unit;
  projectSlug: string;
  projectName: string;
}) {
  const [category, setCategory] = useState<Category>('exterior');
  const [mediaIndex, setMediaIndex] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isTransitionFading, setIsTransitionFading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activePanorama, setActivePanorama] = useState<Panorama | null>(null);
  const [showPanoramaPicker, setShowPanoramaPicker] = useState(false);
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  // ── Media resolution ──
  const getCategoryMedia = useCallback((): MediaItem[] => {
    const raw =
      category === 'exterior'
        ? unit.exterior_media
        : category === 'interior'
        ? unit.interior_media
        : unit.gallery_media;
    const items = raw ?? [];
    const main = items
      .filter((m) => !m.isTransition)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    // Fallback: if no media at all, use thumbnail as single image
    if (main.length === 0 && category === 'exterior' && unit.thumbnail_url) {
      return [{ url: unit.thumbnail_url, type: 'image' as const }];
    }
    return main;
  }, [unit, category]);

  const allRaw = useMemo(() => {
    const raw =
      category === 'exterior'
        ? unit.exterior_media
        : category === 'interior'
        ? unit.interior_media
        : unit.gallery_media;
    return raw ?? [];
  }, [unit, category]);

  const categoryMedia = useMemo(() => getCategoryMedia(), [getCategoryMedia]);
  const transitionMedia = useMemo(
    () => allRaw.filter((m) => m.isTransition),
    [allRaw]
  );
  const currentMedia = categoryMedia[mediaIndex] ?? { url: unit.thumbnail_url ?? '', type: 'image' as const };
  const totalMedia = categoryMedia.length;
  const fallbackThumb = unit.thumbnail_url ?? '';

  // ── Transition hook ──
  const handleTransitionComplete = useCallback((targetIndex: number) => {
    setMediaIndex(targetIndex);
    setIsTransitionFading(true);
  }, []);

  const {
    isPlayingTransition,
    transitionVideo,
    startTransition,
    completeTransition,
    handleTransitionError,
    cancelTransition,
    hasTransition,
  } = useVideoTransition(transitionMedia, handleTransitionComplete);

  // ── Reset on category change ──
  useEffect(() => {
    setMediaIndex(0);
    setIsVideoReady(false);
    setIsTransitionFading(false);
    cancelTransition();
  }, [category, cancelTransition]);

  // ── Auto-play for video items ──
  useEffect(() => {
    setIsPlaying(currentMedia.type === 'video');
  }, [mediaIndex, currentMedia.type, category]);

  // ── Navigation ──
  const navigateTo = useCallback(
    (toIndex: number) => {
      if (toIndex === mediaIndex) return;
      if (isPlayingTransition) cancelTransition();
      const from = categoryMedia[mediaIndex];
      const to = categoryMedia[toIndex];
      if (from?.type === 'video' && to?.type === 'video') {
        if (startTransition(mediaIndex, toIndex)) return;
      }
      setMediaIndex(toIndex);
    },
    [mediaIndex, categoryMedia, isPlayingTransition, cancelTransition, startTransition]
  );

  const next = useCallback(() => {
    if (totalMedia > 0) navigateTo((mediaIndex + 1) % totalMedia);
  }, [totalMedia, mediaIndex, navigateTo]);

  const prev = useCallback(() => {
    if (totalMedia > 0) navigateTo((mediaIndex - 1 + totalMedia) % totalMedia);
  }, [totalMedia, mediaIndex, navigateTo]);

  // ── Keyboard ──
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') {
        if (showPanoramaPicker) { setShowPanoramaPicker(false); return; }
        if (activePanorama) { setActivePanorama(null); return; }
        if (showFloorPlan) { setShowFloorPlan(false); return; }
        if (isFullscreen) setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [prev, next, isFullscreen, showPanoramaPicker, activePanorama, showFloorPlan]);

  const hasPanoramas = (unit.panoramas ?? []).length > 0;
  const cats: Category[] = ['exterior', 'interior', 'gallery'];

  const catHasMedia = (cat: Category) => {
    const arr = cat === 'exterior' ? unit.exterior_media : cat === 'interior' ? unit.interior_media : unit.gallery_media;
    return (arr ?? []).filter(m => !m.isTransition).length > 0;
  };

  // ── Left Info Panel content ──
  const LeftPanel = (
    <div className="space-y-5">
      {/* Unit code */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-1">{unit.unit_type ?? 'Unit'}</p>
        <h1 className="text-white text-5xl md:text-6xl font-bold tracking-tight leading-none">
          {unit.name.length > 10 ? unit.name.split(/\s+/).slice(0, 2).join(' ') : unit.name}
        </h1>
        <p className="text-white/40 text-sm mt-1 truncate">{unit.name}</p>
      </div>

      {/* Status badge */}
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(unit.status)}`}>
        {unit.status}
      </span>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-0">
        <StatRow label="Bedrooms" value={String(unit.bedrooms)} icon={<Bed className="w-3.5 h-3.5" />} />
        <StatRow label="Bathrooms" value={String(unit.bathrooms)} icon={<Bath className="w-3.5 h-3.5" />} />
        <StatRow label="Area" value={`${unit.area_sqft.toLocaleString()} ft²`} icon={<Maximize className="w-3.5 h-3.5" />} />
        {unit.floor_number != null && (
          <StatRow label="Floor" value={`Floor ${unit.floor_number}`} icon={<MapPin className="w-3.5 h-3.5" />} />
        )}
        <StatRow label="Price" value={formatPrice(unit.price)} icon={<DollarSign className="w-3.5 h-3.5" />} />
      </div>

      {/* Description */}
      {unit.description && (
        <p className="text-white/50 text-sm leading-relaxed line-clamp-3">
          {unit.description}
        </p>
      )}

      {/* Amenities */}
      {(unit.amenities ?? []).length > 0 && (
        <div className="space-y-1.5">
          {(unit.amenities ?? []).slice(0, 5).map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-white/60">
              <Check className="w-3.5 h-3.5 text-olive-400 shrink-0" />
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2">
        {unit.floor_plan_url && (
          <button
            onClick={() => setShowFloorPlan(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-xl transition-all"
          >
            <FileText className="w-4 h-4" />
            View Floor Plan
          </button>
        )}
        {hasPanoramas && (
          <button
            onClick={() => setShowPanoramaPicker(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-xl transition-all"
          >
            <Compass className="w-4 h-4" />
            360° Virtual Tour
          </button>
        )}
        <Link
          href="/contact"
          className="block text-center px-4 py-3 bg-olive-500 hover:bg-olive-400 text-white text-sm font-semibold rounded-xl transition-all"
        >
          Inquire About This Unit
        </Link>
      </div>
    </div>
  );

  // ── Bottom navigation bar ──
  const BottomNav = (
    <div className="flex flex-col items-center gap-4">
      {/* Category tabs */}
      <div className="flex items-center gap-1">
        {cats.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-5 py-2 text-sm font-semibold uppercase tracking-wider transition-all duration-300 relative ${
              category === cat
                ? 'text-white'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {cat}
            {category === cat && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-white rounded-full" />
            )}
            {catHasMedia(cat) && category !== cat && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-white/20 rounded-full" />
            )}
          </button>
        ))}
        {hasPanoramas && (
          <button
            onClick={() => setShowPanoramaPicker(true)}
            className="px-5 py-2 text-sm font-semibold uppercase tracking-wider text-white/50 hover:text-white/80 transition-all flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            Tour
          </button>
        )}
      </div>

      {/* Thumbnail carousel */}
      {categoryMedia.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {categoryMedia.slice(0, 7).map((media, i) => (
              <VideoThumbnail
                key={`${category}-${i}`}
                media={media}
                index={i}
                isActive={i === mediaIndex}
                fallback={fallbackThumb}
                onClick={() => navigateTo(i)}
              />
            ))}
            {categoryMedia.length > 7 && (
              <span className="text-white/40 text-xs">+{categoryMedia.length - 7}</span>
            )}
          </div>

          <button
            onClick={next}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Transition indicator */}
      {isPlayingTransition && (
        <div className="flex items-center gap-2 text-white/50 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Loading next view…</span>
        </div>
      )}
    </div>
  );

  // ── Fullscreen ──
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        {(isPlayingTransition || isTransitionFading) && transitionVideo && (
          <TransitionVideo
            video={transitionVideo}
            className="absolute inset-0 w-full h-full object-cover z-10"
            onEnded={completeTransition}
            onError={handleTransitionError}
          />
        )}
        <button
          onClick={() => { setIsFullscreen(false); cancelTransition(); }}
          className="absolute top-4 right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <button onClick={prev} className="absolute left-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="relative w-full h-full">
          {currentMedia.type === 'video' ? (
            <MainVideo
              media={currentMedia}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              onReady={() => { setIsVideoReady(true); setIsTransitionFading(false); }}
            />
          ) : (
            <img src={currentMedia.url} alt={unit.name} className="w-full h-full object-contain" />
          )}
        </div>
        <button onClick={next} className="absolute right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white">
          <ChevronRight className="w-6 h-6" />
        </button>
        <div className="absolute bottom-6 left-0 right-0 z-20">{BottomNav}</div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="min-h-screen md:h-screen relative overflow-hidden flex flex-col bg-black">

      {/* ══ MOBILE HEADER ══ */}
      <div className="relative z-30 bg-black/80 backdrop-blur-md border-b border-white/10 md:hidden pt-20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href={`/projects/${projectSlug}/units`}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-white/50 text-xs">{projectName}</p>
              <h1 className="text-white font-bold text-sm">{unit.name}</h1>
            </div>
          </div>
          {/* Mobile category tabs */}
          <div className="flex gap-1">
            {cats.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                  category === cat ? 'text-white border-white' : 'text-white/50 border-transparent hover:text-white/70'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ FULL-SCREEN VIDEO/IMAGE AREA ══ */}
      <div className="relative h-[50vh] md:h-screen md:absolute md:inset-0">
        {/* Transition overlay */}
        {(isPlayingTransition || isTransitionFading) && transitionVideo && (
          <TransitionVideo
            video={transitionVideo}
            className="absolute inset-0 w-full h-full object-cover z-[5]"
            onEnded={completeTransition}
            onError={handleTransitionError}
          />
        )}

        {/* Main media */}
        {currentMedia.type === 'video' ? (
          <MainVideo
            media={currentMedia}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
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

        {/* Pause overlay for non-embed videos */}
        {currentMedia.type === 'video' && !isPlaying && !isEmbedUrl(currentMedia.url) && !isPlayingTransition && (
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 z-10"
          >
            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-8 h-8 text-gray-800 ml-1" />
            </div>
          </button>
        )}

        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50 md:hidden pointer-events-none z-10" />
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/85 via-black/20 via-30% to-transparent pointer-events-none z-10" />

        {/* Mobile action buttons */}
        <div className="md:hidden absolute bottom-3 right-3 flex gap-2 z-20">
          <button
            onClick={() => setIsFullscreen(true)}
            className="bg-black/60 hover:bg-black/80 text-white rounded-xl w-10 h-10 flex items-center justify-center"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {currentMedia.type === 'video' && !isEmbedUrl(currentMedia.url) && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-black/60 hover:bg-black/80 text-white rounded-xl w-10 h-10 flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* ══ DESKTOP: Back button ══ */}
      <div className="hidden md:block absolute top-28 left-8 z-30">
        <Link
          href={`/projects/${projectSlug}/units`}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          {projectName} — Units
        </Link>
      </div>

      {/* ══ DESKTOP: Fullscreen & play controls (top right) ══ */}
      <div className="hidden md:flex absolute top-28 right-8 z-30 gap-2">
        {currentMedia.type === 'video' && !isEmbedUrl(currentMedia.url) && (
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-all flex items-center gap-2"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        )}
        <button
          onClick={() => setIsFullscreen(true)}
          className="px-4 py-2.5 bg-white/90 hover:bg-white text-gray-800 text-xs font-bold uppercase tracking-widest rounded-full transition-all flex items-center gap-2 shadow-lg"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Fullscreen
        </button>
      </div>

      {/* ══ DESKTOP: Left info panel ══ */}
      <div className="hidden md:block absolute top-40 left-8 z-30 w-[320px] max-h-[calc(100vh-220px)] overflow-y-auto pr-2 scrollbar-thin">
        {LeftPanel}
      </div>

      {/* ══ DESKTOP: Bottom navigation ══ */}
      <div className="hidden md:block absolute bottom-8 left-0 right-0 z-30">
        {BottomNav}
      </div>

      {/* ══ MOBILE: Thumbnail strip ══ */}
      <div className="md:hidden relative z-20 -mt-6">
        <div className="mx-4 p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl">
          <div className="flex items-center gap-2">
            <button onClick={prev} className="text-white w-8 h-8 flex items-center justify-center shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2 overflow-x-auto flex-1">
              {categoryMedia.map((media, i) => (
                <button
                  key={i}
                  onClick={() => navigateTo(i)}
                  className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 transition-all ${
                    i === mediaIndex ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  <img
                    src={media.type === 'video' ? (media.thumbnailUrl || fallbackThumb) : media.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            <button onClick={next} className="text-white w-8 h-8 flex items-center justify-center shrink-0">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ══ MOBILE: Info card ══ */}
      <div className="md:hidden bg-black px-4 pt-4 pb-8">
        {LeftPanel}
      </div>

      {/* ══ MODALS ══ */}
      {showFloorPlan && unit.floor_plan_url && (
        <FloorPlanModal url={unit.floor_plan_url} onClose={() => setShowFloorPlan(false)} />
      )}
      {showPanoramaPicker && hasPanoramas && (
        <PanoramaPicker
          panoramas={unit.panoramas!}
          onSelect={(p) => { setActivePanorama(p); setShowPanoramaPicker(false); }}
          onClose={() => setShowPanoramaPicker(false)}
        />
      )}
      {activePanorama && (
        <PanoramaModal panorama={activePanorama} onClose={() => setActivePanorama(null)} />
      )}
    </div>
  );
}

// ─── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="py-2 border-b border-white/10">
      <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-wider mb-0.5">
        {icon}
        {label}
      </div>
      <p className="text-white font-semibold text-lg leading-tight">{value}</p>
    </div>
  );
}
