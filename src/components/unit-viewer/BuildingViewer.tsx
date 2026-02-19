'use client';

/**
 * BuildingViewer
 * Immersive full-screen viewer for a single building's floor plan.
 * The floor plan image + drawn unit zones are shown as a canvas.
 * Clicking a zone navigates to that unit's tour page.
 *
 * Hierarchy: Project → Master Plan → [this page] → Unit Tour
 */

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ChevronLeft, ChevronRight, LayoutGrid, Images,
  Compass, X, ChevronRight as Chevron, Home, Bed, Bath,
  Maximize2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { PanoramaModal } from '@/components/unit-viewer/PanoramaModal';

const ImmersiveCanvas = dynamic(
  () => import('@/components/canvas/ImmersiveCanvas').then(m => m.ImmersiveCanvas),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-950 animate-pulse" /> }
);

import type { CanvasZone, ZoneStatus } from '@/components/canvas/ImmersiveCanvas';

type MediaItem = {
  url: string; type: 'video' | 'image';
  thumbnailUrl?: string; caption?: string;
};

type Panorama = {
  name: string; panoramaUrl: string;
  description?: string;
  initialView?: { yaw: number; pitch: number; fov: number };
};

type FloorZone = {
  id: string; label: string;
  points: { x: number; y: number }[];
  unitId?: string;
  status: 'available' | 'reserved' | 'sold';
};

type BuildingData = {
  _id: string; name: string; slug: string;
  description?: string; thumbnail_url?: string;
  floor_plan_url?: string;
  floor_plan_zones?: FloorZone[];
  exterior_media?: MediaItem[];
  interior_media?: MediaItem[];
  gallery_media?: MediaItem[];
  panoramas?: Panorama[];
  total_units?: number;
  floors?: number;
};

type UnitSummary = {
  _id: string; name: string; slug: string;
  bedrooms: number; bathrooms: number;
  area_sqft: number; price: number;
  status: 'available' | 'reserved' | 'sold';
  floor_number?: number; unit_type?: string;
  thumbnail_url?: string;
};

type Tab = 'floorplan' | 'gallery';

