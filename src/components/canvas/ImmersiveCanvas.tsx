'use client';

/**
 * ImmersiveCanvas — a full-screen canvas overlay for drawing and viewing zones
 * (building zones on master plans, unit zones on floor plans)
 *
 * Modes:
 *   - "view":  read-only, zones are clickable, background image fills container
 *   - "edit":  draw mode toggle, can add/delete zones
 *
 * Zone points are stored as NORMALIZED (0–1) coordinates relative to the image
 * dimensions, so they are resolution-independent.
 */

import React, {
  useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef,
} from 'react';
import {
  MousePointer, Pencil, ZoomIn, ZoomOut, RotateCcw, Trash2, Plus,
  Check, X as XIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ZonePoint = { x: number; y: number };   // normalized 0–1

export type ZoneStatus =
  // Master plan (buildings)
  | 'available' | 'coming_soon' | 'sold_out'
  // Floor plan (units)
  | 'reserved' | 'sold';

export type CanvasZone = {
  id: string;
  label: string;
  points: ZonePoint[];   // normalized
  status: ZoneStatus;
  meta?: Record<string, any>;  // arbitrary extra data (e.g. buildingId, unitId, slug)
};

export type ImmersiveCanvasMode = 'view' | 'edit';

export type ImmersiveCanvasProps = {
  imageUrl: string;
  zones: CanvasZone[];
  mode?: ImmersiveCanvasMode;
  /** Called when user clicks a zone in view mode */
  onZoneClick?: (zone: CanvasZone) => void;
  /** Called when user finishes drawing a new zone (edit mode) */
  onZoneAdd?: (points: ZonePoint[], id: string) => void;
  /** Called when user requests deletion of a zone (edit mode) */
  onZoneDelete?: (zoneId: string) => void;
  /** Highlight a specific zone (useful for hover-syncing with list) */
  highlightedZoneId?: string | null;
  /** Class applied to the outer container */
  className?: string;
};

export interface ImmersiveCanvasRef {
  resetView: () => void;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function zoneColor(status: ZoneStatus, alpha = 0.35): string {
  switch (status) {
    case 'available':   return `rgba(52,211,153,${alpha})`;   // emerald
    case 'coming_soon': return `rgba(251,191,36,${alpha})`;   // amber
    case 'sold_out':    return `rgba(239,68,68,${alpha})`;    // red
    case 'reserved':    return `rgba(251,191,36,${alpha})`;   // amber
    case 'sold':        return `rgba(156,163,175,${alpha})`;  // gray
    default:            return `rgba(99,102,241,${alpha})`;   // indigo
  }
}

function zoneBorderColor(status: ZoneStatus): string {
  switch (status) {
    case 'available':   return 'rgba(52,211,153,0.9)';
    case 'coming_soon': return 'rgba(251,191,36,0.9)';
    case 'sold_out':    return 'rgba(239,68,68,0.9)';
    case 'reserved':    return 'rgba(251,191,36,0.9)';
    case 'sold':        return 'rgba(156,163,175,0.7)';
    default:            return 'rgba(99,102,241,0.9)';
  }
}

const CLOSE_THRESHOLD_PX = 18;  // pixels — snapping to close a polygon
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.15;
const DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

// ─── Component ────────────────────────────────────────────────────────────────

export const ImmersiveCanvas = forwardRef<ImmersiveCanvasRef, ImmersiveCanvasProps>(
  function ImmersiveCanvas(
    { imageUrl, zones, mode = 'view', onZoneClick, onZoneAdd, onZoneDelete,
      highlightedZoneId, className = '' },
    ref
  ) {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef     = useRef<HTMLImageElement | null>(null);
    const rafRef       = useRef<number>(0);

    // Viewport state
    const [zoom, setZoom]       = useState(1);
    const [pan, setPan]         = useState({ x: 0, y: 0 });
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgSize, setImgSize] = useState({ w: 1, h: 1 });

    // Interaction state
    const [isDrawing, setIsDrawing] = useState(false);   // pencil tool active
    const [drawPath, setDrawPath]   = useState<ZonePoint[]>([]);  // current polygon in image coords
    const [nearStart, setNearStart] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [dragLast, setDragLast]   = useState({ x: 0, y: 0 });
    const [hoverZoneId, setHoverZoneId] = useState<string | null>(null);
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

    // ── Load image ──────────────────────────────────────────────────────────

    useEffect(() => {
      setImgLoaded(false);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
        setImgLoaded(true);
      };
      img.onerror = () => {
        // fallback placeholder
        imageRef.current = null;
        setImgLoaded(true);
      };
      img.src = imageUrl;
      return () => { img.onload = null; img.onerror = null; };
    }, [imageUrl]);

    // ── Fit image to container on first load ────────────────────────────────

    const fitToContainer = useCallback(() => {
      const container = containerRef.current;
      if (!container || !imgLoaded) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const img = imageRef.current;
      if (!img) { setZoom(1); setPan({ x: 0, y: 0 }); return; }
      const scaleX = cw / imgSize.w;
      const scaleY = ch / imgSize.h;
      const z = Math.min(scaleX, scaleY) * 0.95;
      setZoom(z);
      setPan({
        x: (cw - imgSize.w * z) / 2,
        y: (ch - imgSize.h * z) / 2,
      });
    }, [imgLoaded, imgSize]);

    useEffect(() => { fitToContainer(); }, [fitToContainer]);

    useImperativeHandle(ref, () => ({ resetView: fitToContainer }));

    // ── Canvas resize ───────────────────────────────────────────────────────

    useEffect(() => {
      const obs = new ResizeObserver(() => {
        const canvas = canvasRef.current;
        const cont   = containerRef.current;
        if (!canvas || !cont) return;
        const w = cont.clientWidth;
        const h = cont.clientHeight;
        canvas.width  = w * DPR;
        canvas.height = h * DPR;
        canvas.style.width  = `${w}px`;
        canvas.style.height = `${h}px`;
        fitToContainer();
      });
      if (containerRef.current) obs.observe(containerRef.current);
      return () => obs.disconnect();
    }, [fitToContainer]);

    // ── Coordinate helpers ──────────────────────────────────────────────────

    /** Convert mouse event → canvas CSS coords */
    const getCanvasPos = (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
      const canvas = canvasRef.current!;
      const rect   = canvas.getBoundingClientRect();
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    };

    /** Convert canvas CSS coords → image-space coords (pixels in the image) */
    const canvasToImage = (cx: number, cy: number): ZonePoint => ({
      x: (cx - pan.x) / zoom,
      y: (cy - pan.y) / zoom,
    });

    /** Convert normalized (0-1) → image-space coords */
    const normToImage = (p: ZonePoint): ZonePoint => ({
      x: p.x * imgSize.w,
      y: p.y * imgSize.h,
    });

    /** Convert image-space → canvas CSS coords */
    const imageToCanvas = (p: ZonePoint): ZonePoint => ({
      x: p.x * zoom + pan.x,
      y: p.y * zoom + pan.y,
    });

    /** Convert image-space → normalized */
    const imageToNorm = (p: ZonePoint): ZonePoint => ({
      x: p.x / imgSize.w,
      y: p.y / imgSize.h,
    });

    // ── Draw loop ───────────────────────────────────────────────────────────

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx    = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      const W = canvas.width / DPR;
      const H = canvas.height / DPR;

      ctx.save();
      ctx.scale(DPR, DPR);
      ctx.clearRect(0, 0, W, H);

      // --- Background image ---
      const img = imageRef.current;
      if (img) {
        ctx.drawImage(img, pan.x, pan.y, imgSize.w * zoom, imgSize.h * zoom);
      } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff4';
        ctx.font = '16px sans-serif';
        ctx.fillText('No image', 20, 30);
      }

      // --- Existing zones ---
      for (const zone of zones) {
        if (zone.points.length < 3) continue;
        const pts = zone.points.map(normToImage).map(imageToCanvas);

        const isHov = zone.id === hoverZoneId || zone.id === highlightedZoneId;
        const isSel = zone.id === selectedZoneId;

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();

        ctx.fillStyle   = zoneColor(zone.status, isHov || isSel ? 0.55 : 0.3);
        ctx.strokeStyle = zoneBorderColor(zone.status);
        ctx.lineWidth   = isHov || isSel ? 2.5 : 1.5;
        ctx.fill();
        ctx.stroke();

        // Label
        if (zoom > 0.3) {
          const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
          const fontSize = Math.max(10, Math.min(16, zoom * 14));
          ctx.font        = `600 ${fontSize}px system-ui, sans-serif`;
          ctx.fillStyle   = '#fff';
          ctx.shadowColor = '#000';
          ctx.shadowBlur  = 4;
          ctx.textAlign   = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(zone.label, cx, cy);
          ctx.shadowBlur = 0;
        }
      }

      // --- Current drawing path ---
      if (isDrawing && drawPath.length > 0) {
        const pts = drawPath.map(p => imageToCanvas(p));
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth   = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Vertices
        for (const p of pts) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#f97316';
          ctx.fill();
        }

        // Close-snapping indicator
        if (nearStart && drawPath.length > 2) {
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, 10, 0, Math.PI * 2);
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      ctx.restore();
    }, [
      zones, drawPath, isDrawing, nearStart,
      zoom, pan, imgSize, imgLoaded, hoverZoneId, highlightedZoneId, selectedZoneId,
    ]);

    // Request animation frame for rendering
    useEffect(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(render);
      return () => cancelAnimationFrame(rafRef.current);
    }, [render]);

    // ── Mouse handlers ──────────────────────────────────────────────────────

    const hitTest = useCallback((cx: number, cy: number): CanvasZone | null => {
      // test in reverse (top-most zone first)
      for (let i = zones.length - 1; i >= 0; i--) {
        const zone = zones[i];
        if (zone.points.length < 3) continue;
        const pts = zone.points.map(normToImage);
        // point-in-polygon (ray casting)
        let inside = false;
        const tx = (cx - pan.x) / zoom;
        const ty = (cy - pan.y) / zoom;
        for (let j = 0, k = pts.length - 1; j < pts.length; k = j++) {
          const xi = pts[j].x, yi = pts[j].y;
          const xk = pts[k].x, yk = pts[k].y;
          if ((yi > ty) !== (yk > ty) && tx < ((xk - xi) * (ty - yi)) / (yk - yi) + xi) {
            inside = !inside;
          }
        }
        if (inside) return zone;
      }
      return null;
    }, [zones, zoom, pan, imgSize]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      const pos = getCanvasPos(e);

      if (isDrawing) {
        const imgPos = canvasToImage(pos.x, pos.y);
        if (nearStart && drawPath.length > 2) {
          // Close polygon
          const normPath = drawPath.map(imageToNorm);
          const id = `zone-${Date.now()}`;
          onZoneAdd?.(normPath, id);
          setDrawPath([]);
          setNearStart(false);
        } else {
          setDrawPath(prev => [...prev, imgPos]);
        }
        return;
      }

      // Pan mode
      setIsPanning(true);
      setDragLast(pos);
    }, [isDrawing, nearStart, drawPath, onZoneAdd, pan, zoom]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      const pos = getCanvasPos(e);

      if (!isDrawing) {
        // Update hover
        const zone = hitTest(pos.x, pos.y);
        setHoverZoneId(zone?.id ?? null);

        if (isPanning) {
          setPan(prev => ({
            x: prev.x + pos.x - dragLast.x,
            y: prev.y + pos.y - dragLast.y,
          }));
          setDragLast(pos);
        }
        return;
      }

      // Check near-start snapping
      if (drawPath.length > 2) {
        const start = imageToCanvas(drawPath[0]);
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        setNearStart(Math.sqrt(dx * dx + dy * dy) < CLOSE_THRESHOLD_PX);
      }
    }, [isDrawing, isPanning, drawPath, dragLast, hitTest, zoom, pan]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
      if (!isPanning) return;
      setIsPanning(false);
      // If barely moved → it was a click
      const pos = getCanvasPos(e);
      const dx  = pos.x - dragLast.x;
      const dy  = pos.y - dragLast.y;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4 && !isDrawing) {
        const zone = hitTest(pos.x, pos.y);
        if (zone) {
          if (mode === 'view') {
            onZoneClick?.(zone);
          } else {
            setSelectedZoneId(prev => prev === zone.id ? null : zone.id);
          }
        }
      }
    }, [isPanning, dragLast, isDrawing, hitTest, mode, onZoneClick]);

    const handleDblClick = useCallback(() => {
      if (isDrawing && drawPath.length >= 3) {
        const normPath = drawPath.map(imageToNorm);
        const id = `zone-${Date.now()}`;
        onZoneAdd?.(normPath, id);
        setDrawPath([]);
        setNearStart(false);
      }
    }, [isDrawing, drawPath, onZoneAdd]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
      e.preventDefault();
      const pos   = getCanvasPos(e);
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZ  = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
      if (newZ === zoom) return;
      // Zoom toward cursor
      setPan(prev => ({
        x: pos.x - (pos.x - prev.x) * (newZ / zoom),
        y: pos.y - (pos.y - prev.y) * (newZ / zoom),
      }));
      setZoom(newZ);
    }, [zoom, pan]);

    // Cancel drawing on Escape
    useEffect(() => {
      const fn = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setDrawPath([]);
          setNearStart(false);
          setIsDrawing(false);
          setSelectedZoneId(null);
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedZoneId && mode === 'edit') {
            onZoneDelete?.(selectedZoneId);
            setSelectedZoneId(null);
          }
        }
      };
      window.addEventListener('keydown', fn);
      return () => window.removeEventListener('keydown', fn);
    }, [selectedZoneId, mode, onZoneDelete]);

    // ── Cursor ──────────────────────────────────────────────────────────────

    const cursor = isDrawing
      ? nearStart && drawPath.length > 2 ? 'pointer' : 'crosshair'
      : isPanning ? 'grabbing'
      : hoverZoneId ? 'pointer'
      : 'grab';

    // ── Render ──────────────────────────────────────────────────────────────

    return (
      <div ref={containerRef} className={`relative w-full h-full ${className}`}>
        <canvas
          ref={canvasRef}
          style={{ cursor }}
          className="w-full h-full block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDblClick}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* ── Controls overlay ── */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {/* Zoom controls */}
          <button
            onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
            className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
            className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={fitToContainer}
            className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10"
            title="Reset view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Edit mode tools */}
          {mode === 'edit' && (
            <>
              <div className="border-t border-white/10 my-0.5" />
              <button
                onClick={() => { setIsDrawing(false); setDrawPath([]); setNearStart(false); }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm border text-white ${
                  !isDrawing
                    ? 'bg-white/20 border-white/40'
                    : 'bg-black/60 border-white/10 hover:bg-black/80'
                }`}
                title="Select / pan"
              >
                <MousePointer className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setIsDrawing(true); setDrawPath([]); setNearStart(false); }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm border text-white ${
                  isDrawing
                    ? 'bg-orange-500/80 border-orange-400'
                    : 'bg-black/60 border-white/10 hover:bg-black/80'
                }`}
                title="Draw zone"
              >
                <Pencil className="w-4 h-4" />
              </button>
              {selectedZoneId && (
                <button
                  onClick={() => { onZoneDelete?.(selectedZoneId); setSelectedZoneId(null); }}
                  className="w-8 h-8 rounded-lg bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur-sm border border-red-400"
                  title="Delete selected zone (Del)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Drawing instructions */}
        {isDrawing && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs border border-white/10">
              {drawPath.length === 0
                ? 'Click to start drawing a zone'
                : drawPath.length < 3
                ? `${drawPath.length} point${drawPath.length > 1 ? 's' : ''} — need at least 3`
                : nearStart
                ? 'Click to close the zone'
                : 'Continue clicking — double-click or return to start to finish'}
            </div>
            {drawPath.length >= 3 && (
              <button
                onClick={() => {
                  const normPath = drawPath.map(imageToNorm);
                  const id = `zone-${Date.now()}`;
                  onZoneAdd?.(normPath, id);
                  setDrawPath([]);
                  setNearStart(false);
                }}
                className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Finish Zone
              </button>
            )}
            {drawPath.length > 0 && (
              <button
                onClick={() => { setDrawPath([]); setNearStart(false); }}
                className="bg-black/60 hover:bg-black/80 text-white px-3 py-2 rounded-full text-xs border border-white/20"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex items-center gap-3 pointer-events-none">
          {(['available', 'reserved', 'sold_out'] as ZoneStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: zoneColor(s, 1) }} />
              <span className="text-[10px] text-white/70 capitalize">{s.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
