'use client';

/**
 * ImmersiveCanvas — a full-screen canvas overlay for drawing and viewing zones.
 *
 * Modes:
 *   - "view":  read-only, zones are clickable, background fills the container
 *   - "edit":  draw mode toggle, can add/delete zones
 *
 * Background:
 *   - When imageUrl is provided, the image is drawn inside the canvas.
 *   - When transparent=true, the canvas background is clear — use this when
 *     a video or external image sits behind the canvas in a parent element.
 *
 * Zone points are stored as NORMALIZED (0–1) coordinates relative to the
 * container dimensions, so they are resolution-independent.
 *
 * Transparent mode zoom:
 *   Since the canvas is transparent and a <video> sits behind it as a sibling,
 *   we can't zoom just the canvas. Instead we fire `onTransparentZoom` so the
 *   parent can apply a CSS transform to a wrapper that contains both the video
 *   and the canvas, making them scale together.
 */

import React, {
  useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef,
} from 'react';
import {
  MousePointer, Pencil, ZoomIn, ZoomOut, RotateCcw, Trash2,
  Check, X as XIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ZonePoint = { x: number; y: number };   // normalized 0–1

export type ZoneStatus =
  | 'available' | 'coming_soon' | 'sold_out'
  | 'reserved' | 'sold';

export type CanvasZone = {
  id: string;
  label: string;
  points: ZonePoint[];   // normalized 0-1 relative to container
  status: ZoneStatus;
  meta?: Record<string, any>;
};

export type ImmersiveCanvasMode = 'view' | 'edit';

export type ImmersiveCanvasProps = {
  imageUrl?: string;
  /** When true, canvas bg is transparent — parent renders video/image behind */
  transparent?: boolean;
  zones: CanvasZone[];
  mode?: ImmersiveCanvasMode;
  onZoneClick?: (zone: CanvasZone) => void;
  onZoneAdd?: (points: ZonePoint[], id: string) => void;
  onZoneDelete?: (zoneId: string) => void;
  highlightedZoneId?: string | null;
  className?: string;
  /**
   * Called in transparent mode when zoomToZone / resetView change the desired
   * CSS transform. Parent should apply this to a wrapper containing both the
   * <video> and this canvas so they scale together.
   *
   * scale=1 / origin='50% 50%' means "reset to normal".
   */
  onTransparentZoom?: (scale: number, originX: number, originY: number) => void;
};

export interface ImmersiveCanvasRef {
  resetView: () => void;
  zoomToZone: (zoneId: string) => void;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function zoneColor(status: ZoneStatus, alpha = 0.35): string {
  switch (status) {
    case 'available':   return `rgba(52,211,153,${alpha})`;
    case 'coming_soon': return `rgba(251,191,36,${alpha})`;
    case 'sold_out':    return `rgba(239,68,68,${alpha})`;
    case 'reserved':    return `rgba(251,191,36,${alpha})`;
    case 'sold':        return `rgba(156,163,175,${alpha})`;
    default:            return `rgba(99,102,241,${alpha})`;
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

const CLOSE_THRESHOLD_PX = 18;
const MIN_ZOOM  = 0.15;
const MAX_ZOOM  = 8;
const ZOOM_STEP = 0.15;
const DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ─── Component ────────────────────────────────────────────────────────────────

export const ImmersiveCanvas = forwardRef<ImmersiveCanvasRef, ImmersiveCanvasProps>(
  function ImmersiveCanvas(
    {
      imageUrl, transparent = false, zones, mode = 'view',
      onZoneClick, onZoneAdd, onZoneDelete,
      highlightedZoneId, className = '',
      onTransparentZoom,
    },
    ref
  ) {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef     = useRef<HTMLImageElement | null>(null);
    const rafRef       = useRef<number>(0);

    // Internal pan/zoom (image-mode only)
    const zoomRef = useRef(1);
    const panRef  = useRef({ x: 0, y: 0 });
    const [, forceUpdate] = useState(0);
    const triggerRender = useCallback(() => forceUpdate(n => n + 1), []);

    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgSize,   setImgSize]   = useState({ w: 1, h: 1 });

    const [isDrawing,      setIsDrawing]      = useState(false);
    const [drawPath,       setDrawPath]       = useState<ZonePoint[]>([]);
    const [nearStart,      setNearStart]      = useState(false);
    const [isPanning,      setIsPanning]      = useState(false);
    const [dragLast,       setDragLast]       = useState({ x: 0, y: 0 });
    const [hoverZoneId,    setHoverZoneId]    = useState<string | null>(null);
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

    // ── Load image (image-mode only) ────────────────────────────────────────

    useEffect(() => {
      if (transparent) {
        setImgLoaded(true);
        imageRef.current = null;
        return;
      }
      if (!imageUrl) return;
      setImgLoaded(false);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
        setImgLoaded(true);
      };
      img.onerror = () => { imageRef.current = null; setImgLoaded(true); };
      img.src = imageUrl;
      return () => { img.onload = null; img.onerror = null; };
    }, [imageUrl, transparent]);

    // ── Fit to container (image-mode) ───────────────────────────────────────

    const fitToContainer = useCallback(() => {
      if (transparent) {
        // Signal parent to reset CSS zoom
        onTransparentZoom?.(1, 50, 50);
        return;
      }
      const container = containerRef.current;
      if (!container || !imgLoaded) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const img = imageRef.current;
      if (!img) { zoomRef.current = 1; panRef.current = { x: 0, y: 0 }; triggerRender(); return; }
      const z = Math.min(cw / imgSize.w, ch / imgSize.h) * 0.95;
      zoomRef.current = z;
      panRef.current  = {
        x: (cw - imgSize.w * z) / 2,
        y: (ch - imgSize.h * z) / 2,
      };
      triggerRender();
    }, [imgLoaded, imgSize, transparent, triggerRender, onTransparentZoom]);

    useEffect(() => { fitToContainer(); }, [fitToContainer]);

    // ── zoomToZone ──────────────────────────────────────────────────────────

    const zoomToZone = useCallback((zoneId: string) => {
      const zone = zones.find(z => z.id === zoneId);
      if (!zone || zone.points.length < 3) return;
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;

      if (transparent) {
        // Zone points are 0-1 relative to the container.
        // Convert to container px to compute bounding box.
        const xs = zone.points.map(p => p.x * cw);
        const ys = zone.points.map(p => p.y * ch);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const bw = maxX - minX || 1;
        const bh = maxY - minY || 1;
        // Centre of the zone as percentages (for CSS transform-origin)
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const originXpct = (cx / cw) * 100;
        const originYpct = (cy / ch) * 100;
        // Scale so the zone fills ~60% of the screen
        const scale = Math.min(4, Math.min((cw * 0.6) / bw, (ch * 0.6) / bh));

        // Animate via rAF, calling parent each frame
        const startScale = 1; // always animate from identity for simplicity
        const duration   = 400;
        const start      = performance.now();
        const animate = (now: number) => {
          const t    = Math.min(1, (now - start) / duration);
          const ease = 1 - Math.pow(1 - t, 3);
          onTransparentZoom?.(
            lerp(startScale, scale, ease),
            originXpct,
            originYpct,
          );
          if (t < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        return;
      }

      // Image mode — animate internal pan/zoom
      const xs = zone.points.map(p => p.x * imgSize.w);
      const ys = zone.points.map(p => p.y * imgSize.h);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const bw = maxX - minX || 1;
      const bh = maxY - minY || 1;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      const targetZ   = Math.min(MAX_ZOOM, Math.min((cw * 0.6) / bw, (ch * 0.6) / bh));
      const targetPan = { x: cw / 2 - cx * targetZ, y: ch / 2 - cy * targetZ };

      const startZ   = zoomRef.current;
      const startPan = { ...panRef.current };
      const duration = 400;
      const start    = performance.now();
      const animate  = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        zoomRef.current = lerp(startZ, targetZ, ease);
        panRef.current  = {
          x: lerp(startPan.x, targetPan.x, ease),
          y: lerp(startPan.y, targetPan.y, ease),
        };
        triggerRender();
        if (t < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, [zones, imgSize, transparent, triggerRender, onTransparentZoom]);

    useImperativeHandle(ref, () => ({ resetView: fitToContainer, zoomToZone }));

    // ── Canvas resize ───────────────────────────────────────────────────────

    useEffect(() => {
      const obs = new ResizeObserver(() => {
        const canvas = canvasRef.current;
        const cont   = containerRef.current;
        if (!canvas || !cont) return;
        const w = cont.clientWidth;
        const h = cont.clientHeight;
        canvas.width        = w * DPR;
        canvas.height       = h * DPR;
        canvas.style.width  = `${w}px`;
        canvas.style.height = `${h}px`;
        fitToContainer();
      });
      if (containerRef.current) obs.observe(containerRef.current);
      return () => obs.disconnect();
    }, [fitToContainer]);

    // ── Helpers ─────────────────────────────────────────────────────────────

    const getCanvasPos = (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    // In image mode: convert image-space pixel → normalized
    const imageToNorm = (p: ZonePoint): ZonePoint => ({
      x: p.x / imgSize.w,
      y: p.y / imgSize.h,
    });

    // In image mode: normalized → image-space pixel → canvas pixel
    const normToCanvas = (p: ZonePoint): ZonePoint => ({
      x: p.x * imgSize.w * zoomRef.current + panRef.current.x,
      y: p.y * imgSize.h * zoomRef.current + panRef.current.y,
    });

    // ── Draw loop ───────────────────────────────────────────────────────────

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx    = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      const zoom = zoomRef.current;
      const pan  = panRef.current;
      const W = canvas.width  / DPR;
      const H = canvas.height / DPR;

      ctx.save();
      ctx.scale(DPR, DPR);
      ctx.clearRect(0, 0, W, H);

      // Background (image-mode only)
      if (!transparent) {
        const img = imageRef.current;
        if (img) {
          ctx.drawImage(img, pan.x, pan.y, imgSize.w * zoom, imgSize.h * zoom);
        } else {
          ctx.fillStyle = '#111';
          ctx.fillRect(0, 0, W, H);
        }
      }

      // ── Draw zones ──────────────────────────────────────────────────────
      for (const zone of zones) {
        if (zone.points.length < 3) continue;

        // TRANSPARENT MODE: zone 0-1 → container pixels (W×H)
        // IMAGE MODE:       zone 0-1 → image pixels → canvas pixels via pan/zoom
        const pts = transparent
          ? zone.points.map(p => ({ x: p.x * W, y: p.y * H }))
          : zone.points.map(p => ({
              x: p.x * imgSize.w * zoom + pan.x,
              y: p.y * imgSize.h * zoom + pan.y,
            }));

        const isHov = zone.id === hoverZoneId || zone.id === highlightedZoneId;
        const isSel = zone.id === selectedZoneId;

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();

        ctx.fillStyle   = zoneColor(zone.status, isHov || isSel ? 0.55 : 0.25);
        ctx.strokeStyle = zoneBorderColor(zone.status);
        ctx.lineWidth   = isHov || isSel ? 2.5 : 1.5;
        ctx.fill();
        ctx.stroke();

        // Label
        if (transparent || zoom > 0.25) {
          const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
          const fontSize = transparent ? 13 : Math.max(10, Math.min(16, zoom * 14));
          ctx.font         = `600 ${fontSize}px system-ui, sans-serif`;
          ctx.fillStyle    = '#fff';
          ctx.shadowColor  = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur   = 5;
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(zone.label, cx, cy);
          ctx.shadowBlur   = 0;
        }
      }

      // ── Draw in-progress polygon ────────────────────────────────────────
      if (isDrawing && drawPath.length > 0) {
        // drawPath points: transparent → 0-1; image → image px
        const pts = drawPath.map(p => transparent
          ? { x: p.x * W, y: p.y * H }
          : { x: p.x * zoom + pan.x, y: p.y * zoom + pan.y }
        );
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth   = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        for (const p of pts) {
          ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#f97316'; ctx.fill();
        }
        if (nearStart && drawPath.length > 2) {
          ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 10, 0, Math.PI * 2);
          ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.stroke();
        }
      }

      ctx.restore();
    }, [
      zones, drawPath, isDrawing, nearStart,
      hoverZoneId, highlightedZoneId, selectedZoneId,
      imgSize, transparent,
    ]);

    useEffect(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(render);
      return () => cancelAnimationFrame(rafRef.current);
    }, [render]);

    // ── Hit test ────────────────────────────────────────────────────────────
    // Must mirror the exact same coordinate transform used in the render loop.

    const hitTest = useCallback((cx: number, cy: number): CanvasZone | null => {
      const zoom = zoomRef.current;
      const pan  = panRef.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      const CW   = rect?.width  ?? 1;
      const CH   = rect?.height ?? 1;

      for (let i = zones.length - 1; i >= 0; i--) {
        const zone = zones[i];
        if (zone.points.length < 3) continue;

        // Same transform as render:
        const pts = transparent
          ? zone.points.map(p => ({ x: p.x * CW, y: p.y * CH }))
          : zone.points.map(p => ({
              x: p.x * imgSize.w * zoom + pan.x,
              y: p.y * imgSize.h * zoom + pan.y,
            }));

        // Test point is already in canvas-pixel space (from getBoundingClientRect)
        let inside = false;
        for (let j = 0, k = pts.length - 1; j < pts.length; k = j++) {
          const xi = pts[j].x, yi = pts[j].y;
          const xk = pts[k].x, yk = pts[k].y;
          if ((yi > cy) !== (yk > cy) && cx < ((xk - xi) * (cy - yi)) / (yk - yi) + xi) {
            inside = !inside;
          }
        }
        if (inside) return zone;
      }
      return null;
    }, [zones, transparent, imgSize]);

    // ── Mouse handlers ──────────────────────────────────────────────────────

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      const pos = getCanvasPos(e);

      if (transparent) {
        if (isDrawing) {
          const rect = canvasRef.current!.getBoundingClientRect();
          const normPt: ZonePoint = { x: pos.x / rect.width, y: pos.y / rect.height };
          if (nearStart && drawPath.length > 2) {
            onZoneAdd?.(drawPath, `zone-${Date.now()}`);
            setDrawPath([]); setNearStart(false);
          } else {
            setDrawPath(prev => [...prev, normPt]);
          }
        }
        return;
      }

      if (isDrawing) {
        // image mode: store as image-px (will normalize on save)
        const imgPt: ZonePoint = {
          x: (pos.x - panRef.current.x) / zoomRef.current,
          y: (pos.y - panRef.current.y) / zoomRef.current,
        };
        if (nearStart && drawPath.length > 2) {
          onZoneAdd?.(drawPath.map(imageToNorm), `zone-${Date.now()}`);
          setDrawPath([]); setNearStart(false);
        } else {
          setDrawPath(prev => [...prev, imgPt]);
        }
        return;
      }

      setIsPanning(true);
      setDragLast(pos);
    }, [isDrawing, nearStart, drawPath, onZoneAdd, transparent]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      const pos = getCanvasPos(e);

      // Update hover zone
      if (!isDrawing) {
        setHoverZoneId(hitTest(pos.x, pos.y)?.id ?? null);
      }

      // Panning (image mode only)
      if (isPanning && !transparent) {
        panRef.current = {
          x: panRef.current.x + pos.x - dragLast.x,
          y: panRef.current.y + pos.y - dragLast.y,
        };
        setDragLast(pos);
        triggerRender();
        return;
      }

      // Near-start detection for drawing
      if (isDrawing && drawPath.length > 2) {
        if (transparent) {
          const rect = canvasRef.current!.getBoundingClientRect();
          const sx = drawPath[0].x * rect.width;
          const sy = drawPath[0].y * rect.height;
          setNearStart(Math.hypot(pos.x - sx, pos.y - sy) < CLOSE_THRESHOLD_PX);
        } else {
          const sx = drawPath[0].x * zoomRef.current + panRef.current.x;
          const sy = drawPath[0].y * zoomRef.current + panRef.current.y;
          setNearStart(Math.hypot(pos.x - sx, pos.y - sy) < CLOSE_THRESHOLD_PX);
        }
      }
    }, [isDrawing, isPanning, drawPath, dragLast, hitTest, transparent, triggerRender]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
      const pos = getCanvasPos(e);

      if (transparent) {
        if (!isDrawing) {
          const zone = hitTest(pos.x, pos.y);
          if (zone) {
            if (mode === 'view') onZoneClick?.(zone);
            else setSelectedZoneId(prev => prev === zone.id ? null : zone.id);
          }
        }
        return;
      }

      if (!isPanning) return;
      setIsPanning(false);
      const dx = pos.x - dragLast.x;
      const dy = pos.y - dragLast.y;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4 && !isDrawing) {
        const zone = hitTest(pos.x, pos.y);
        if (zone) {
          if (mode === 'view') onZoneClick?.(zone);
          else setSelectedZoneId(prev => prev === zone.id ? null : zone.id);
        }
      }
    }, [isPanning, dragLast, isDrawing, hitTest, mode, onZoneClick, transparent]);

    const handleDblClick = useCallback(() => {
      if (isDrawing && drawPath.length >= 3) {
        const normPath = transparent
          ? drawPath   // already 0-1
          : drawPath.map(imageToNorm);
        onZoneAdd?.(normPath, `zone-${Date.now()}`);
        setDrawPath([]); setNearStart(false);
      }
    }, [isDrawing, drawPath, onZoneAdd, transparent]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
      if (transparent) return; // parent video handles visual size
      e.preventDefault();
      const pos   = getCanvasPos(e);
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZ  = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current + delta));
      if (newZ === zoomRef.current) return;
      panRef.current = {
        x: pos.x - (pos.x - panRef.current.x) * (newZ / zoomRef.current),
        y: pos.y - (pos.y - panRef.current.y) * (newZ / zoomRef.current),
      };
      zoomRef.current = newZ;
      triggerRender();
    }, [transparent, triggerRender]);

    useEffect(() => {
      const fn = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setDrawPath([]); setNearStart(false); setIsDrawing(false); setSelectedZoneId(null);
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedZoneId && mode === 'edit') {
          onZoneDelete?.(selectedZoneId); setSelectedZoneId(null);
        }
      };
      window.addEventListener('keydown', fn);
      return () => window.removeEventListener('keydown', fn);
    }, [selectedZoneId, mode, onZoneDelete]);

    const cursor = isDrawing
      ? (nearStart && drawPath.length > 2 ? 'pointer' : 'crosshair')
      : isPanning ? 'grabbing'
      : hoverZoneId ? 'pointer'
      : transparent ? 'default'
      : 'grab';

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

        {/* Controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          {!transparent && (
            <>
              <button
                onClick={() => { zoomRef.current = Math.min(MAX_ZOOM, zoomRef.current + ZOOM_STEP); triggerRender(); }}
                className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => { zoomRef.current = Math.max(MIN_ZOOM, zoomRef.current - ZOOM_STEP); triggerRender(); }}
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
            </>
          )}
          {mode === 'edit' && (
            <>
              {!transparent && <div className="border-t border-white/10 my-0.5" />}
              <button
                onClick={() => { setIsDrawing(false); setDrawPath([]); setNearStart(false); }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm border text-white ${
                  !isDrawing ? 'bg-white/20 border-white/40' : 'bg-black/60 border-white/10 hover:bg-black/80'
                }`}
                title="Select"
              >
                <MousePointer className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setIsDrawing(true); setDrawPath([]); setNearStart(false); }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm border text-white ${
                  isDrawing ? 'bg-orange-500/80 border-orange-400' : 'bg-black/60 border-white/10 hover:bg-black/80'
                }`}
                title="Draw zone"
              >
                <Pencil className="w-4 h-4" />
              </button>
              {selectedZoneId && (
                <button
                  onClick={() => { onZoneDelete?.(selectedZoneId); setSelectedZoneId(null); }}
                  className="w-8 h-8 rounded-lg bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur-sm border border-red-400"
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
                    : 'Continue clicking — double-click or click start to finish'}
            </div>
            {drawPath.length >= 3 && (
              <button
                onClick={() => {
                  const normPath = transparent ? drawPath : drawPath.map(imageToNorm);
                  onZoneAdd?.(normPath, `zone-${Date.now()}`);
                  setDrawPath([]); setNearStart(false);
                }}
                className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Finish Zone
              </button>
            )}
            {drawPath.length > 0 && (
              <button
                onClick={() => { setDrawPath([]); setNearStart(false); }}
                className="bg-black/60 text-white px-3 py-2 rounded-full text-xs border border-white/20"
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
