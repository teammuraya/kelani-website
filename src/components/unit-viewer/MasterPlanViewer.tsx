'use client';

/**
 * MasterPlanViewer — full-screen viewer for the project master plan / site plan.
 * Shows phase zones on a canvas over a video/image.
 * Tapping/clicking a zone navigates to the phase page (or shows a phase popup on mobile).
 *
 * Mobile: canvas is full-screen with pinch zoom + tap-to-popup.
 * Desktop: left panel + bottom carousel.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Map, Images, Compass,
  X, ChevronRight as Chevron, Layers, ZoomIn, ArrowRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { PanoramaModal } from '@/components/unit-viewer/PanoramaModal';
import { useVideoDisplayArea } from '@/hooks/useVideoDisplayArea';

const ImmersiveCanvas = dynamic(
  () => import('@/components/canvas/ImmersiveCanvas').then(m => m.ImmersiveCanvas),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-950 animate-pulse" /> }
);

import type { CanvasZone, ZoneStatus } from '@/components/canvas/ImmersiveCanvas';

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaItem = { url: string; type: 'video' | 'image'; thumbnailUrl?: string; caption?: string; };
type Panorama  = { name: string; panoramaUrl: string; description?: string; initialView?: { yaw: number; pitch: number; fov: number }; };
type Phase     = { _id: string; name: string; slug: string; description?: string; thumbnail_url?: string; total_units?: number; };
type MasterPlanZone = {
  id: string; label: string;
  points: { x: number; y: number }[];
  phaseId?: string;
  status: 'available' | 'coming_soon' | 'sold_out';
};
type ProjectData = {
  _id: string; name: string; slug: string;
  tagline: string; description: string;
  location: string; price_from: number; status: string;
  image_url: string;
  master_plan_url?: string; master_plan_video_url?: string;
  master_plan_zones?: MasterPlanZone[];
  exterior_media?: MediaItem[]; gallery_media?: MediaItem[];
  panoramas?: Panorama[];
};

type Tab = 'sitemap' | 'gallery';

function formatPrice(p: number) {
  if (p >= 1_000_000) return `KES ${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000)     return `KES ${(p / 1_000).toFixed(0)}K`;
  return `KES ${p.toLocaleString()}`;
}

// ─── Phase popup (tapping a zone on mobile) ───────────────────────────────────

function PhasePopup({ phase, projectSlug, onClose }: {
  phase: Phase; projectSlug: string; onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="relative pointer-events-auto w-full md:w-[380px] md:mr-8 z-10 max-h-[60vh] md:max-h-none">
        <div className="bg-[#0f0f0f]/98 backdrop-blur-2xl border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[60vh] md:max-h-none">

          {/* Phase thumbnail */}
          <div className="relative h-32 md:h-44 w-full bg-gray-900 overflow-hidden">
            {phase.thumbnail_url ? (
              <img src={phase.thumbnail_url} alt={phase.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <Layers className="w-10 h-10 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f]/90 via-[#0f0f0f]/10 to-transparent" />
            <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white">
              <X className="w-4 h-4" />
            </button>
            <span className="absolute bottom-3 left-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-olive-500 text-white">
              Phase
            </span>
          </div>

          {/* Body */}
          <div className="p-5">
            <div className="mb-4">
              <div className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">Project Phase</div>
              <h3 className="text-white font-bold text-xl leading-tight">{phase.name}</h3>
              {phase.description && <p className="text-white/50 text-sm mt-1 line-clamp-2">{phase.description}</p>}
            </div>

            {phase.total_units && (
              <div className="bg-white/5 rounded-xl p-3 mb-4 border border-white/5 flex items-center justify-between">
                <span className="text-white/50 text-xs uppercase tracking-wider">Units</span>
                <span className="text-white font-bold text-lg">{phase.total_units}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Link
                href={`/projects/${projectSlug}/phases/${phase.slug}`}
                className="flex-1 bg-white text-gray-900 font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wide text-center flex items-center justify-center gap-1.5 hover:bg-gray-100"
                onClick={onClose}
              >
                Explore Phase <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/contact" className="px-5 py-3.5 bg-olive-500 hover:bg-olive-400 text-white font-bold rounded-2xl text-xs uppercase tracking-wide flex items-center justify-center">
                Enquire
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Thumb helpers ────────────────────────────────────────────────────────────

function PhaseThumb({ phase, isActive, onClick }: { phase: Phase; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all ${isActive ? 'ring-2 ring-white shadow-xl scale-105' : 'opacity-60 hover:opacity-90'}`}>
      {phase.thumbnail_url ? <img src={phase.thumbnail_url} alt={phase.name} className="w-full h-full object-cover" /> : (
        <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center gap-1">
          <Layers className="w-6 h-6 text-white/40" />
          <span className="text-[9px] text-white/40 text-center px-1 leading-tight">{phase.name}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-1 left-1 right-1 text-[9px] text-white/90 font-semibold truncate text-center">{phase.name}</div>
    </button>
  );
}

function MediaThumb({ media, isActive, onClick }: { media: MediaItem; isActive: boolean; onClick: () => void }) {
  const thumb = media.type === 'video' ? (media.thumbnailUrl || media.url) : media.url;
  return (
    <button onClick={onClick} className={`relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all ${isActive ? 'ring-2 ring-white shadow-xl scale-105' : 'opacity-60 hover:opacity-90'}`}>
      <img src={thumb} alt="" className="w-full h-full object-cover" />
    </button>
  );
}

function PanoramaPicker({ panoramas, onSelect, onClose }: { panoramas: Panorama[]; onSelect: (p: Panorama) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg p-6 z-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">360° Site Tour</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
        </div>
        <div className="space-y-2">
          {panoramas.map((p, i) => (
            <button key={i} onClick={() => onSelect(p)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold shrink-0">360°</div>
              <div className="flex-1 min-w-0"><p className="text-white font-medium">{p.name}</p>{p.description && <p className="text-white/50 text-sm truncate">{p.description}</p>}</div>
              <Chevron className="w-4 h-4 text-white/30 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Transform style helper ───────────────────────────────────────────────────

function makeTransformStyle(scale: number, tx: number, ty: number): React.CSSProperties {
  if (scale === 1 && tx === 0 && ty === 0) return {};
  return { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: '0 0', willChange: 'transform' };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MasterPlanViewer({ project, phases }: {
  project: ProjectData; phases: Phase[];
}) {
  const router = useRouter();

  // Refs for video display area calculation
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const videoDisplayArea = useVideoDisplayArea(videoRef, canvasContainerRef);

  const [tab,               setTab]               = useState<Tab>('sitemap');
  const [activePhaseIdx,    setActivePhaseIdx]     = useState(0);
  const [mediaIndex,        setMediaIndex]         = useState(0);
  const [highlightedZoneId, setHighlightedZoneId]  = useState<string | null>(null);
  const [selectedPhase,     setSelectedPhase]      = useState<Phase | null>(null);
  const [activePanorama,    setActivePanorama]      = useState<Panorama | null>(null);
  const [showPanoramaPicker, setShowPanoramaPicker] = useState(false);

  // Transparent-mode CSS transform
  const [tStyle, setTStyle] = useState<React.CSSProperties>({});
  const handleTransparentZoom = useCallback((scale: number, tx: number, ty: number) => {
    setTStyle(makeTransformStyle(scale, tx, ty));
  }, []);

  const hasMasterPlan  = !!(project.master_plan_url || project.master_plan_video_url);
  const hasMasterVideo = !!project.master_plan_video_url;
  const hasMasterImage = !!project.master_plan_url;

  const galleryMedia = useMemo(() => [
    ...(project.exterior_media ?? []),
    ...(project.gallery_media  ?? []),
  ], [project]);

  const hasPanoramas = (project.panoramas ?? []).length > 0;

  const canvasZones: CanvasZone[] = useMemo(() => (project.master_plan_zones ?? []).map(z => ({
    id: z.id, label: z.label, points: z.points,
    status: z.status as ZoneStatus,
    meta: { phaseId: z.phaseId },
  })), [project.master_plan_zones]);

  const handleZoneClick = useCallback((zone: CanvasZone) => {
    if (zone.meta?.phaseId) {
      const ph = phases.find(p => p._id === zone.meta!.phaseId);
      if (ph) {
        setSelectedPhase(ph);
        setHighlightedZoneId(zone.id);
        return;
      }
    }
    setHighlightedZoneId(zone.id);
  }, [phases]);

  const handlePopupClose = useCallback(() => {
    setSelectedPhase(null);
    setHighlightedZoneId(null);
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handlePopupClose(); };
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn);
  }, [handlePopupClose]);

  const currentMedia = galleryMedia[mediaIndex];
  const tabs = [
    { key: 'sitemap' as Tab, label: 'Site Plan', icon: <Map className="w-3.5 h-3.5" /> },
    { key: 'gallery' as Tab, label: 'Gallery',   icon: <Images className="w-3.5 h-3.5" /> },
  ];

  // ── Canvas layer ────────────────────────────────────────────────────────

  const renderSitemapCanvas = () => (
    <div className="absolute inset-0 overflow-hidden" ref={canvasContainerRef}>
      <div className="absolute inset-0" style={hasMasterVideo ? tStyle : {}}>
        {hasMasterVideo && (
          <video ref={videoRef} src={project.master_plan_video_url!} autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-contain" />
        )}
        {hasMasterImage && !hasMasterVideo && (
          <img src={project.master_plan_url!} alt={project.name}
            className="absolute inset-0 w-full h-full object-contain" />
        )}
        <div className="absolute inset-0 z-10">
          <ImmersiveCanvas
            imageUrl={hasMasterImage && !hasMasterVideo ? project.master_plan_url! : undefined}
            transparent={hasMasterVideo}
            zones={canvasZones}
            mode="view"
            onZoneClick={handleZoneClick}
            highlightedZoneId={highlightedZoneId}
            onTransparentZoom={handleTransparentZoom}
            videoDisplayArea={hasMasterVideo ? videoDisplayArea : undefined}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );

  const renderGalleryBg = () => {
    if (!currentMedia) return null;
    return currentMedia.type === 'image'
      ? <img src={currentMedia.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      : <video src={currentMedia.url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />;
  };

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen md:h-screen relative overflow-hidden flex flex-col bg-black">

      {/* ── MOBILE HEADER ─────────────────────────────────────────── */}
      <div className="relative z-30 bg-black/80 backdrop-blur-md border-b border-white/10 md:hidden pt-20">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href={`/projects/${project.slug}`}
              className="bg-white/20 backdrop-blur-xl border border-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Site Explorer</p>
              <h1 className="text-white font-bold text-sm uppercase tracking-wide truncate">{project.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); handlePopupClose(); }}
                className={`flex items-center gap-1.5 px-4 py-2 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all ${t.key === tab ? 'text-white border-white' : 'text-white/60 border-transparent'}`}>
                {t.icon} {t.label}
              </button>
            ))}
            {hasPanoramas && (
              <button onClick={() => setShowPanoramaPicker(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-white/60 border-b-2 border-transparent">
                <Compass className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE CANVAS — full height below header ──────────────── */}
      <div className="relative md:hidden flex-1" style={{ minHeight: 'calc(100vh - 160px)' }}>

        {tab === 'sitemap' && hasMasterPlan && renderSitemapCanvas()}

        {tab === 'sitemap' && !hasMasterPlan && (
          <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center gap-4 p-8">
            <Map className="w-12 h-12 text-white/20" />
            <p className="text-white/40 text-sm text-center">No site plan uploaded yet</p>
            <div className="space-y-2 w-full max-w-xs">
              {phases.map(ph => (
                <Link key={ph._id} href={`/projects/${project.slug}/phases/${ph.slug}`}
                  className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <Layers className="w-5 h-5 text-white/40 shrink-0" />
                  <span className="text-white text-sm font-medium flex-1 truncate">{ph.name}</span>
                  <Chevron className="w-4 h-4 text-white/30" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {tab === 'gallery' && (
          <div className="absolute inset-0">
            {renderGalleryBg()}
            {galleryMedia.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3">
                <button onClick={() => setMediaIndex(i => (i - 1 + galleryMedia.length) % galleryMedia.length)}
                  className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-1.5">
                  {galleryMedia.slice(0, 8).map((_, i) => (
                    <button key={i} onClick={() => setMediaIndex(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === mediaIndex ? 'bg-white scale-125' : 'bg-white/40'}`} />
                  ))}
                </div>
                <button onClick={() => setMediaIndex(i => (i + 1) % galleryMedia.length)}
                  className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pinch hint */}
        {tab === 'sitemap' && hasMasterPlan && canvasZones.length > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm text-white/70 text-[10px] px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
              <ZoomIn className="w-3 h-3" /> Pinch to zoom · Tap a zone
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE Phase list strip (when no popup) ───────────────── */}
      {!selectedPhase && tab === 'sitemap' && phases.length > 0 && (
        <div className="md:hidden bg-black border-t border-white/10 overflow-x-auto">
          <div className="flex gap-3 px-4 py-3">
            {phases.map((ph, i) => (
              <PhaseThumb key={ph._id} phase={ph} isActive={i === activePhaseIdx}
                onClick={() => { setActivePhaseIdx(i); setSelectedPhase(ph); setHighlightedZoneId(canvasZones.find(z => z.meta?.phaseId === ph._id)?.id ?? null); }} />
            ))}
          </div>
        </div>
      )}

      {/* ── DESKTOP: Full-screen background ──────────────────────────── */}
      <div className="hidden md:block absolute inset-0">
        {tab === 'sitemap' && hasMasterPlan ? renderSitemapCanvas()
          : tab === 'gallery' && galleryMedia.length > 0 ? (
            <>{renderGalleryBg()}<div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent pointer-events-none z-[5]" /></>
          ) : (
            <><img src={project.image_url} alt={project.name} className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent pointer-events-none" /></>
          )}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent pointer-events-none z-[5]" />
      </div>

      {/* ── DESKTOP: Back ─────────────────────────────────────────────── */}
      <div className="hidden md:block absolute top-28 left-8 z-30">
        <Link href={`/projects/${project.slug}`}
          className="bg-white/90 hover:bg-white text-gray-800 rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs uppercase tracking-wide font-semibold">{project.name}</span>
        </Link>
      </div>

      {/* ── DESKTOP: Left panel ────────────────────────────────────────── */}
      <div className="hidden md:block absolute top-40 left-8 z-30 w-[340px]">
        <div className="space-y-5">
          <div>
            <div className="text-white/50 text-[9px] uppercase tracking-wider mb-1">{project.location}</div>
            <div className="text-white text-6xl font-bold tracking-tight leading-none">Site Plan</div>
            <div className="text-white/40 text-sm mt-1">{project.tagline}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-white/50 text-[9px] uppercase">Phases</div><div className="text-white text-2xl font-bold">{phases.length}</div></div>
            <div><div className="text-white/50 text-[9px] uppercase">From</div><div className="text-white text-2xl font-bold">{formatPrice(project.price_from)}</div></div>
          </div>
          {phases.length > 0 && (
            <div className="space-y-0.5 pt-2">
              <div className="text-white/50 text-[9px] uppercase tracking-wider mb-2">Phases</div>
              {phases.map(ph => (
                <Link key={ph._id} href={`/projects/${project.slug}/phases/${ph.slug}`}
                  onMouseEnter={() => setHighlightedZoneId(canvasZones.find(z => z.meta?.phaseId === ph._id)?.id ?? null)}
                  onMouseLeave={() => selectedPhase?._id !== ph._id && setHighlightedZoneId(null)}
                  className="flex items-center gap-3 py-2.5 border-b border-white/10 hover:border-white/30 group transition-all">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 shrink-0 overflow-hidden">
                    {ph.thumbnail_url ? <img src={ph.thumbnail_url} alt={ph.name} className="w-full h-full object-cover" /> : <Layers className="w-4 h-4 text-white/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-semibold">{ph.name}</div>
                    {ph.total_units && <div className="text-white/40 text-[10px]">{ph.total_units} units</div>}
                  </div>
                  <Chevron className="w-4 h-4 text-white/30 group-hover:text-white/70" />
                </Link>
              ))}
            </div>
          )}
          <div className="space-y-2 pt-2">
            {hasPanoramas && (
              <button onClick={() => setShowPanoramaPicker(true)}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                <Compass className="w-4 h-4" /> 360° Site Tour
              </button>
            )}
            <Link href="/contact" className="block text-center w-full bg-olive-500 hover:bg-olive-400 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-xs">
              Enquire Now
            </Link>
          </div>
        </div>
      </div>

      {/* ── DESKTOP: Bottom nav ────────────────────────────────────────── */}
      <div className="hidden md:block absolute bottom-8 left-0 right-0 z-30">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {tabs.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); handlePopupClose(); }}
                className={`flex items-center gap-1.5 px-6 py-2 font-semibold text-sm uppercase tracking-wider border-b-2 transition-all ${t.key === tab ? 'text-white border-white' : 'text-white/70 hover:text-white border-transparent'}`}>
                {t.icon} {t.label}
              </button>
            ))}
            {hasPanoramas && (
              <button onClick={() => setShowPanoramaPicker(true)}
                className="flex items-center gap-1.5 px-6 py-2 font-semibold text-sm uppercase tracking-wider text-white/70 hover:text-white border-b-2 border-transparent">
                <Compass className="w-3.5 h-3.5" /> Tour
              </button>
            )}
          </div>
          {tab === 'sitemap' && phases.length > 0 && (
            <div className="flex items-center gap-4">
              <button onClick={() => setActivePhaseIdx(i => Math.max(0, i - 1))} className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center"><ChevronLeft className="w-6 h-6" /></button>
              <div className="flex items-center gap-3">
                {phases.slice(0, 6).map((ph, i) => (
                  <PhaseThumb key={ph._id} phase={ph} isActive={i === activePhaseIdx}
                    onClick={() => { setActivePhaseIdx(i); router.push(`/projects/${project.slug}/phases/${ph.slug}`); }} />
                ))}
              </div>
              <button onClick={() => setActivePhaseIdx(i => Math.min(phases.length - 1, i + 1))} className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center"><ChevronRight className="w-6 h-6" /></button>
            </div>
          )}
          {tab === 'gallery' && galleryMedia.length > 0 && (
            <div className="flex items-center gap-4">
              <button onClick={() => setMediaIndex(i => (i - 1 + galleryMedia.length) % galleryMedia.length)} className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center"><ChevronLeft className="w-6 h-6" /></button>
              <div className="flex items-center gap-3">{galleryMedia.slice(0, 6).map((m, i) => <MediaThumb key={i} media={m} isActive={i === mediaIndex} onClick={() => setMediaIndex(i)} />)}</div>
              <button onClick={() => setMediaIndex(i => (i + 1) % galleryMedia.length)} className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center"><ChevronRight className="w-6 h-6" /></button>
            </div>
          )}
        </div>
      </div>

      {/* ── Phase popup — fixed overlay (mobile + desktop) ─────────────── */}
      {selectedPhase && (
        <PhasePopup phase={selectedPhase} projectSlug={project.slug} onClose={handlePopupClose} />
      )}

      {/* ── Panorama modals ────────────────────────────────────────────── */}
      {showPanoramaPicker && hasPanoramas && (
        <PanoramaPicker panoramas={project.panoramas!}
          onSelect={p => { setActivePanorama(p); setShowPanoramaPicker(false); }}
          onClose={() => setShowPanoramaPicker(false)} />
      )}
      {activePanorama && <PanoramaModal panorama={activePanorama} onClose={() => setActivePanorama(null)} />}
    </div>
  );
}
