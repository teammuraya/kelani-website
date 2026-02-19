'use client';

/**
 * MasterPlanViewer
 * Immersive full-screen viewer for the project master plan / site plan.
 * Layout is identical to UnitViewer — canvas replaces video as the background
 * on the "Site Plan" tab. A gallery tab shows project images/videos.
 *
 * Hierarchy: Project → [this page] → Building → Unit
 */

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Map, Images,
  Building2, Compass, X, ChevronRight as Chevron,
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

type Building = {
  _id: string; name: string; slug: string;
  description?: string; thumbnail_url?: string;
  total_units?: number; floors?: number;
};

type MasterPlanZone = {
  id: string; label: string;
  points: { x: number; y: number }[];
  buildingId?: string;
  status: 'available' | 'coming_soon' | 'sold_out';
};

type ProjectData = {
  _id: string; name: string; slug: string;
  tagline: string; description: string;
  location: string; price_from: number;
  status: string; image_url: string;
  master_plan_url?: string;
  master_plan_zones?: MasterPlanZone[];
  exterior_media?: MediaItem[];
  interior_media?: MediaItem[];
  gallery_media?: MediaItem[];
  panoramas?: Panorama[];
  amenities?: string[];
};

type Tab = 'sitemap' | 'gallery';

function formatPrice(p: number) {
  if (p >= 1_000_000) return `KES ${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000)     return `KES ${(p / 1_000).toFixed(0)}K`;
  return `KES ${p.toLocaleString()}`;
}

// ── Building thumbnail (bottom carousel) ──────────────────────────────────────

function BuildingThumb({
  building, isActive, onClick,
}: { building: Building; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-24 h-20 rounded-lg overflow-hidden transition-all duration-300 flex-shrink-0 ${
        isActive ? 'ring-2 ring-white shadow-xl scale-105' : 'opacity-60 hover:opacity-90'
      }`}
    >
      {building.thumbnail_url ? (
        <img src={building.thumbnail_url} alt={building.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center gap-1">
          <Building2 className="w-6 h-6 text-white/40" />
          <span className="text-[9px] text-white/40 text-center px-1 leading-tight">{building.name}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-1 left-1 right-1 text-[9px] text-white/90 font-semibold truncate text-center">
        {building.name}
      </div>
    </button>
  );
}

// ── Media thumbnail (gallery tab) ─────────────────────────────────────────────

function MediaThumb({
  media, isActive, onClick,
}: { media: MediaItem; isActive: boolean; onClick: () => void }) {
  const thumbUrl = media.type === 'video' ? (media.thumbnailUrl || media.url) : media.url;
  return (
    <button
      onClick={onClick}
      className={`relative w-24 h-20 rounded-lg overflow-hidden transition-all duration-300 flex-shrink-0 ${
        isActive ? 'ring-2 ring-white shadow-xl scale-105' : 'opacity-60 hover:opacity-90'
      }`}
    >
      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
    </button>
  );
}

// ── Panorama picker sheet ─────────────────────────────────────────────────────

function PanoramaPicker({ panoramas, onSelect, onClose }: {
  panoramas: Panorama[]; onSelect: (p: Panorama) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg p-6 z-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">360° Site Tour</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="space-y-2">
          {panoramas.map((p, i) => (
            <button key={i} onClick={() => onSelect(p)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                360°
              </div>
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

// ── Main MasterPlanViewer ─────────────────────────────────────────────────────

export default function MasterPlanViewer({
  project, buildings,
}: {
  project: ProjectData; buildings: Building[];
}) {
  const router = useRouter();
  const [tab, setTab]                       = useState<Tab>('sitemap');
  const [activeBuildingIdx, setActiveBuildingIdx] = useState(0);
  const [mediaIndex, setMediaIndex]         = useState(0);
  const [highlightedBuildingId, setHighlightedBuildingId] = useState<string | null>(null);
  const [activePanorama, setActivePanorama] = useState<Panorama | null>(null);
  const [showPanoramaPicker, setShowPanoramaPicker] = useState(false);

  const hasMasterPlan = !!project.master_plan_url;
  const hasBuildings  = buildings.length > 0;

  // Gallery media — combine exterior + gallery for project level
  const galleryMedia: MediaItem[] = useMemo(() => [
    ...(project.exterior_media ?? []),
    ...(project.gallery_media  ?? []),
  ], [project]);

  const hasPanoramas = (project.panoramas ?? []).length > 0;

  // Build canvas zones from master plan zones
  const canvasZones: CanvasZone[] = useMemo(() => {
    if (!project.master_plan_zones) return [];
    return project.master_plan_zones.map(z => ({
      id: z.id,
      label: z.label,
      points: z.points,
      status: z.status as ZoneStatus,
      meta: { buildingId: z.buildingId },
    }));
  }, [project.master_plan_zones]);

  // When user clicks a zone on the canvas
  const handleZoneClick = (zone: CanvasZone) => {
    if (zone.meta?.buildingId) {
      const b = buildings.find(b => b._id === zone.meta!.buildingId);
      if (b) {
        router.push(`/projects/${project.slug}/buildings/${b.slug}`);
        return;
      }
    }
    // If no building linked, just highlight
    setHighlightedBuildingId(zone.id);
  };

  const currentBuilding = buildings[activeBuildingIdx];

  // ── Media controls ──
  const currentMedia = galleryMedia[mediaIndex];
  const prevMedia = () => setMediaIndex(i => (i - 1 + galleryMedia.length) % galleryMedia.length);
  const nextMedia = () => setMediaIndex(i => (i + 1) % galleryMedia.length);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'sitemap', label: 'Site Plan', icon: <Map className="w-3.5 h-3.5" /> },
    { key: 'gallery', label: 'Gallery',   icon: <Images className="w-3.5 h-3.5" /> },
  ];

  // ── Background renderer ──
  const renderBackground = () => {
    if (tab === 'sitemap' && hasMasterPlan) {
      return (
        <ImmersiveCanvas
          imageUrl={project.master_plan_url!}
          zones={canvasZones}
          mode="view"
          onZoneClick={handleZoneClick}
          highlightedZoneId={highlightedBuildingId}
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
    // Fallback — project hero image
    return (
      <>
        <img src={project.image_url} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
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
              href={`/projects/${project.slug}`}
              className="bg-white/20 backdrop-blur-xl border border-white/30 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Site Explorer</p>
              <h1 className="text-white font-bold text-sm uppercase tracking-wide">{project.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
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

      {/* ── Main background area ─────────────────────────────────────────── */}
      <div className="relative h-[55vh] md:h-screen md:absolute md:inset-0">
        {renderBackground()}
        {/* Gradient overlay for left panel contrast on desktop */}
        {tab === 'gallery' && (
          <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 via-30% to-transparent pointer-events-none z-[5]" />
        )}
        {tab === 'sitemap' && (
          <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none z-[5]" />
        )}
      </div>

      {/* ── Desktop: Back + breadcrumb ───────────────────────────────────── */}
      <div className="hidden md:block absolute top-28 left-8 z-30">
        <Link
          href={`/projects/${project.slug}`}
          className="bg-white/90 hover:bg-white text-gray-800 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs uppercase tracking-wide font-semibold">{project.name}</span>
        </Link>
      </div>

      {/* ── Desktop: Left panel ──────────────────────────────────────────── */}
      <div className="hidden md:block absolute top-40 left-8 z-30 w-[340px]">
        <div className="space-y-5">

          <div>
            <div className="text-white/50 text-[9px] uppercase tracking-wider font-medium mb-1">
              {project.location}
            </div>
            <div className="text-white text-6xl font-bold tracking-tight leading-none">
              Site Plan
            </div>
            <div className="text-white/40 text-sm mt-1">{project.tagline}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-white/50 text-[9px] uppercase tracking-wider">Buildings</div>
              <div className="text-white text-2xl font-bold">{buildings.length}</div>
            </div>
            <div>
              <div className="text-white/50 text-[9px] uppercase tracking-wider">From</div>
              <div className="text-white text-2xl font-bold">{formatPrice(project.price_from)}</div>
            </div>
          </div>

          {/* Buildings list */}
          {hasBuildings && (
            <div className="space-y-1 pt-2">
              <div className="text-white/50 text-[9px] uppercase tracking-wider mb-2">Buildings</div>
              {buildings.map((b, i) => (
                <Link
                  key={b._id}
                  href={`/projects/${project.slug}/buildings/${b.slug}`}
                  onMouseEnter={() => setHighlightedBuildingId(
                    canvasZones.find(z => z.meta?.buildingId === b._id)?.id ?? null
                  )}
                  onMouseLeave={() => setHighlightedBuildingId(null)}
                  className="flex items-center gap-3 py-2.5 border-b border-white/10 hover:border-white/30 group transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 flex-shrink-0 overflow-hidden">
                    {b.thumbnail_url
                      ? <img src={b.thumbnail_url} alt={b.name} className="w-full h-full object-cover" />
                      : <Building2 className="w-4 h-4 text-white/60" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-semibold group-hover:text-white/90">{b.name}</div>
                    {b.total_units && (
                      <div className="text-white/40 text-[10px]">{b.total_units} units</div>
                    )}
                  </div>
                  <Chevron className="w-4 h-4 text-white/30 group-hover:text-white/70" />
                </Link>
              ))}
            </div>
          )}

          {/* Instructions */}
          {tab === 'sitemap' && hasMasterPlan && (
            <div className="text-white/30 text-[10px] italic">
              Click a highlighted zone on the map to explore that building
            </div>
          )}

          <div className="space-y-2 pt-2">
            {hasPanoramas && (
              <button
                onClick={() => setShowPanoramaPicker(true)}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4" /> 360° Site Tour
              </button>
            )}
            <Link
              href="/contact"
              className="block text-center w-full bg-olive-500 hover:bg-olive-400 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-xs"
            >
              Enquire Now
            </Link>
          </div>
        </div>
      </div>

      {/* ── Desktop: Bottom nav (tabs + thumbnails) ──────────────────────── */}
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

          {/* Bottom thumbnails */}
          {tab === 'sitemap' && hasBuildings && (
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveBuildingIdx(i => Math.max(0, i - 1))}
                className="text-white w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                {buildings.slice(0, 6).map((b, i) => (
                  <BuildingThumb
                    key={b._id} building={b}
                    isActive={i === activeBuildingIdx}
                    onClick={() => {
                      setActiveBuildingIdx(i);
                      router.push(`/projects/${project.slug}/buildings/${b.slug}`);
                    }}
                  />
                ))}
              </div>
              <button onClick={() => setActiveBuildingIdx(i => Math.min(buildings.length - 1, i + 1))}
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

      {/* ── Mobile: Building grid (below canvas) ─────────────────────────── */}
      <div className="md:hidden relative -mt-8 z-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 justify-center overflow-x-auto">
            {tab === 'sitemap' && buildings.map((b, i) => (
              <BuildingThumb key={b._id} building={b}
                isActive={i === activeBuildingIdx}
                onClick={() => router.push(`/projects/${project.slug}/buildings/${b.slug}`)}
              />
            ))}
            {tab === 'gallery' && galleryMedia.map((m, i) => (
              <MediaThumb key={i} media={m} isActive={i === mediaIndex} onClick={() => setMediaIndex(i)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile: Info card ────────────────────────────────────────────── */}
      <div className="md:hidden relative bg-black p-4 pb-10">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-white/50 text-[10px] uppercase">Buildings</div>
              <div className="text-white text-xl font-bold">{buildings.length}</div>
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase">From</div>
              <div className="text-white text-lg font-bold">{formatPrice(project.price_from)}</div>
            </div>
          </div>
          <div className="space-y-2">
            {buildings.map(b => (
              <Link key={b._id} href={`/projects/${project.slug}/buildings/${b.slug}`}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl"
              >
                <Building2 className="w-5 h-5 text-white/40" />
                <span className="text-white text-sm font-medium flex-1">{b.name}</span>
                <Chevron className="w-4 h-4 text-white/30" />
              </Link>
            ))}
          </div>
          <Link href="/contact"
            className="block text-center w-full bg-olive-500 text-white font-bold py-4 rounded-xl uppercase tracking-widest text-xs"
          >
            Enquire Now
          </Link>
          <Link href={`/projects/${project.slug}`}
            className="block text-center w-full bg-white/10 text-white font-semibold py-3 rounded-xl text-xs uppercase tracking-wide"
          >
            ← Back to Project
          </Link>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showPanoramaPicker && hasPanoramas && (
        <PanoramaPicker
          panoramas={project.panoramas!}
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
