'use client';

/**
 * PhaseViewer
 * Full-screen viewer for a project phase.
 * Shows unit zones on a canvas (overlaid on a video or image).
 * Clicking a unit zone zooms in smoothly and shows a unit detail popup.
 *
 * Hierarchy: Project → Master Plan → [this page] → Unit
 */

import React, {
  useState, useMemo, useRef, useCallback, useEffect,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Map, Images, Compass,
  X, ChevronRight as Chevron, Home, ArrowRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { PanoramaModal } from '@/components/unit-viewer/PanoramaModal';

const ImmersiveCanvas = dynamic(
  () => import('@/components/canvas/ImmersiveCanvas').then(m => m.ImmersiveCanvas),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-950 animate-pulse" /> }
);

import type { CanvasZone, ZoneStatus, ImmersiveCanvasRef } from '@/components/canvas/ImmersiveCanvas';

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaItem = {
  url: string; type: 'video' | 'image';
  thumbnailUrl?: string; caption?: string;
};
type Panorama = {
  name: string; panoramaUrl: string; description?: string;
  initialView?: { yaw: number; pitch: number; fov: number };
};
type Unit = {
  _id: string; name: string; slug: string;
  bedrooms: number; bathrooms: number;
  area_sqft: number; price: number;
  status: 'available' | 'reserved' | 'sold';
  unit_type?: string; thumbnail_url?: string;
  banner_image_url?: string;
  floor_number?: number; description?: string;
};
type PhaseUnitZone = {
  id: string; label: string;
  points: { x: number; y: number }[];
  unitId?: string;
  status: 'available' | 'reserved' | 'sold';
};
type PhaseData = {
  _id: string; name: string; slug: string;
  description?: string; thumbnail_url?: string;
  phase_plan_url?: string;
  phase_plan_video_url?: string;
  phase_unit_zones?: PhaseUnitZone[];
  exterior_media?: MediaItem[];
  gallery_media?: MediaItem[];
  panoramas?: Panorama[];
  total_units?: number;
};

type Tab = 'phase-plan' | 'gallery';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(p: number) {
  if (p >= 1_000_000) return `KES ${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000)     return `KES ${(p / 1_000).toFixed(0)}K`;
  return `KES ${p.toLocaleString()}`;
}

function statusColor(s: string) {
  if (s === 'available') return 'bg-emerald-500 text-white';
  if (s === 'reserved')  return 'bg-amber-500 text-white';
  return 'bg-gray-500 text-white';
}

// ─── Unit popup ───────────────────────────────────────────────────────────────

function UnitPopup({ unit, phaseSlug, projectSlug, onClose, onExplore }: {
  unit: Unit; phaseSlug: string; projectSlug: string;
  onClose: () => void; onExplore: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-end md:items-center justify-end pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onClose} />

      {/* Popup card — slides up from bottom on mobile, right-anchored on desktop */}
      <div className="relative pointer-events-auto w-full md:w-[360px] md:max-w-[360px] md:mr-8 z-10 flex flex-col">
        <div className="bg-[#0f0f0f]/95 backdrop-blur-2xl border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">

          {/* ── Hero image banner ── */}
          <div className="relative h-48 md:h-52 w-full bg-gray-900 overflow-hidden">
            {(unit.banner_image_url || unit.thumbnail_url) ? (
              <img
                src={unit.banner_image_url || unit.thumbnail_url}
                alt={unit.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <Home className="w-10 h-10 text-white/20" />
              </div>
            )}
            {/* gradient fade into card body */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f]/90 via-[#0f0f0f]/20 to-transparent" />

            {/* close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
            >
              <X className="w-4 h-4" />
            </button>

            {/* status badge overlaid on image */}
            <span className={`absolute bottom-3 left-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusColor(unit.status)}`}>
              {unit.status}
            </span>
          </div>

          {/* ── Card body ── */}
          <div className="p-5">
            {/* Name + type */}
            <div className="mb-4">
              <div className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">{unit.unit_type ?? 'Unit'}</div>
              <h3 className="text-white font-bold text-xl leading-tight">{unit.name}</h3>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Beds',  value: `${unit.bedrooms}BR` },
                { label: 'Baths', value: `${unit.bathrooms}BA` },
                { label: 'Area',  value: `${unit.area_sqft >= 1000 ? `${(unit.area_sqft/1000).toFixed(1)}K` : unit.area_sqft} ft²` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                  <div className="text-white/40 text-[9px] uppercase tracking-wider">{label}</div>
                  <div className="text-white font-bold text-sm mt-0.5">{value}</div>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-white/40 text-[9px] uppercase tracking-wider">Price</div>
                <div className="text-white font-bold text-2xl">{formatPrice(unit.price)}</div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex gap-2">
              <Link
                href={`/projects/${projectSlug}/units/${unit.slug}`}
                className="flex-1 bg-white text-gray-900 font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wide text-center flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors"
                onClick={onExplore}
              >
                Explore Unit <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/contact"
                className="px-5 py-3.5 bg-olive-500 hover:bg-olive-400 text-white font-bold rounded-2xl text-xs uppercase tracking-wide flex items-center justify-center transition-colors"
              >
                Enquire
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Unit thumbnail (bottom carousel) ────────────────────────────────────────

function UnitThumb({ unit, isActive, onClick }: {
  unit: Unit; isActive: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`relative w-24 h-20 rounded-lg overflow-hidden transition-all flex-shrink-0 ${
        isActive ? 'ring-2 ring-white shadow-xl scale-105' : 'opacity-60 hover:opacity-90'
      }`}
    >
      {unit.thumbnail_url ? (
        <img src={unit.thumbnail_url} alt={unit.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center gap-1">
          <Home className="w-5 h-5 text-white/40" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-1 left-1 right-1 text-[9px] text-white/90 font-semibold truncate text-center">
        {unit.name}
      </div>
    </button>
  );
}

function MediaThumb({ media, isActive, onClick }: {
  media: MediaItem; isActive: boolean; onClick: () => void;
}) {
  const thumbUrl = media.type === 'video' ? (media.thumbnailUrl || media.url) : media.url;
  return (
    <button onClick={onClick}
      className={`relative w-24 h-20 rounded-lg overflow-hidden transition-all flex-shrink-0 ${
        isActive ? 'ring-2 ring-white shadow-xl scale-105' : 'opacity-60 hover:opacity-90'
      }`}
    >
      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
    </button>
  );
}

function PanoramaPicker({ panoramas, onSelect, onClose }: {
  panoramas: Panorama[]; onSelect: (p: Panorama) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg p-6 z-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">360° Phase Tour</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="space-y-2">
          {panoramas.map((p, i) => (
            <button key={i} onClick={() => onSelect(p)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">360°</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{p.name}</p>
                {p.description && <p className="text-white/50 text-sm truncate">{p.description}</p>}
              </div>
              <Chevron className="w-4 h-4 text-white/30 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main PhaseViewer ─────────────────────────────────────────────────────────

export default function PhaseViewer({ phase, units, projectSlug, projectName }: {
  phase: PhaseData;
  units: Unit[];
  projectSlug: string;
  projectName: string;
}) {
  const router = useRouter();
  const canvasRef = useRef<ImmersiveCanvasRef>(null);

  const [tab, setTab]                   = useState<Tab>('phase-plan');
  const [mediaIndex, setMediaIndex]     = useState(0);
  const [highlightedZoneId, setHighlightedZoneId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [activePanorama, setActivePanorama] = useState<Panorama | null>(null);
  const [showPanoramaPicker, setShowPanoramaPicker] = useState(false);

  // CSS zoom state for transparent-mode canvas (video + canvas scale together)
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});

  const handleTransparentZoom = useCallback(
    (scale: number, originX: number, originY: number) => {
      setZoomStyle(
        scale === 1
          ? {}
          : {
              transform: `scale(${scale})`,
              transformOrigin: `${originX}% ${originY}%`,
              transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
            }
      );
    },
    []
  );

  const hasPhasePlan  = !!(phase.phase_plan_url || phase.phase_plan_video_url);
  const hasPlanImage  = !!phase.phase_plan_url;
  const hasPlanVideo  = !!phase.phase_plan_video_url;

  const galleryMedia: MediaItem[] = useMemo(() => [
    ...(phase.exterior_media ?? []),
    ...(phase.gallery_media  ?? []),
  ], [phase]);

  const hasPanoramas = (phase.panoramas ?? []).length > 0;

  // Build canvas zones
  const canvasZones: CanvasZone[] = useMemo(() => {
    if (!phase.phase_unit_zones) return [];
    return phase.phase_unit_zones.map(z => ({
      id: z.id,
      label: z.label,
      points: z.points,
      status: z.status as ZoneStatus,
      meta: { unitId: z.unitId },
    }));
  }, [phase.phase_unit_zones]);

  // When clicking a zone on the canvas
  const handleZoneClick = useCallback((zone: CanvasZone) => {
    if (zone.meta?.unitId) {
      const unit = units.find(u => u._id === zone.meta!.unitId);
      if (unit) {
        setSelectedUnit(unit);
        setHighlightedZoneId(zone.id); // keep zone lit while popup is open
        canvasRef.current?.zoomToZone(zone.id);
        return;
      }
    }
    setHighlightedZoneId(zone.id);
  }, [units]);

  // When clicking a unit in the bottom list
  const handleUnitThumbClick = useCallback((unit: Unit) => {
    setSelectedUnit(unit);
    // Find zone for this unit and zoom to it
    const zone = canvasZones.find(z => z.meta?.unitId === unit._id);
    if (zone) {
      canvasRef.current?.zoomToZone(zone.id);
      setHighlightedZoneId(zone.id);
    }
  }, [canvasZones]);

  const handlePopupClose = () => {
    setSelectedUnit(null);
    setHighlightedZoneId(null);
    canvasRef.current?.resetView(); // also fires onTransparentZoom(1,50,50) → clears zoomStyle
  };

  const currentMedia = galleryMedia[mediaIndex];

  const tabs = [
    { key: 'phase-plan' as Tab, label: 'Phase Plan', icon: <Map className="w-3.5 h-3.5" /> },
    { key: 'gallery'    as Tab, label: 'Gallery',    icon: <Images className="w-3.5 h-3.5" /> },
  ];

  // Keyboard: Escape closes popup
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handlePopupClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // ── Background renderer ──────────────────────────────────────────────────

  const renderBackground = () => {
    if (tab === 'phase-plan' && hasPhasePlan) {
      return (
        <div className="absolute inset-0 overflow-hidden">
          {/* Zoom wrapper — video + canvas scale together in transparent mode */}
          <div className="absolute inset-0" style={hasPlanVideo ? zoomStyle : {}}>
            {/* Video behind canvas */}
            {hasPlanVideo && (
              <video src={phase.phase_plan_video_url!} autoPlay loop muted playsInline
                className="absolute inset-0 w-full h-full object-cover" />
            )}
            {/* Image (if no video) */}
            {hasPlanImage && !hasPlanVideo && (
              <img src={phase.phase_plan_url!} alt={phase.name}
                className="absolute inset-0 w-full h-full object-cover" />
            )}
            {/* Canvas overlay — transparent when video present */}
            <div className="absolute inset-0 z-10">
              <ImmersiveCanvas
                ref={canvasRef}
                imageUrl={hasPlanImage && !hasPlanVideo ? phase.phase_plan_url! : undefined}
                transparent={hasPlanVideo}
                zones={canvasZones}
                mode="view"
                onZoneClick={handleZoneClick}
                highlightedZoneId={highlightedZoneId}
                onTransparentZoom={handleTransparentZoom}
                className="w-full h-full"
              />
            </div>
          </div>
          {/* Unit popup sits outside zoom wrapper so it doesn't scale */}
          {selectedUnit && (
            <UnitPopup
              unit={selectedUnit}
              phaseSlug={phase.slug}
              projectSlug={projectSlug}
              onClose={handlePopupClose}
              onExplore={handlePopupClose}
            />
          )}
        </div>
      );
    }

    if (tab === 'gallery' && galleryMedia.length > 0 && currentMedia) {
      return (
        <>
          {currentMedia.type === 'image' ? (
            <img src={currentMedia.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <video src={currentMedia.url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent pointer-events-none z-[5]" />
        </>
      );
    }

    return (
      <>
        {phase.thumbnail_url ? (
          <img src={phase.thumbnail_url} alt={phase.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gray-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent pointer-events-none" />
      </>
    );
  };

  return (
    <div className="min-h-screen md:h-screen relative overflow-hidden flex flex-col bg-black">

      {/* ── Mobile header ── */}
      <div className="relative z-30 bg-black/80 backdrop-blur-md border-b border-white/10 md:hidden pt-20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href={`/projects/${projectSlug}/explore`}
              className="bg-white/20 backdrop-blur-xl border border-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">{projectName}</p>
              <h1 className="text-white font-bold text-sm uppercase tracking-wide">{phase.name}</h1>
            </div>
          </div>
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all ${
                  tab === t.key ? 'text-white border-white' : 'text-white/60 border-transparent'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main background ── */}
      <div className="relative h-[55vh] md:h-screen md:absolute md:inset-0">
        {renderBackground()}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent pointer-events-none z-[5]" />
      </div>

      {/* ── Desktop: Back ── */}
      <div className="hidden md:block absolute top-28 left-8 z-30">
        <Link href={`/projects/${projectSlug}/explore`}
          className="bg-white/90 hover:bg-white text-gray-800 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 backdrop-blur-sm">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs uppercase tracking-wide font-semibold">{projectName} — Site Plan</span>
        </Link>
      </div>

      {/* ── Desktop: Left panel ── */}
      <div className="hidden md:block absolute top-40 left-8 z-30 w-[320px]">
        <div className="space-y-5">
          <div>
            <div className="text-white/50 text-[9px] uppercase tracking-wider mb-1">{projectName}</div>
            <div className="text-white text-5xl font-bold tracking-tight leading-none">{phase.name}</div>
            {phase.description && <div className="text-white/40 text-sm mt-2 line-clamp-2">{phase.description}</div>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-white/50 text-[9px] uppercase">Units</div>
              <div className="text-white text-2xl font-bold">{units.length}</div>
            </div>
            {units.filter(u => u.status === 'available').length > 0 && (
              <div>
                <div className="text-white/50 text-[9px] uppercase">Available</div>
                <div className="text-emerald-400 text-2xl font-bold">{units.filter(u => u.status === 'available').length}</div>
              </div>
            )}
          </div>

          {/* Unit list */}
          {units.length > 0 && (
            <div className="space-y-0.5 pt-1 max-h-52 overflow-y-auto">
              <div className="text-white/50 text-[9px] uppercase tracking-wider mb-2">Units</div>
              {units.map(u => {
                const zone = canvasZones.find(z => z.meta?.unitId === u._id);
                return (
                  <button key={u._id}
                    onClick={() => handleUnitThumbClick(u)}
                    onMouseEnter={() => setHighlightedZoneId(zone?.id ?? null)}
                    onMouseLeave={() => selectedUnit?._id !== u._id && setHighlightedZoneId(null)}
                    className={`w-full flex items-center gap-3 py-2 border-b border-white/10 hover:border-white/30 group transition-all text-left ${
                      selectedUnit?._id === u._id ? 'border-white/40' : ''
                    }`}
                  >
                    <div className="w-7 h-7 rounded-md overflow-hidden shrink-0 bg-white/10">
                      {u.thumbnail_url
                        ? <img src={u.thumbnail_url} alt={u.name} className="w-full h-full object-cover" />
                        : <Home className="w-4 h-4 text-white/40 m-auto" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-semibold truncate">{u.name}</div>
                      <div className="text-white/40 text-[10px]">{u.bedrooms}BR · {formatPrice(u.price)}</div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${statusColor(u.status)}`}>
                      {u.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-2 pt-1">
            {hasPanoramas && (
              <button onClick={() => setShowPanoramaPicker(true)}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                <Compass className="w-4 h-4" /> 360° Phase Tour
              </button>
            )}
            <Link href="/contact"
              className="block text-center w-full bg-olive-500 hover:bg-olive-400 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-xs">
              Enquire Now
            </Link>
          </div>
        </div>
      </div>

      {/* ── Desktop: Bottom nav ── */}
      <div className="hidden md:block absolute bottom-8 left-0 right-0 z-30">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {tabs.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); if (t.key !== 'phase-plan') { setSelectedUnit(null); setHighlightedZoneId(null); } }}
                className={`flex items-center gap-1.5 px-6 py-2 font-semibold text-sm uppercase tracking-wider border-b-2 transition-all ${
                  tab === t.key ? 'text-white border-white' : 'text-white/70 hover:text-white border-transparent'
                }`}
              >
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

          {/* Thumbnails */}
          {tab === 'phase-plan' && units.length > 0 && (
            <div className="flex items-center gap-4">
              <button className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                {units.slice(0, 6).map(u => (
                  <UnitThumb key={u._id} unit={u} isActive={selectedUnit?._id === u._id}
                    onClick={() => handleUnitThumbClick(u)} />
                ))}
                {units.length > 6 && <span className="text-white/40 text-xs">+{units.length - 6}</span>}
              </div>
              <button className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}

          {tab === 'gallery' && galleryMedia.length > 0 && (
            <div className="flex items-center gap-4">
              <button onClick={() => setMediaIndex(i => (i - 1 + galleryMedia.length) % galleryMedia.length)}
                className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                {galleryMedia.slice(0, 6).map((m, i) => (
                  <MediaThumb key={i} media={m} isActive={i === mediaIndex} onClick={() => setMediaIndex(i)} />
                ))}
              </div>
              <button onClick={() => setMediaIndex(i => (i + 1) % galleryMedia.length)}
                className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile: Thumbnails strip ── */}
      <div className="md:hidden relative -mt-8 z-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 justify-center overflow-x-auto">
            {tab === 'phase-plan' && units.slice(0, 8).map(u => (
              <UnitThumb key={u._id} unit={u} isActive={selectedUnit?._id === u._id}
                onClick={() => handleUnitThumbClick(u)} />
            ))}
            {tab === 'gallery' && galleryMedia.map((m, i) => (
              <MediaThumb key={i} media={m} isActive={i === mediaIndex} onClick={() => setMediaIndex(i)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile: Info card + unit list ── */}
      <div className="md:hidden relative bg-black p-4 pb-10">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-white/50 text-[10px] uppercase">Units</div>
              <div className="text-white text-xl font-bold">{units.length}</div>
            </div>
            <div className="text-center">
              <div className="text-white/50 text-[10px] uppercase">Available</div>
              <div className="text-emerald-400 text-xl font-bold">{units.filter(u => u.status === 'available').length}</div>
            </div>
          </div>
          <div className="space-y-2">
            {units.map(u => (
              <Link key={u._id} href={`/projects/${projectSlug}/units/${u.slug}`}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                {u.thumbnail_url && (
                  <img src={u.thumbnail_url} alt={u.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold">{u.name}</div>
                  <div className="text-white/40 text-xs">{u.bedrooms}BR · {formatPrice(u.price)}</div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor(u.status)}`}>
                  {u.status}
                </span>
              </Link>
            ))}
          </div>
          <Link href={`/projects/${projectSlug}/explore`}
            className="block text-center w-full bg-white/10 text-white font-semibold py-3 rounded-xl text-xs uppercase">
            ← Back to Site Plan
          </Link>
        </div>
      </div>

      {/* ── Modals ── */}
      {showPanoramaPicker && hasPanoramas && (
        <PanoramaPicker panoramas={phase.panoramas!}
          onSelect={p => { setActivePanorama(p); setShowPanoramaPicker(false); }}
          onClose={() => setShowPanoramaPicker(false)} />
      )}
      {activePanorama && (
        <PanoramaModal panorama={activePanorama} onClose={() => setActivePanorama(null)} />
      )}
    </div>
  );
}
