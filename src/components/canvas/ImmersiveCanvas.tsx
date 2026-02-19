'use client';

/**
 * ImmersiveCanvas — full-screen canvas overlay for drawing and viewing zones.
 *
 * Modes:
 *   "view" — read-only, zones are clickable / tappable
 *   "edit" — draw mode toggle, can add/delete zones
 *
 * Background:
 *   imageUrl provided → image drawn inside canvas with internal pan/zoom
 *   transparent=true  → canvas is clear; parent renders video/image behind it
 *
 * Zone coords: NORMALIZED (0–1) relative to container dimensions.
 *
 * Transparent-mode pan/zoom:
 *   Parent wraps both <video> and this canvas in a single div and applies:
 *     transform: translate(${tx}px, ${ty}px) scale(${scale})
 *     transform-origin: 0 0
 *   Fires `onTransparentZoom(scale, tx, ty)` on every change so parent stays in sync.
 *
 * Touch support (mobile):
 *   • 1-finger tap   → zone click
 *   • 1-finger drag  → pan  (transparent: only when zoomed in)
 *   • 2-finger pinch → zoom (both transparent + image modes)
 */

import React, {
  useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef,
} from 'react';
import {
  MousePointer, Pencil, ZoomIn, ZoomOut, RotateCcw, Trash2,
  Check, X as XIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ZonePoint  = { x: number; y: number };

export type ZoneStatus =
  | 'available' | 'coming_soon' | 'sold_out' | 'reserved' | 'sold';

export type CanvasZone = {
  id: string; label: string;
  points: ZonePoint[];   // normalized 0-1 relative to container
  status: ZoneStatus;
  meta?: Record<string, any>;
};

export type ImmersiveCanvasMode = 'view' | 'edit';

export type ImmersiveCanvasProps = {
  imageUrl?: string;
  transparent?: boolean;
  zones: CanvasZone[];
  mode?: ImmersiveCanvasMode;
  onZoneClick?: (zone: CanvasZone) => void;
  onZoneAdd?:   (points: ZonePoint[], id: string) => void;
  onZoneDelete?: (zoneId: string) => void;
  highlightedZoneId?: string | null;
  className?: string;
  /**
   * Transparent mode: called whenever view transform changes.
   * Parent must apply:
   *   transform: translate(${tx}px, ${ty}px) scale(${scale})
   *   transform-origin: 0 0
   * to a wrapper div that contains BOTH the <video> and this canvas.
   * scale=1, tx=0, ty=0 → identity / reset.
   */
  onTransparentZoom?: (scale: number, tx: number, ty: number) => void;
};

export interface ImmersiveCanvasRef {
  resetView:  () => void;
  zoomToZone: (zoneId: string) => void;
}

// ─── Colours ─────────────────────────────────────────────────────────────────

function zoneColor(status: ZoneStatus, alpha = 0.35): string {
  if (status === 'available')   return `rgba(52,211,153,${alpha})`;
  if (status === 'coming_soon') return `rgba(251,191,36,${alpha})`;
  if (status === 'sold_out')    return `rgba(239,68,68,${alpha})`;
  if (status === 'reserved')    return `rgba(251,191,36,${alpha})`;
  if (status === 'sold')        return `rgba(156,163,175,${alpha})`;
  return `rgba(99,102,241,${alpha})`;
}
function zoneBorderColor(status: ZoneStatus): string {
  if (status === 'available')   return 'rgba(52,211,153,0.9)';
  if (status === 'coming_soon') return 'rgba(251,191,36,0.9)';
  if (status === 'sold_out')    return 'rgba(239,68,68,0.9)';
  if (status === 'reserved')    return 'rgba(251,191,36,0.9)';
  if (status === 'sold')        return 'rgba(156,163,175,0.7)';
  return 'rgba(99,102,241,0.9)';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOSE_PX = 18;
const MIN_Z    = 0.15;
const MAX_Z    = 8;
const Z_STEP   = 0.15;
const DPR = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function clampTransparent(scale: number, tx: number, ty: number, cw: number, ch: number) {
  if (scale <= 1) return { tx: 0, ty: 0 };
  return {
    tx: Math.min(0, Math.max(cw  * (1 - scale), tx)),
    ty: Math.min(0, Math.max(ch * (1 - scale), ty)),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ImmersiveCanvas = forwardRef<ImmersiveCanvasRef, ImmersiveCanvasProps>(
  function ImmersiveCanvas({
    imageUrl, transparent = false, zones, mode = 'view',
    onZoneClick, onZoneAdd, onZoneDelete,
    highlightedZoneId, className = '',
    onTransparentZoom,
  }, ref) {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef     = useRef<HTMLImageElement | null>(null);
    const rafRef       = useRef<number>(0);

    // Image-mode internal pan/zoom
    const zoomRef = useRef(1);
    const panRef  = useRef({ x: 0, y: 0 });
    const [, forceUpdate] = useState(0);
    const rerender = useCallback(() => forceUpdate(n => n + 1), []);

    // Transparent-mode transform state (kept in refs to avoid flicker)
    const tScale = useRef(1);
    const tTx    = useRef(0);
    const tTy    = useRef(0);

    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgSize,   setImgSize]   = useState({ w: 1, h: 1 });

    // Drawing state
    const [isDrawing,   setIsDrawing]   = useState(false);
    const [drawPath,    setDrawPath]    = useState<ZonePoint[]>([]);
    const [nearStart,   setNearStart]   = useState(false);
    // Mouse drag state
    const [isPanning,   setIsPanning]   = useState(false);
    const [dragLast,    setDragLast]    = useState({ x: 0, y: 0 });
    // Hover / selection
    const [hoverZoneId, setHoverZoneId] = useState<string | null>(null);
    const [selZoneId,   setSelZoneId]   = useState<string | null>(null);

    // Touch gesture bookkeeping (mutable ref — no re-render needed)
    const touch = useRef({
      active:     [] as { id: number; x: number; y: number }[],
      tapStart:   null as { x: number; y: number } | null,
      tapTime:    0,
      moved:      false,
      pinching:   false,
    });

    // ── Image load ────────────────────────────────────────────────────────

    useEffect(() => {
      if (transparent) { setImgLoaded(true); imageRef.current = null; return; }
      if (!imageUrl) return;
      setImgLoaded(false);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { imageRef.current = img; setImgSize({ w: img.naturalWidth, h: img.naturalHeight }); setImgLoaded(true); };
      img.onerror = () => { imageRef.current = null; setImgLoaded(true); };
      img.src = imageUrl;
      return () => { img.onload = null; img.onerror = null; };
    }, [imageUrl, transparent]);

    // ── Fit / reset ───────────────────────────────────────────────────────

    const fitToContainer = useCallback(() => {
      if (transparent) {
        tScale.current = 1; tTx.current = 0; tTy.current = 0;
        onTransparentZoom?.(1, 0, 0);
        return;
      }
      const c = containerRef.current;
      if (!c || !imgLoaded) return;
      const cw = c.clientWidth; const ch = c.clientHeight;
      const img = imageRef.current;
      if (!img) { zoomRef.current = 1; panRef.current = { x: 0, y: 0 }; rerender(); return; }
      const z = Math.min(cw / imgSize.w, ch / imgSize.h) * 0.95;
      zoomRef.current = z;
      panRef.current  = { x: (cw - imgSize.w * z) / 2, y: (ch - imgSize.h * z) / 2 };
      rerender();
    }, [imgLoaded, imgSize, transparent, rerender, onTransparentZoom]);

    useEffect(() => { fitToContainer(); }, [fitToContainer]);

    // ── zoomToZone ────────────────────────────────────────────────────────

    const zoomToZone = useCallback((zoneId: string) => {
      const zone = zones.find(z => z.id === zoneId);
      if (!zone || zone.points.length < 3) return;
      const c = containerRef.current; if (!c) return;
      const cw = c.clientWidth; const ch = c.clientHeight;

      if (transparent) {
        const xs = zone.points.map(p => p.x * cw);
        const ys = zone.points.map(p => p.y * ch);
        const x0 = Math.min(...xs), x1 = Math.max(...xs);
        const y0 = Math.min(...ys), y1 = Math.max(...ys);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const targetScale = Math.min(4, Math.min((cw * 0.6) / ((x1 - x0) || 1), (ch * 0.6) / ((y1 - y0) || 1)));
        // translate so zone center appears at viewport center: cw/2 = tx + cx*s
        const rawTx = cw / 2 - cx * targetScale;
        const rawTy = ch / 2 - cy * targetScale;
        const { tx: tgtTx, ty: tgtTy } = clampTransparent(targetScale, rawTx, rawTy, cw, ch);

        const s0 = tScale.current, tx0 = tTx.current, ty0 = tTy.current;
        const dur = 400, t0 = performance.now();
        const go = (now: number) => {
          const t = Math.min(1, (now - t0) / dur);
          const e = 1 - Math.pow(1 - t, 3);
          tScale.current = lerp(s0, targetScale, e);
          tTx.current    = lerp(tx0, tgtTx, e);
          tTy.current    = lerp(ty0, tgtTy, e);
          onTransparentZoom?.(tScale.current, tTx.current, tTy.current);
          if (t < 1) requestAnimationFrame(go);
        };
        requestAnimationFrame(go);
        return;
      }

      // Image mode
      const xs = zone.points.map(p => p.x * imgSize.w);
      const ys = zone.points.map(p => p.y * imgSize.h);
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const y0 = Math.min(...ys), y1 = Math.max(...ys);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const targetZ   = Math.min(MAX_Z, Math.min((cw * 0.6) / ((x1 - x0) || 1), (ch * 0.6) / ((y1 - y0) || 1)));
      const targetPan = { x: cw / 2 - cx * targetZ, y: ch / 2 - cy * targetZ };
      const z0 = zoomRef.current, p0 = { ...panRef.current };
      const dur = 400, t0 = performance.now();
      const go = (now: number) => {
        const t = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - t, 3);
        zoomRef.current = lerp(z0, targetZ, e);
        panRef.current  = { x: lerp(p0.x, targetPan.x, e), y: lerp(p0.y, targetPan.y, e) };
        rerender(); if (t < 1) requestAnimationFrame(go);
      };
      requestAnimationFrame(go);
    }, [zones, imgSize, transparent, rerender, onTransparentZoom]);

    useImperativeHandle(ref, () => ({ resetView: fitToContainer, zoomToZone }));

    // ── Canvas resize observer ────────────────────────────────────────────

    useEffect(() => {
      const obs = new ResizeObserver(() => {
        const cv = canvasRef.current; const co = containerRef.current;
        if (!cv || !co) return;
        const w = co.clientWidth, h = co.clientHeight;
        cv.width = w * DPR; cv.height = h * DPR;
        cv.style.width = `${w}px`; cv.style.height = `${h}px`;
        fitToContainer();
      });
      if (containerRef.current) obs.observe(containerRef.current);
      return () => obs.disconnect();
    }, [fitToContainer]);

    // ── Hit test ──────────────────────────────────────────────────────────

    const hitTest = useCallback((px: number, py: number): CanvasZone | null => {
      const z = zoomRef.current, p = panRef.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      const CW = rect?.width ?? 1, CH = rect?.height ?? 1;
      for (let i = zones.length - 1; i >= 0; i--) {
        const zone = zones[i]; if (zone.points.length < 3) continue;
        const pts = transparent
          ? zone.points.map(q => ({ x: q.x * CW, y: q.y * CH }))
          : zone.points.map(q => ({ x: q.x * imgSize.w * z + p.x, y: q.y * imgSize.h * z + p.y }));
        let inside = false;
        for (let j = 0, k = pts.length - 1; j < pts.length; k = j++) {
          const xi = pts[j].x, yi = pts[j].y, xk = pts[k].x, yk = pts[k].y;
          if ((yi > py) !== (yk > py) && px < ((xk - xi) * (py - yi)) / (yk - yi) + xi) inside = !inside;
        }
        if (inside) return zone;
      }
      return null;
    }, [zones, transparent, imgSize]);

    // ── Draw render loop ──────────────────────────────────────────────────

    const render = useCallback(() => {
      const cv = canvasRef.current; const ctx = cv?.getContext('2d');
      if (!ctx || !cv) return;
      const z = zoomRef.current, p = panRef.current;
      const W = cv.width / DPR, H = cv.height / DPR;
      ctx.save(); ctx.scale(DPR, DPR); ctx.clearRect(0, 0, W, H);

      if (!transparent) {
        const img = imageRef.current;
        if (img) ctx.drawImage(img, p.x, p.y, imgSize.w * z, imgSize.h * z);
        else { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); }
      }

      for (const zone of zones) {
        if (zone.points.length < 3) continue;
        const pts = transparent
          ? zone.points.map(q => ({ x: q.x * W, y: q.y * H }))
          : zone.points.map(q => ({ x: q.x * imgSize.w * z + p.x, y: q.y * imgSize.h * z + p.y }));
        const hot = zone.id === hoverZoneId || zone.id === highlightedZoneId || zone.id === selZoneId;
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.fillStyle   = zoneColor(zone.status, hot ? 0.55 : 0.25);
        ctx.strokeStyle = zoneBorderColor(zone.status);
        ctx.lineWidth   = hot ? 2.5 : 1.5;
        ctx.fill(); ctx.stroke();
        if (transparent || z > 0.25) {
          const cx = pts.reduce((s, q) => s + q.x, 0) / pts.length;
          const cy = pts.reduce((s, q) => s + q.y, 0) / pts.length;
          const fs = transparent ? 13 : Math.max(10, Math.min(16, z * 14));
          ctx.font = `600 ${fs}px system-ui,sans-serif`; ctx.fillStyle = '#fff';
          ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 5;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(zone.label, cx, cy); ctx.shadowBlur = 0;
        }
      }

      if (isDrawing && drawPath.length > 0) {
        const pts = drawPath.map(q => transparent ? { x: q.x * W, y: q.y * H } : { x: q.x * z + p.x, y: q.y * z + p.y });
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
        for (const q of pts) { ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#f97316'; ctx.fill(); }
        if (nearStart && drawPath.length > 2) { ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 10, 0, Math.PI * 2); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.stroke(); }
      }
      ctx.restore();
    }, [zones, drawPath, isDrawing, nearStart, hoverZoneId, highlightedZoneId, selZoneId, imgSize, transparent]);

    useEffect(() => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(render); return () => cancelAnimationFrame(rafRef.current); }, [render]);

    // ── imageToNorm helper ────────────────────────────────────────────────

    const imageToNorm = useCallback((q: ZonePoint): ZonePoint => ({ x: q.x / imgSize.w, y: q.y / imgSize.h }), [imgSize]);

    // ── Mouse handlers ────────────────────────────────────────────────────

    const getMousePos = (e: React.MouseEvent) => {
      const r = canvasRef.current!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      const pos = getMousePos(e);
      if (transparent) {
        if (isDrawing) {
          const r = canvasRef.current!.getBoundingClientRect();
          const np: ZonePoint = { x: pos.x / r.width, y: pos.y / r.height };
          if (nearStart && drawPath.length > 2) { onZoneAdd?.(drawPath, `zone-${Date.now()}`); setDrawPath([]); setNearStart(false); }
          else setDrawPath(prev => [...prev, np]);
        }
        return;
      }
      if (isDrawing) {
        const ip: ZonePoint = { x: (pos.x - panRef.current.x) / zoomRef.current, y: (pos.y - panRef.current.y) / zoomRef.current };
        if (nearStart && drawPath.length > 2) { onZoneAdd?.(drawPath.map(imageToNorm), `zone-${Date.now()}`); setDrawPath([]); setNearStart(false); }
        else setDrawPath(prev => [...prev, ip]);
        return;
      }
      setIsPanning(true); setDragLast(pos);
    }, [isDrawing, nearStart, drawPath, onZoneAdd, transparent, imageToNorm]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      const pos = getMousePos(e);
      if (!isDrawing) setHoverZoneId(hitTest(pos.x, pos.y)?.id ?? null);
      if (isPanning && !transparent) {
        panRef.current = { x: panRef.current.x + pos.x - dragLast.x, y: panRef.current.y + pos.y - dragLast.y };
        setDragLast(pos); rerender(); return;
      }
      if (isDrawing && drawPath.length > 2) {
        if (transparent) {
          const r = canvasRef.current!.getBoundingClientRect();
          setNearStart(Math.hypot(pos.x - drawPath[0].x * r.width, pos.y - drawPath[0].y * r.height) < CLOSE_PX);
        } else {
          setNearStart(Math.hypot(pos.x - (drawPath[0].x * zoomRef.current + panRef.current.x), pos.y - (drawPath[0].y * zoomRef.current + panRef.current.y)) < CLOSE_PX);
        }
      }
    }, [isDrawing, isPanning, drawPath, dragLast, hitTest, transparent, rerender]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
      const pos = getMousePos(e);
      if (transparent) {
        if (!isDrawing) { const z = hitTest(pos.x, pos.y); if (z) { if (mode === 'view') onZoneClick?.(z); else setSelZoneId(p => p === z.id ? null : z.id); } }
        return;
      }
      if (!isPanning) return; setIsPanning(false);
      const dx = pos.x - dragLast.x, dy = pos.y - dragLast.y;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4 && !isDrawing) { const z = hitTest(pos.x, pos.y); if (z) { if (mode === 'view') onZoneClick?.(z); else setSelZoneId(p => p === z.id ? null : z.id); } }
    }, [isPanning, dragLast, isDrawing, hitTest, mode, onZoneClick, transparent]);

    const handleDblClick = useCallback(() => {
      if (isDrawing && drawPath.length >= 3) { onZoneAdd?.(transparent ? drawPath : drawPath.map(imageToNorm), `zone-${Date.now()}`); setDrawPath([]); setNearStart(false); }
    }, [isDrawing, drawPath, onZoneAdd, transparent, imageToNorm]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
      if (transparent) return; e.preventDefault();
      const pos = getMousePos(e);
      const delta = e.deltaY > 0 ? -Z_STEP : Z_STEP;
      const nz = Math.min(MAX_Z, Math.max(MIN_Z, zoomRef.current + delta));
      if (nz === zoomRef.current) return;
      panRef.current = { x: pos.x - (pos.x - panRef.current.x) * (nz / zoomRef.current), y: pos.y - (pos.y - panRef.current.y) * (nz / zoomRef.current) };
      zoomRef.current = nz; rerender();
    }, [transparent, rerender]);

    // ── Touch handlers ────────────────────────────────────────────────────

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      const ts = Array.from(e.touches);
      const st = touch.current;
      st.pinching = false; st.moved = false;
      if (ts.length === 1) {
        const r = canvasRef.current!.getBoundingClientRect();
        st.tapStart = { x: ts[0].clientX - r.left, y: ts[0].clientY - r.top };
        st.tapTime  = Date.now();
      }
      st.active = ts.map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      const ts  = Array.from(e.touches);
      const st  = touch.current;
      const prev = st.active;

      if (ts.length >= 2 && prev.length >= 2) {
        // ── Pinch zoom + two-finger pan ──────────────────────────────────
        st.pinching = true; st.moved = true;
        const p0 = prev.find(p => p.id === ts[0].identifier) ?? prev[0];
        const p1 = prev.find(p => p.id === ts[1].identifier) ?? prev[1];
        if (!p0 || !p1) { st.active = ts.map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY })); return; }

        const prevDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const currDist = Math.hypot(ts[1].clientX - ts[0].clientX, ts[1].clientY - ts[0].clientY);
        const ratio    = currDist / Math.max(prevDist, 1);

        const prevMx = (p0.x + p1.x) / 2, prevMy = (p0.y + p1.y) / 2;
        const currMx = (ts[0].clientX + ts[1].clientX) / 2;
        const currMy = (ts[0].clientY + ts[1].clientY) / 2;
        const pdx = currMx - prevMx, pdy = currMy - prevMy;

        const r  = canvasRef.current!.getBoundingClientRect();
        // canvas getBoundingClientRect() reflects the CSS transform:
        //   r.left = tTx,  r.width = containerWidth * tScale
        // So wrapper-local (original) coords of pinch midpoint:
        //   origMx = (screenX - r.left) / tScale
        // For the image-mode canvas (no CSS transform), mx is just screen-relative.
        const mx = currMx - r.left;  // screen-relative, same space for both modes
        const my = currMy - r.top;

        if (transparent) {
          const os  = tScale.current;
          const ns  = Math.max(1, Math.min(MAX_Z, os * ratio));
          // Wrapper-local anchor point (before scale change)
          const origMx = mx / os;
          const origMy = my / os;
          // New tx keeps origMx at same screen position + adds finger pan
          // screenPos = tTx + origPos * scale  =>  newTx = tTx + origMx*(os-ns) + pdx
          const tx = tTx.current + origMx * (os - ns) + pdx;
          const ty = tTy.current + origMy * (os - ns) + pdy;
          const cl = clampTransparent(ns, tx, ty, r.width / os, r.height / os);
          tScale.current = ns; tTx.current = cl.tx; tTy.current = cl.ty;
          onTransparentZoom?.(ns, cl.tx, cl.ty);
        } else {
          const oz = zoomRef.current;
          const nz = Math.max(MIN_Z, Math.min(MAX_Z, oz * ratio));
          panRef.current = {
            x: mx - (mx - panRef.current.x) * (nz / oz) + pdx,
            y: my - (my - panRef.current.y) * (nz / oz) + pdy,
          };
          zoomRef.current = nz; rerender();
        }

      } else if (ts.length === 1 && !st.pinching) {
        // ── Single-finger pan ────────────────────────────────────────────
        const p = prev.find(q => q.id === ts[0].identifier) ?? prev[0];
        if (!p) { st.active = ts.map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY })); return; }
        const dx = ts[0].clientX - p.x, dy = ts[0].clientY - p.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) st.moved = true;
        if (st.moved && !isDrawing) {
          if (transparent) {
            // Only pan the canvas when zoomed in; at scale≈1 let page scroll
            if (tScale.current > 1.05) {
              const r = canvasRef.current!.getBoundingClientRect();
              // r.width is scaled by CSS transform; divide to get original container size
              const cw = r.width  / tScale.current;
              const ch = r.height / tScale.current;
              const cl = clampTransparent(tScale.current, tTx.current + dx, tTy.current + dy, cw, ch);
              tTx.current = cl.tx; tTy.current = cl.ty;
              onTransparentZoom?.(tScale.current, cl.tx, cl.ty);
            }
          } else {
            panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
            rerender();
          }
        }
      }

      st.active = ts.map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
    }, [transparent, onTransparentZoom, rerender, isDrawing]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      const st = touch.current;

      // ── Tap detection ────────────────────────────────────────────────
      if (e.changedTouches.length === 1 && !st.moved && !st.pinching && st.tapStart) {
        const elapsed = Date.now() - st.tapTime;
        if (elapsed < 500) {
          const pos = st.tapStart;
          if (!isDrawing) {
            const zone = hitTest(pos.x, pos.y);
            if (zone) {
              if (mode === 'view') onZoneClick?.(zone);
              else setSelZoneId(p => p === zone.id ? null : zone.id);
            }
          } else {
            // Tap adds draw point
            if (transparent) {
              const r  = canvasRef.current!.getBoundingClientRect();
              const np: ZonePoint = { x: pos.x / r.width, y: pos.y / r.height };
              if (nearStart && drawPath.length > 2) { onZoneAdd?.(drawPath, `zone-${Date.now()}`); setDrawPath([]); setNearStart(false); }
              else setDrawPath(prev => [...prev, np]);
            } else {
              const ip: ZonePoint = { x: (pos.x - panRef.current.x) / zoomRef.current, y: (pos.y - panRef.current.y) / zoomRef.current };
              if (nearStart && drawPath.length > 2) { onZoneAdd?.(drawPath.map(imageToNorm), `zone-${Date.now()}`); setDrawPath([]); setNearStart(false); }
              else setDrawPath(prev => [...prev, ip]);
            }
          }
        }
      }

      if (e.touches.length === 0) {
        st.active = []; st.tapStart = null; st.moved = false; st.pinching = false;
        setHoverZoneId(null);
      } else {
        // Transitioning from 2→1 fingers: reset pan baseline
        st.active   = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
        st.tapStart = null; st.moved = false;
      }
    }, [isDrawing, hitTest, mode, onZoneClick, transparent, nearStart, drawPath, onZoneAdd, imageToNorm]);

    // ── Keyboard ──────────────────────────────────────────────────────────

    useEffect(() => {
      const fn = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { setDrawPath([]); setNearStart(false); setIsDrawing(false); setSelZoneId(null); }
        if ((e.key === 'Delete' || e.key === 'Backspace') && selZoneId && mode === 'edit') { onZoneDelete?.(selZoneId); setSelZoneId(null); }
      };
      window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn);
    }, [selZoneId, mode, onZoneDelete]);

    const cursor = isDrawing
      ? (nearStart && drawPath.length > 2 ? 'pointer' : 'crosshair')
      : isPanning ? 'grabbing'
      : hoverZoneId ? 'pointer'
      : transparent ? 'default'
      : 'grab';

    // ── JSX ───────────────────────────────────────────────────────────────

    return (
      <div ref={containerRef} className={`relative w-full h-full select-none ${className}`}>
        <canvas
          ref={canvasRef}
          style={{ cursor, touchAction: 'none' }}
          className="w-full h-full block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDblClick}
          onWheel={handleWheel}
          onContextMenu={e => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Zoom / reset controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          {!transparent && <>
            <button onClick={() => { zoomRef.current = Math.min(MAX_Z, zoomRef.current + Z_STEP); rerender(); }} className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => { zoomRef.current = Math.max(MIN_Z, zoomRef.current - Z_STEP); rerender(); }} className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={fitToContainer} className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10"><RotateCcw className="w-4 h-4" /></button>
          </>}
          {transparent && (
            <button onClick={fitToContainer} className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10" title="Reset zoom"><RotateCcw className="w-4 h-4" /></button>
          )}
          {mode === 'edit' && <>
            {!transparent && <div className="border-t border-white/10 my-0.5" />}
            <button onClick={() => { setIsDrawing(false); setDrawPath([]); setNearStart(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm border text-white ${!isDrawing ? 'bg-white/20 border-white/40' : 'bg-black/60 border-white/10 hover:bg-black/80'}`}><MousePointer className="w-4 h-4" /></button>
            <button onClick={() => { setIsDrawing(true); setDrawPath([]); setNearStart(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm border text-white ${isDrawing ? 'bg-orange-500/80 border-orange-400' : 'bg-black/60 border-white/10 hover:bg-black/80'}`}><Pencil className="w-4 h-4" /></button>
            {selZoneId && <button onClick={() => { onZoneDelete?.(selZoneId); setSelZoneId(null); }} className="w-8 h-8 rounded-lg bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur-sm border border-red-400"><Trash2 className="w-4 h-4" /></button>}
          </>}
        </div>

        {/* Drawing instructions */}
        {isDrawing && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-2">
            <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs border border-white/10 whitespace-nowrap">
              {drawPath.length === 0 ? 'Tap to start' : drawPath.length < 3 ? `${drawPath.length} pts — need 3+` : nearStart ? 'Tap to close' : 'Tap start to finish'}
            </div>
            {drawPath.length >= 3 && <button onClick={() => { onZoneAdd?.(transparent ? drawPath : drawPath.map(imageToNorm), `zone-${Date.now()}`); setDrawPath([]); setNearStart(false); }} className="bg-orange-500 text-white px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Done</button>}
            {drawPath.length > 0 && <button onClick={() => { setDrawPath([]); setNearStart(false); }} className="bg-black/60 text-white p-2 rounded-full border border-white/20"><XIcon className="w-3 h-3" /></button>}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none flex-wrap">
          {(['available', 'reserved', 'sold_out'] as ZoneStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
              <div className="w-2 h-2 rounded-full" style={{ background: zoneColor(s, 1) }} />
              <span className="text-[9px] text-white/70 capitalize">{s.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