function formatPrice(p: number) {
  if (p >= 1_000_000) return `KES ${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000)     return `KES ${(p / 1_000).toFixed(0)}K`;
  return `KES ${p.toLocaleString()}`;
}

function statusCls(s: string) {
  if (s === 'available') return 'text-emerald-400';
  if (s === 'reserved')  return 'text-amber-400';
  return 'text-red-400';
}

function statusBadgeCls(s: string) {
  if (s === 'available') return 'bg-emerald-500 text-white';
  if (s === 'reserved')  return 'bg-amber-500 text-white';
  return 'bg-gray-500 text-white';
}

// ── Unit thumbnail card ───────────────────────────────────────────────────────

function UnitThumb({ unit, isActive, onClick }: {
  unit: UnitSummary; isActive: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-300 ${
        isActive ? 'ring-2 ring-white shadow-xl scale-105' : 'opacity-60 hover:opacity-90'
      }`}
    >
      {unit.thumbnail_url ? (
        <img src={unit.thumbnail_url} alt={unit.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center gap-1">
          <Home className="w-5 h-5 text-white/40" />
          <span className="text-[9px] text-white/40">{unit.bedrooms}BR</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-0.5 left-0.5 right-0.5 text-center">
        <div className="text-[9px] text-white/90 font-semibold truncate">{unit.name}</div>
        <div className={`text-[8px] font-medium ${statusCls(unit.status)}`}>{unit.status}</div>
      </div>
    </button>
  );
}

// ── Gallery media thumb ───────────────────────────────────────────────────────

function MediaThumb({ media, isActive, onClick }: {
  media: MediaItem; isActive: boolean; onClick: () => void;
}) {
  const thumbUrl = media.type === 'video' ? (media.thumbnailUrl || media.url) : media.url;
  return (
    <button onClick={onClick}
      className={`relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
        isActive ? 'ring-2 ring-white shadow-xl scale-105' : 'opacity-60 hover:opacity-90'
      }`}
    >
      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
    </button>
  );
}

// ── Panorama picker ───────────────────────────────────────────────────────────

function PanoramaPicker({ panoramas, onSelect, onClose }: {
  panoramas: Panorama[]; onSelect: (p: Panorama) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg p-6 z-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">360° Building Tour</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="space-y-2">
          {panoramas.map((p, i) => (
            <button key={i} onClick={() => onSelect(p)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all"
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

// ── Main BuildingViewer ───────────────────────────────────────────────────────

export default function BuildingViewer({
  building, units, projectSlug, projectName,
}: {
  building: BuildingData; units: UnitSummary[];
  projectSlug: string; projectName: string;
}) {
  const router = useRouter();
  const [tab, setTab]               = useState<Tab>('floorplan');
  const [activeUnitIdx, setActiveUnitIdx] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [highlightedZoneId, setHighlightedZoneId] = useState<string | null>(null);
  const [activePanorama, setActivePanorama] = useState<Panorama | null>(null);
  const [showPanoramaPicker, setShowPanoramaPicker] = useState(false);

  const hasFloorPlan = !!building.floor_plan_url;
  const hasUnits     = units.length > 0;

  const galleryMedia: MediaItem[] = useMemo(() => [
    ...(building.exterior_media ?? []),
    ...(building.gallery_media  ?? []),
  ], [building]);

  const hasPanoramas = (building.panoramas ?? []).length > 0;

  // Build canvas zones from floor plan zones
  const canvasZones: CanvasZone[] = useMemo(() => {
    if (!building.floor_plan_zones) return [];
    return building.floor_plan_zones.map(z => {
      const unit = units.find(u => u._id === z.unitId);
      return {
        id: z.id,
        label: z.label,
        points: z.points,
        status: z.status as ZoneStatus,
        meta: { unitId: z.unitId, unitSlug: unit?.slug },
      };
    });
  }, [building.floor_plan_zones, units]);

  // Click a zone → navigate to unit tour
  const handleZoneClick = (zone: CanvasZone) => {
    if (zone.meta?.unitSlug) {
      router.push(`/projects/${projectSlug}/units/${zone.meta.unitSlug}`);
    } else {
      // Find the unit by id
      const unit = units.find(u => u._id === zone.meta?.unitId);
      if (unit) router.push(`/projects/${projectSlug}/units/${unit.slug}`);
    }
  };

  // Gallery controls
  const prevMedia = () => setMediaIndex(i => (i - 1 + galleryMedia.length) % galleryMedia.length);
  const nextMedia = () => setMediaIndex(i => (i + 1) % galleryMedia.length);
  const currentMedia = galleryMedia[mediaIndex];

  // Count available units
  const availableCount = units.filter(u => u.status === 'available').length;

  const tabs = [
    { key: 'floorplan' as Tab, label: 'Floor Plan', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { key: 'gallery'   as Tab, label: 'Gallery',    icon: <Images     className="w-3.5 h-3.5" /> },
  ];

  // ── Background renderer ──
  const renderBackground = () => {
    if (tab === 'floorplan' && hasFloorPlan) {
      return (
        <ImmersiveCanvas
          imageUrl={building.floor_plan_url!}
          zones={canvasZones}
          mode="view"
          onZoneClick={handleZoneClick}
          highlightedZoneId={highlightedZoneId}
          className="w-full h-full"
        />
      );
    }
    if (tab === 'gallery' && galleryMedia.length > 0 && currentMedia) {
      return (
        <>
          {currentMedia.type === 'image' ? (
            <img src={currentMedia.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <video
              src={currentMedia.url} autoPlay loop muted playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent pointer-events-none z-10" />
        </>
      );
    }
    return (
      <>
        {building.thumbnail_url ? (
          <img src={building.thumbnail_url} alt={building.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent pointer-events-none" />
      </>
    );
  };

  return (
    <div className="min-h-screen md:h-screen relative overflow-hidden flex flex-col bg-black">

      {/* ── Mobile header ────────────────────────────────────────────────── */}
      <div className="relative z-30 bg-black/80 backdrop-blur-md border-b border-white/10 md:hidden pt-20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href={`/projects/${projectSlug}/explore`}
              className="bg-white/20 border border-white/30 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">{projectName}</p>
              <h1 className="text-white font-bold text-sm uppercase">{building.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                  tab === t.key ? 'text-white border-white' : 'text-white/60 border-transparent'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main background ──────────────────────────────────────────────── */}
      <div className="relative h-[55vh] md:h-screen md:absolute md:inset-0">
        {renderBackground()}
        {tab === 'floorplan' && (
          <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none z-[5]" />
        )}
        {tab === 'gallery' && (
          <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent pointer-events-none z-[5]" />
        )}
      </div>

      {/* ── Desktop: Breadcrumb ──────────────────────────────────────────── */}
      <div className="hidden md:block absolute top-28 left-8 z-30">
        <Link
          href={`/projects/${projectSlug}/explore`}
          className="bg-white/90 hover:bg-white text-gray-800 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs uppercase tracking-wide font-semibold">{projectName} · Site Plan</span>
        </Link>
      </div>

      {/* ── Desktop: Left panel ──────────────────────────────────────────── */}
      <div className="hidden md:block absolute top-40 left-8 z-30 w-[340px]">
        <div className="space-y-5">
          <div>
            <div className="text-white/50 text-[9px] uppercase tracking-wider mb-1">
              {building.floors ? `${building.floors} Floors` : 'Building'}
            </div>
            <div className="text-white text-6xl font-bold tracking-tight leading-none">
              {building.name}
            </div>
            {building.description && (
              <div className="text-white/40 text-sm mt-1 line-clamp-2">{building.description}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-white/50 text-[9px] uppercase tracking-wider">Total Units</div>
              <div className="text-white text-2xl font-bold">{units.length}</div>
            </div>
            <div>
              <div className="text-white/50 text-[9px] uppercase tracking-wider">Available</div>
              <div className="text-emerald-400 text-2xl font-bold">{availableCount}</div>
            </div>
          </div>

          {/* Units list */}
          {hasUnits && (
            <div className="space-y-0 pt-2 max-h-[240px] overflow-y-auto pr-1">
              <div className="text-white/50 text-[9px] uppercase tracking-wider mb-2">Units</div>
              {units.map(u => (
                <Link
                  key={u._id}
                  href={`/projects/${projectSlug}/units/${u.slug}`}
                  onMouseEnter={() => {
                    const zone = canvasZones.find(z => z.meta?.unitId === u._id);
                    setHighlightedZoneId(zone?.id ?? null);
                  }}
                  onMouseLeave={() => setHighlightedZoneId(null)}
                  className="flex items-center gap-3 py-2.5 border-b border-white/10 hover:border-white/30 group transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {u.thumbnail_url
                      ? <img src={u.thumbnail_url} alt={u.name} className="w-full h-full object-cover" />
                      : <Home className="w-4 h-4 text-white/40" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-semibold">{u.name}</div>
                    <div className="text-white/40 text-[10px] flex items-center gap-2">
                      <span>{u.bedrooms}BR</span>
                      <span>·</span>
                      <span>{u.area_sqft.toLocaleString()} ft²</span>
                      <span>·</span>
                      <span className={statusCls(u.status)}>{u.status}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-white text-xs font-semibold">{formatPrice(u.price)}</div>
                    <Chevron className="w-4 h-4 text-white/30 group-hover:text-white/70 ml-auto" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {tab === 'floorplan' && hasFloorPlan && (
            <div className="text-white/30 text-[10px] italic">
              Click a highlighted zone to open that unit's tour
            </div>
          )}

          <div className="space-y-2 pt-2">
            {hasPanoramas && (
              <button onClick={() => setShowPanoramaPicker(true)}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4" /> 360° Building Tour
              </button>
            )}
            <Link href="/contact"
              className="block text-center w-full bg-olive-500 hover:bg-olive-400 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-xs"
            >
              Enquire Now
            </Link>
          </div>
        </div>
      </div>

      {/* ── Desktop: Bottom navigation ───────────────────────────────────── */}
      <div className="hidden md:block absolute bottom-8 left-0 right-0 z-30">
        <div className="flex flex-col items-center gap-6">
          {/* Tab switcher */}
          <div className="flex items-center gap-2">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-6 py-2 font-semibold text-sm uppercase tracking-wider border-b-2 transition-all ${
                  tab === t.key ? 'text-white border-white' : 'text-white/70 hover:text-white border-transparent'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
            {hasPanoramas && (
              <button onClick={() => setShowPanoramaPicker(true)}
                className="flex items-center gap-1.5 px-6 py-2 font-semibold text-sm uppercase tracking-wider text-white/70 hover:text-white border-b-2 border-transparent"
              >
                <Compass className="w-3.5 h-3.5" /> Tour
              </button>
            )}
          </div>

          {/* Bottom thumbs — units on floorplan tab */}
          {tab === 'floorplan' && hasUnits && (
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveUnitIdx(i => Math.max(0, i - 1))}
                className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                {units.slice(0, 6).map((u, i) => (
                  <UnitThumb key={u._id} unit={u} isActive={i === activeUnitIdx}
                    onClick={() => router.push(`/projects/${projectSlug}/units/${u.slug}`)}
                  />
                ))}
                {units.length > 6 && (
                  <span className="text-white/40 text-xs">+{units.length - 6}</span>
                )}
              </div>
              <button onClick={() => setActiveUnitIdx(i => Math.min(units.length - 1, i + 1))}
                className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}

          {tab === 'gallery' && galleryMedia.length > 0 && (
            <div className="flex items-center gap-4">
              <button onClick={prevMedia} className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                {galleryMedia.slice(0, 6).map((m, i) => (
                  <MediaThumb key={i} media={m} isActive={i === mediaIndex} onClick={() => setMediaIndex(i)} />
                ))}
              </div>
              <button onClick={nextMedia} className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile: thumbnail strip ──────────────────────────────────────── */}
      <div className="md:hidden relative -mt-8 z-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 justify-center overflow-x-auto">
            {tab === 'floorplan' && units.map((u, i) => (
              <UnitThumb key={u._id} unit={u} isActive={i === activeUnitIdx}
                onClick={() => router.push(`/projects/${projectSlug}/units/${u.slug}`)}
              />
            ))}
            {tab === 'gallery' && galleryMedia.map((m, i) => (
              <MediaThumb key={i} media={m} isActive={i === mediaIndex} onClick={() => setMediaIndex(i)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile: info card ────────────────────────────────────────────── */}
      <div className="md:hidden relative bg-black p-4 pb-10">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-white/50 text-[10px] uppercase">Units</div>
              <div className="text-white text-xl font-bold">{units.length}</div>
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase">Available</div>
              <div className="text-emerald-400 text-xl font-bold">{availableCount}</div>
            </div>
            {building.floors && (
              <div>
                <div className="text-white/50 text-[10px] uppercase">Floors</div>
                <div className="text-white text-xl font-bold">{building.floors}</div>
              </div>
            )}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {units.map(u => (
              <Link key={u._id} href={`/projects/${projectSlug}/units/${u.slug}`}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl"
              >
                <Home className="w-4 h-4 text-white/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{u.name}</div>
                  <div className="text-white/40 text-xs">{u.bedrooms}BR · {formatPrice(u.price)}</div>
                </div>
                <span className={`text-xs font-medium ${statusCls(u.status)}`}>{u.status}</span>
                <Chevron className="w-4 h-4 text-white/30 shrink-0" />
              </Link>
            ))}
          </div>
          <Link href="/contact"
            className="block text-center w-full bg-olive-500 text-white font-bold py-4 rounded-xl uppercase tracking-widest text-xs"
          >
            Enquire Now
          </Link>
          <Link href={`/projects/${projectSlug}/explore`}
            className="block text-center w-full bg-white/10 text-white font-semibold py-3 rounded-xl text-xs uppercase"
          >
            ← Site Plan
          </Link>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showPanoramaPicker && hasPanoramas && (
        <PanoramaPicker
          panoramas={building.panoramas!}
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
