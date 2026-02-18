'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Bed,
  Maximize,
  Calendar,
  Check,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  Play,
  Loader2,
  X,
  Maximize2,
  Building2,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import {
  AfricanDividerLight,
  AfricanSectionOverlay,
} from '@/components/AfricanPatterns';
import { MainVideo, TransitionVideo, isEmbedUrl } from '@/components/unit-viewer/VideoPlayer';
import { useVideoTransition } from '@/components/unit-viewer/useVideoTransition';
import { PanoramaModal } from '@/components/unit-viewer/PanoramaModal';
import { FloorPlanModal } from '@/components/unit-viewer/FloorPlanModal';

// ─── Types ─────────────────────────────────────────────────────────────────────

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

type Category = 'exterior' | 'interior' | 'gallery';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-KE').format(price);
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    ongoing: 'bg-olive-500 text-white',
    upcoming: 'bg-amber-500 text-white',
    completed: 'bg-emerald-600 text-white',
  };
  return styles[status] || 'bg-gray-200 text-gray-700';
}

// ─── Thumbnail ─────────────────────────────────────────────────────────────────

function Thumbnail({
  media,
  isActive,
  fallback,
  onClick,
}: {
  media: MediaItem;
  isActive: boolean;
  fallback: string;
  onClick: () => void;
}) {
  const thumb = media.type === 'video' ? (media.thumbnailUrl || fallback) : media.url;
  return (
    <button
      onClick={onClick}
      className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 transition-all duration-300 ${
        isActive
          ? 'ring-2 ring-white shadow-lg scale-105'
          : 'opacity-50 hover:opacity-80'
      }`}
    >
      <img src={thumb} alt="" className="w-full h-full object-cover" />
      {media.type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
}

// ─── Panorama Picker ────────────────────────────────────────────────────────────

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">360° Project Tour</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
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

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();

  const project = useQuery(api.projects.getBySlug, { slug: slug ?? '' });
  const related = useQuery(api.projects.getRelated, { slug: slug ?? '' });
  const loading = project === undefined;

  const [category, setCategory] = useState<Category>('exterior');
  const [mediaIndex, setMediaIndex] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isTransitionFading, setIsTransitionFading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePanorama, setActivePanorama] = useState<Panorama | null>(null);
  const [showPanoramaPicker, setShowPanoramaPicker] = useState(false);
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  // Determine if project has rich media
  const hasRichMedia = useMemo(() => {
    if (!project) return false;
    return (
      (project.exterior_media?.filter((m: any) => !m.isTransition).length ?? 0) > 0 ||
      (project.interior_media?.filter((m: any) => !m.isTransition).length ?? 0) > 0 ||
      (project.gallery_media?.filter((m: any) => !m.isTransition).length ?? 0) > 0
    );
  }, [project]);

  // ── Media for the selected category ──
  const getCategoryMedia = useCallback((): MediaItem[] => {
    if (!project) return [];
    let items: MediaItem[] =
      category === 'exterior'
        ? (project.exterior_media as MediaItem[] ?? [])
        : category === 'interior'
        ? (project.interior_media as MediaItem[] ?? [])
        : (project.gallery_media as MediaItem[] ?? []);

    const main = items
      .filter((m) => !m.isTransition)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    // Fallback to legacy gallery array
    if (main.length === 0 && category === 'gallery' && (project.gallery ?? []).length > 0) {
      return project.gallery.map((url: string) => ({ url, type: 'image' as const }));
    }
    if (main.length === 0 && category === 'exterior' && project.image_url) {
      return [{ url: project.image_url, type: 'image' as const }];
    }
    return main;
  }, [project, category]);

  const allRaw = useMemo(() => {
    if (!project) return [];
    return category === 'exterior'
      ? (project.exterior_media as MediaItem[] ?? [])
      : category === 'interior'
      ? (project.interior_media as MediaItem[] ?? [])
      : (project.gallery_media as MediaItem[] ?? []);
  }, [project, category]);

  const categoryMedia = useMemo(() => getCategoryMedia(), [getCategoryMedia]);
  const transitionMedia = useMemo(() => allRaw.filter((m) => m.isTransition), [allRaw]);
  const currentMedia = categoryMedia[mediaIndex] ?? { url: project?.image_url ?? '', type: 'image' as const };
  const fallbackThumb = project?.image_url ?? '';

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
  } = useVideoTransition(transitionMedia, handleTransitionComplete);

  // ── Reset on category change ──
  useEffect(() => {
    setMediaIndex(0);
    setIsVideoReady(false);
    setIsTransitionFading(false);
    cancelTransition();
  }, [category, cancelTransition]);

  // ── Navigation ──
  const navigateTo = useCallback(
    (toIndex: number) => {
      if (toIndex === mediaIndex) return;
      const from = categoryMedia[mediaIndex];
      const to = categoryMedia[toIndex];
      if (from?.type === 'video' && to?.type === 'video') {
        if (startTransition(mediaIndex, toIndex)) return;
      }
      setMediaIndex(toIndex);
    },
    [mediaIndex, categoryMedia, startTransition]
  );

  const next = useCallback(() => {
    if (categoryMedia.length > 0) navigateTo((mediaIndex + 1) % categoryMedia.length);
  }, [categoryMedia.length, mediaIndex, navigateTo]);

  const prev = useCallback(() => {
    if (categoryMedia.length > 0)
      navigateTo((mediaIndex - 1 + categoryMedia.length) % categoryMedia.length);
  }, [categoryMedia.length, mediaIndex, navigateTo]);

  // ── Keyboard ──
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') {
        if (showFloorPlan) { setShowFloorPlan(false); return; }
        if (showPanoramaPicker) { setShowPanoramaPicker(false); return; }
        if (activePanorama) { setActivePanorama(null); return; }
        if (isFullscreen) setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [prev, next, isFullscreen, showFloorPlan, showPanoramaPicker, activePanorama]);

  // ── Loading / not found ──
  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-olive-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex flex-col items-center justify-center text-white gap-6">
        <h2 className="font-display text-3xl">Project not found</h2>
        <Link
          href="/projects"
          className="px-6 py-3 bg-olive-500 rounded-full text-sm font-medium hover:bg-olive-400"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  const hasPanoramas = (project.panoramas ?? []).length > 0;
  const cats: Category[] = ['exterior', 'interior', 'gallery'];

  // ─────────────────────────────────────────────────────────────────────────────
  // Fullscreen modal
  // ─────────────────────────────────────────────────────────────────────────────
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
          className="absolute top-4 right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <button onClick={prev} className="absolute left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white">
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
            <img src={currentMedia.url} alt={project.name} className="w-full h-full object-contain" />
          )}
        </div>
        <button onClick={next} className="absolute right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white">
          <ChevronRight className="w-6 h-6" />
        </button>
        {/* Bottom nav in fullscreen */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center gap-4">
          <div className="flex items-center gap-1">
            {cats.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-5 py-2 text-sm font-semibold uppercase tracking-wider transition-all ${
                  category === cat ? 'text-white border-b-2 border-white' : 'text-white/50 hover:text-white border-b-2 border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {categoryMedia.slice(0, 7).map((m, i) => (
              <Thumbnail key={i} media={m} isActive={i === mediaIndex} fallback={fallbackThumb} onClick={() => navigateTo(i)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main render — RICH MEDIA mode vs LEGACY mode
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-charcoal-900 min-h-screen">

      {/* ══════════════════════════════════════════════════════════════
          IMMERSIVE MEDIA HERO (when rich media exists)
      ══════════════════════════════════════════════════════════════ */}
      {hasRichMedia ? (
        <div className="min-h-screen md:h-screen relative overflow-hidden flex flex-col bg-black">

          {/* ─ Mobile Header ─ */}
          <div className="relative z-30 bg-black/80 backdrop-blur-md border-b border-white/10 md:hidden pt-20">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href="/projects"
                  className="bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-white font-bold text-sm">{project.name}</h1>
              </div>
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

          {/* ─ Full-screen video/image area ─ */}
          <div className="relative h-[50vh] md:h-screen md:absolute md:inset-0">
            {(isPlayingTransition || isTransitionFading) && transitionVideo && (
              <TransitionVideo
                video={transitionVideo}
                className="absolute inset-0 w-full h-full object-cover z-[5]"
                onEnded={completeTransition}
                onError={handleTransitionError}
              />
            )}
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
                alt={project.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 md:hidden pointer-events-none z-10" />
            <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/85 via-black/20 via-30% to-transparent pointer-events-none z-10" />

            {/* Mobile action buttons */}
            <div className="md:hidden absolute bottom-3 right-3 flex gap-2 z-20">
              <button onClick={() => setIsFullscreen(true)} className="bg-black/60 text-white rounded-xl w-10 h-10 flex items-center justify-center">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ─ Desktop: Back button ─ */}
          <div className="hidden md:block absolute top-28 left-8 z-30">
            <Link
              href="/projects"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-semibold uppercase tracking-wider rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
              All Projects
            </Link>
          </div>

          {/* ─ Desktop: Fullscreen button ─ */}
          <div className="hidden md:flex absolute top-28 right-8 z-30 gap-2">
            <button
              onClick={() => setIsFullscreen(true)}
              className="px-4 py-2.5 bg-white/90 hover:bg-white text-gray-800 text-xs font-bold uppercase tracking-widest rounded-full flex items-center gap-2 shadow-lg"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Fullscreen
            </button>
          </div>

          {/* ─ Desktop: Left info panel ─ */}
          <div className="hidden md:block absolute top-40 left-8 z-30 w-[320px] max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            <div className="space-y-4">
              {/* Status & location */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge(project.status)}`}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </span>
                <span className="text-white/40 text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {project.location}
                </span>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-white text-5xl font-bold tracking-tight leading-none">
                  {project.name.split(' ')[0]}
                </h1>
                <p className="text-white/60 text-sm mt-1">{project.tagline}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-0">
                {[
                  { label: 'Starting From', value: `KES ${formatPrice(project.price_from)}` },
                  { label: 'Bedrooms', value: `${project.bedrooms_min}–${project.bedrooms_max}` },
                  { label: 'Area', value: `${project.area_from.toLocaleString()}–${project.area_to.toLocaleString()} sqft` },
                  { label: 'Completion', value: project.completion_date },
                ].map(({ label, value }) => (
                  <div key={label} className="py-2 border-b border-white/10">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-white font-semibold text-sm">{value}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {project.floor_plan_url && (
                  <button
                    onClick={() => setShowFloorPlan(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-xl transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    Floor Plan
                  </button>
                )}
                {hasPanoramas && (
                  <button
                    onClick={() => setShowPanoramaPicker(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-xl transition-all"
                  >
                    <Compass className="w-4 h-4" />
                    360° Tour
                  </button>
                )}
                <Link
                  href={`/projects/${slug}/units`}
                  className="block text-center px-4 py-3 bg-olive-500 hover:bg-olive-400 text-white text-sm font-bold rounded-xl transition-all"
                >
                  Explore Units & Take Tour →
                </Link>
              </div>
            </div>
          </div>

          {/* ─ Desktop: Bottom navigation ─ */}
          <div className="hidden md:block absolute bottom-8 left-0 right-0 z-30">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-1">
                {cats.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-5 py-2 text-sm font-semibold uppercase tracking-wider transition-all relative ${
                      category === cat ? 'text-white' : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    {cat}
                    {category === cat && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Thumbnails */}
              {categoryMedia.length > 0 && (
                <div className="flex items-center gap-3">
                  <button onClick={prev} className="w-10 h-10 rounded-full text-white hover:bg-white/10 flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    {categoryMedia.slice(0, 7).map((m, i) => (
                      <Thumbnail key={`${category}-${i}`} media={m} isActive={i === mediaIndex} fallback={fallbackThumb} onClick={() => navigateTo(i)} />
                    ))}
                  </div>
                  <button onClick={next} className="w-10 h-10 rounded-full text-white hover:bg-white/10 flex items-center justify-center">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {isPlayingTransition && (
                <div className="flex items-center gap-2 text-white/50 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading next view…
                </div>
              )}
            </div>
          </div>

          {/* ─ Mobile: thumbnail strip ─ */}
          <div className="md:hidden relative z-20 -mt-6">
            <div className="mx-4 p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl">
              <div className="flex items-center gap-2 overflow-x-auto">
                {categoryMedia.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => navigateTo(i)}
                    className={`relative w-14 h-12 rounded-xl overflow-hidden shrink-0 transition-all ${i === mediaIndex ? 'ring-2 ring-white' : 'opacity-50'}`}
                  >
                    <img
                      src={m.type === 'video' ? (m.thumbnailUrl || fallbackThumb) : m.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─ Mobile: info card + take tour CTA ─ */}
          <div className="md:hidden bg-black px-4 pt-4 pb-6 space-y-4">
            <div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge(project.status)}`}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </span>
              <h1 className="text-white text-4xl font-bold mt-2">{project.name}</h1>
              <p className="text-white/50 text-sm mt-1">{project.tagline}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-white/40 text-xs">From</p><p className="text-white font-bold">KES {formatPrice(project.price_from)}</p></div>
              <div><p className="text-white/40 text-xs">Beds</p><p className="text-white font-bold">{project.bedrooms_min}–{project.bedrooms_max}</p></div>
            </div>
            <div className="space-y-2">
              {hasPanoramas && (
                <button onClick={() => setShowPanoramaPicker(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-xl">
                  <Compass className="w-4 h-4" /> 360° Tour
                </button>
              )}
              <Link href={`/projects/${slug}/units`} className="block text-center py-3 bg-olive-500 hover:bg-olive-400 text-white text-sm font-bold rounded-xl">
                Explore Units & Take Tour →
              </Link>
            </div>
          </div>
        </div>

      ) : (
        /* ══════════════════════════════════════════════════════════════
           LEGACY HERO (no rich media — image gallery fallback)
        ══════════════════════════════════════════════════════════════ */
        <>
          <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
            <img
              src={project.image_url}
              alt={project.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/30 to-charcoal-900/20" />
            <div className="absolute top-28 left-0 right-0 z-10 max-w-7xl mx-auto px-6 lg:px-8">
              <Link href="/projects" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm">
                <ArrowLeft className="w-4 h-4" />
                Back to Projects
              </Link>
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-10 max-w-7xl mx-auto px-6 lg:px-8 pb-12">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`px-4 py-1.5 rounded-full text-xs font-medium ${statusBadge(project.status)}`}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </span>
                <span className="text-white/50 text-sm flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {project.location}, {project.country}
                </span>
              </div>
              <h1 className="font-display text-4xl md:text-6xl text-white font-semibold mb-3">
                {project.name}
              </h1>
              <p className="text-white/60 text-lg max-w-2xl">{project.tagline}</p>
            </div>
          </section>

          {/* Legacy gallery thumbnails */}
          {project.gallery.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 lg:px-8 -mt-6 relative z-20">
              <div className="flex gap-3 overflow-x-auto pb-4">
                {[project.image_url, ...project.gallery].map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setMediaIndex(i)}
                    className={`shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                      mediaIndex === i ? 'border-olive-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ABOUT SECTION (always shown)
      ══════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 lg:py-28 relative">
        <AfricanSectionOverlay variant="light" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2">
              <h2 className="font-display text-3xl text-charcoal-900 font-semibold mb-6">About This Project</h2>
              <p className="text-charcoal-700/60 leading-relaxed text-base whitespace-pre-line">{project.description}</p>

              {project.amenities.length > 0 && (
                <div className="mt-12">
                  <h3 className="font-display text-2xl text-charcoal-900 font-semibold mb-6">Amenities & Features</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {project.amenities.map((amenity: string) => (
                      <div key={amenity} className="flex items-center gap-3 px-4 py-3 bg-sand-50 rounded-xl">
                        <div className="w-6 h-6 rounded-full bg-olive-500/10 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-olive-500" />
                        </div>
                        <span className="text-charcoal-900 text-sm font-medium">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Project Details card */}
            <div>
              <div className="bg-sand-50 rounded-2xl p-8 sticky top-28">
                <h3 className="font-display text-xl text-charcoal-900 font-semibold mb-6">Project Details</h3>
                <div className="space-y-5">
                  {[
                    { label: 'Starting From', value: `KES ${formatPrice(project.price_from)}` },
                    { label: 'Bedrooms', value: `${project.bedrooms_min} - ${project.bedrooms_max}` },
                    { label: 'Area', value: `${project.area_from.toLocaleString()} - ${project.area_to.toLocaleString()} sqft` },
                    { label: 'Completion', value: project.completion_date },
                    { label: 'Location', value: project.location },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-3 border-b border-sand-200">
                      <span className="text-charcoal-700/50 text-sm">{label}</span>
                      <span className="text-charcoal-900 font-semibold text-right text-sm">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Floor Plan & Panorama */}
                {(project.floor_plan_url || hasPanoramas) && (
                  <div className="mt-6 space-y-2">
                    {project.floor_plan_url && (
                      <button
                        onClick={() => setShowFloorPlan(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-charcoal-900 text-white text-sm font-medium rounded-full hover:bg-charcoal-800 transition-all"
                      >
                        <FileText className="w-4 h-4" />
                        View Floor Plan
                      </button>
                    )}
                    {hasPanoramas && (
                      <button
                        onClick={() => setShowPanoramaPicker(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-charcoal-900 text-white text-sm font-medium rounded-full hover:bg-charcoal-800 transition-all"
                      >
                        <Compass className="w-4 h-4" />
                        360° Virtual Tour
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  {/* Take Tour CTA */}
                  <Link
                    href={`/projects/${slug}/units`}
                    className="block text-center px-6 py-3.5 bg-olive-500 text-white text-sm font-bold rounded-full hover:bg-olive-400 transition-all flex items-center justify-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    Explore Units & Take Tour
                  </Link>
                  <Link
                    href="/contact"
                    className="block text-center px-6 py-3.5 bg-charcoal-900 text-white text-sm font-medium rounded-full hover:bg-charcoal-800 transition-all"
                  >
                    Inquire About This Project
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AfricanDividerLight />

      {/* ── Take Tour Call-to-Action Banner ── */}
      <section className="bg-charcoal-900 py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-olive-900/30 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-display text-3xl md:text-4xl text-white font-semibold mb-4">
            Ready to Explore?
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto mb-8">
            Browse available units, view virtual tours, and explore 360° panoramas of {project.name}.
          </p>
          <Link
            href={`/projects/${slug}/units`}
            className="inline-flex items-center gap-3 px-8 py-4 bg-olive-500 hover:bg-olive-400 text-white font-bold text-sm uppercase tracking-widest rounded-full transition-all shadow-xl"
          >
            <Building2 className="w-5 h-5" />
            Browse Units & Take Tour
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── Legacy Gallery Section (if project.gallery has items & no rich gallery_media) ── */}
      {project.gallery.length > 0 && (project.gallery_media ?? []).filter((m: any) => !m.isTransition).length === 0 && (
        <section className="bg-sand-100 py-20 lg:py-28 relative">
          <AfricanSectionOverlay variant="light" />
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="font-display text-3xl text-charcoal-900 font-semibold mb-10">Gallery</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {project.gallery.map((img: string, i: number) => (
                <div key={i} className="rounded-2xl overflow-hidden h-[280px] group cursor-pointer">
                  <img
                    src={img}
                    alt={`${project.name} gallery ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Related Projects ── */}
      {related && related.length > 0 && (
        <section className="bg-white py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <h2 className="font-display text-3xl text-charcoal-900 font-semibold">Other Projects</h2>
              <Link href="/projects" className="text-olive-500 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {related.map((p: any) => (
                <Link
                  key={p._id}
                  href={`/projects/${p.slug}`}
                  className="group relative block rounded-2xl overflow-hidden h-[400px]"
                >
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <p className="text-white/50 text-sm mb-1">{p.location}</p>
                    <h3 className="text-white font-display text-2xl font-semibold mb-2">{p.name}</h3>
                    <p className="text-white/60 text-sm">{p.tagline}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ MODALS ══ */}
      {showFloorPlan && project.floor_plan_url && (
        <FloorPlanModal url={project.floor_plan_url} onClose={() => setShowFloorPlan(false)} />
      )}
      {showPanoramaPicker && hasPanoramas && (
        <PanoramaPicker
          panoramas={project.panoramas as Panorama[]}
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
