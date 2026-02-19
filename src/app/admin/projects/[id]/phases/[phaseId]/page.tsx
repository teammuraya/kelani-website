'use client';

/**
 * Phase Admin Editor
 * /admin/projects/[id]/phases/[phaseId]
 *
 * Tabs:
 *  - Details   : name, slug, description, thumbnail, total_units
 *  - Media     : phase views + gallery (MediaManager)
 *  - Panoramas : 360° panoramas (PanoramaManager)
 *  - Phase Plan: canvas for drawing unit zones over image/video
 */

import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft, Loader2, ExternalLink, Save, Upload, X, Trash2,
  Video, LinkIcon, Info, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PanoramaManager from '@/components/admin/PanoramaManager';
import type { CanvasZone, ZonePoint, ZoneStatus } from '@/components/canvas/ImmersiveCanvas';

const ImmersiveCanvas = dynamic(
  () => import('@/components/canvas/ImmersiveCanvas').then(m => m.ImmersiveCanvas),
  { ssr: false, loading: () => <div className="h-[60vh] bg-gray-900 animate-pulse rounded-xl" /> }
);

// ─── MediaManager wrapper (reuses the existing component for phase media) ─────

import MediaManager from '@/components/admin/MediaManager';

// ─── Types ────────────────────────────────────────────────────────────────────

const TABS = ['details', 'media', 'panoramas', 'phase-plan', 'units'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  details:      'Details',
  media:        'Phase Media',
  panoramas:    'Panoramas',
  'phase-plan': 'Phase Plan',
  units:        'Units',
};

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400 bg-white';

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ─── Phase Details Form ───────────────────────────────────────────────────────

function PhaseDetailsForm({ phase, phaseId }: {
  phase: any;
  phaseId: Id<'project_phases'>;
}) {
  const updatePhase   = useMutation(api.projectPhases.update);
  const generateUrl   = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getUrl);

  const [form, setForm] = useState({
    name:          phase.name ?? '',
    slug:          phase.slug ?? '',
    description:   phase.description ?? '',
    thumbnail_url: phase.thumbnail_url ?? '',
    total_units:   String(phase.total_units ?? ''),
  });
  const [saving,    setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const thumbRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string> => {
    const uploadUrl = await generateUrl();
    const storageId: Id<'_storage'> = await new Promise((res, rej) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90));
      });
      xhr.onload  = () => xhr.status === 200 ? res(JSON.parse(xhr.responseText).storageId) : rej(new Error('Upload failed'));
      xhr.onerror = () => rej(new Error('Network error'));
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
    const url = await getStorageUrl({ storageId });
    if (!url) throw new Error('Could not get URL');
    return url;
  };

  const handleThumbUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Image files only');
    try {
      setUploading(true); setProgress(0);
      const url = await uploadFile(file);
      setProgress(100);
      setForm(f => ({ ...f, thumbnail_url: url }));
      toast.success('Thumbnail uploaded');
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); setTimeout(() => setProgress(0), 1500); }
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('Name is required');
    setSaving(true);
    try {
      await updatePhase({
        id: phaseId,
        name:          form.name,
        slug:          form.slug || slugify(form.name),
        description:   form.description || undefined,
        thumbnail_url: form.thumbnail_url || undefined,
        total_units:   form.total_units ? Number(form.total_units) : undefined,
      });
      toast.success('Phase saved');
    } catch (e: any) { toast.error(e.message ?? 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-5">Phase Details</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
            <input value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
              className={inputCls} placeholder="Phase 1 — Lakefront" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Slug</label>
            <input value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
              className={inputCls} placeholder="phase-1" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className={inputCls} placeholder="Phase description…" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Total Units</label>
            <input type="number" min={0} value={form.total_units}
              onChange={e => setForm(f => ({ ...f, total_units: e.target.value }))}
              className={inputCls} />
          </div>

          {/* Thumbnail */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Thumbnail</label>
            <div className="flex gap-2">
              <input value={form.thumbnail_url}
                onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                placeholder="https://... or upload →" className={`${inputCls} flex-1`} />
              <button onClick={() => thumbRef.current?.click()} disabled={uploading}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </button>
              <input ref={thumbRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbUpload(f); e.target.value = ''; }} />
            </div>
            {uploading && progress > 0 && (
              <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-olive-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            {form.thumbnail_url && (
              <div className="mt-2 relative w-20 h-14 rounded-lg overflow-hidden border border-gray-200">
                <img src={form.thumbnail_url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm(f => ({ ...f, thumbnail_url: '' }))}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-olive-500 text-white rounded-xl hover:bg-olive-400 disabled:opacity-50 font-medium">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving…' : 'Save Details'}
      </button>
    </div>
  );
}

// ─── Phase Plan Manager (canvas + video/image upload) ─────────────────────────

function PhasePlanManager({ phase, phaseId, units }: {
  phase: any;
  phaseId: Id<'project_phases'>;
  units: any[];
}) {
  const updatePhase   = useMutation(api.projectPhases.update);
  const generateUrl   = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getUrl);

  const [imageUrl,   setImageUrl]   = useState(phase.phase_plan_url ?? '');
  const [imageInput, setImageInput] = useState(phase.phase_plan_url ?? '');
  const [videoUrl,   setVideoUrl]   = useState(phase.phase_plan_video_url ?? '');
  const [videoInput, setVideoInput] = useState(phase.phase_plan_video_url ?? '');

  const [zones, setZones] = useState<CanvasZone[]>(
    (phase.phase_unit_zones ?? []).map((z: any) => ({
      id: z.id, label: z.label, points: z.points,
      status: z.status as ZoneStatus,
      meta: { unitId: z.unitId },
    }))
  );

  const [saving,    setSaving]   = useState(false);
  const [uploading, setUploading] = useState<'image' | 'video' | null>(null);
  const [progress,  setProgress]  = useState(0);

  const [pendingZone,   setPendingZone]   = useState<{ id: string; points: ZonePoint[] } | null>(null);
  const [pendingLabel,  setPendingLabel]  = useState('');
  const [pendingStatus, setPendingStatus] = useState<'available' | 'reserved' | 'sold'>('available');
  const [pendingUnitId, setPendingUnitId] = useState('');

  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const uploadToConvex = async (file: File): Promise<string> => {
    const uploadUrl = await generateUrl();
    const storageId: Id<'_storage'> = await new Promise((res, rej) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90));
      });
      xhr.onload  = () => xhr.status === 200 ? res(JSON.parse(xhr.responseText).storageId) : rej(new Error('Upload failed'));
      xhr.onerror = () => rej(new Error('Network error'));
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
    const url = await getStorageUrl({ storageId });
    if (!url) throw new Error('Could not get URL');
    return url;
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Image files only');
    try {
      setUploading('image'); setProgress(0);
      const url = await uploadToConvex(file);
      setProgress(100);
      setImageUrl(url); setImageInput(url);
      toast.success('Plan image uploaded');
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(null); setTimeout(() => setProgress(0), 1500); }
  };

  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) return toast.error('Video files only');
    try {
      setUploading('video'); setProgress(0);
      const url = await uploadToConvex(file);
      setProgress(100);
      setVideoUrl(url); setVideoInput(url);
      toast.success('Plan video uploaded');
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(null); setTimeout(() => setProgress(0), 1500); }
  };

  const handleZoneAdd = useCallback((points: ZonePoint[], id: string) => {
    setPendingZone({ id, points });
    setPendingLabel(''); setPendingStatus('available'); setPendingUnitId('');
  }, []);

  const confirmPendingZone = () => {
    if (!pendingZone) return;
    if (!pendingLabel.trim()) return toast.error('Zone label is required');
    setZones(prev => [...prev, {
      id: pendingZone.id,
      label: pendingLabel.trim(),
      points: pendingZone.points,
      status: pendingStatus,
      meta: pendingUnitId ? { unitId: pendingUnitId } : {},
    }]);
    setPendingZone(null);
  };

  const handleZoneDelete = useCallback((id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
  }, []);

  const updateZoneField = (id: string, field: string, value: any) => {
    setZones(prev => prev.map(z => {
      if (z.id !== id) return z;
      if (field === 'label')  return { ...z, label: value };
      if (field === 'status') return { ...z, status: value };
      if (field === 'unitId') return { ...z, meta: { unitId: value || undefined } };
      return z;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePhase({
        id: phaseId,
        phase_plan_url:       imageUrl || undefined,
        phase_plan_video_url: videoUrl || undefined,
        phase_unit_zones: zones.map(z => ({
          id: z.id, label: z.label, points: z.points, status: z.status,
          unitId: z.meta?.unitId ?? undefined,
        })),
      });
      toast.success('Phase plan saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const hasMedia = !!(imageUrl || videoUrl);

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Media upload */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Phase Plan Media</h3>
        <p className="text-sm text-gray-500 mb-5">
          The plan image or video appears as the background. Unit zones are drawn on top as a canvas overlay.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Plan Image</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input value={imageInput} onChange={e => setImageInput(e.target.value)}
                placeholder="https://... (JPG/PNG)" className={`${inputCls} flex-1`} />
              <button onClick={() => setImageUrl(imageInput)}
                className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs">Apply</button>
            </div>
            <div onClick={() => imageRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-gray-50">
              {uploading === 'image' ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500" />
                : <Upload className="w-5 h-5 text-gray-300 mx-auto" />}
              <p className="text-xs text-gray-400 mt-1">Upload image</p>
            </div>
            <input ref={imageRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
            {imageUrl && (
              <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-200 h-24">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => { setImageUrl(''); setImageInput(''); }}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Video */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
                <Video className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Plan Video</span>
              <span className="text-xs text-gray-400">(zones overlay video)</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input value={videoInput} onChange={e => setVideoInput(e.target.value)}
                placeholder="https://... (MP4)" className={`${inputCls} flex-1`} />
              <button onClick={() => setVideoUrl(videoInput)}
                className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs">Apply</button>
            </div>
            <div onClick={() => videoRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-purple-300 hover:bg-gray-50">
              {uploading === 'video' ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-500" />
                : <Upload className="w-5 h-5 text-gray-300 mx-auto" />}
              <p className="text-xs text-gray-400 mt-1">Upload video</p>
            </div>
            <input ref={videoRef} type="file" accept="video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ''; }} />
            {videoUrl && (
              <div className="mt-3 flex items-center gap-2 p-2 bg-purple-50 rounded-xl border border-purple-100">
                <Video className="w-4 h-4 text-purple-400 shrink-0" />
                <p className="text-xs text-gray-600 truncate flex-1">{videoUrl}</p>
                <button onClick={() => { setVideoUrl(''); setVideoInput(''); }}
                  className="p-1 text-purple-300 hover:text-red-400"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>

        {uploading && progress > 0 && (
          <div className="mt-4">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-olive-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Canvas */}
      {hasMedia && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Draw Unit Zones</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Use the pencil tool to draw polygons over each unit location. Link each zone to a unit.
              </p>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-olive-500 text-white rounded-xl text-sm font-semibold hover:bg-olive-400 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Zones'}
            </button>
          </div>

          <div className="h-[60vh] bg-gray-950 relative">
            {videoUrl && (
              <video src={videoUrl} autoPlay loop muted playsInline
                className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0">
              <ImmersiveCanvas
                imageUrl={imageUrl && !videoUrl ? imageUrl : undefined}
                transparent={!!videoUrl}
                zones={zones}
                mode="edit"
                onZoneAdd={handleZoneAdd}
                onZoneDelete={handleZoneDelete}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Pending zone form */}
          {pendingZone && (
            <div className="p-4 border-t border-gray-100 bg-orange-50">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Name this unit zone</h4>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Zone Label *</label>
                  <input value={pendingLabel} onChange={e => setPendingLabel(e.target.value)}
                    placeholder="Unit A1, Plot 12…" className={inputCls} autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                  <select value={pendingStatus} onChange={e => setPendingStatus(e.target.value as any)} className={inputCls}>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Link to Unit <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select value={pendingUnitId} onChange={e => setPendingUnitId(e.target.value)} className={inputCls}>
                    <option value="">— No link —</option>
                    {units.map((u: any) => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={confirmPendingZone} disabled={!pendingLabel.trim()}
                  className="px-4 py-2 bg-olive-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  Add Zone
                </button>
                <button onClick={() => setPendingZone(null)} className="px-4 py-2 text-gray-500 text-sm">Discard</button>
              </div>
            </div>
          )}

          {/* Zone list */}
          {zones.length > 0 && (
            <div className="p-4 border-t border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {zones.length} zone{zones.length !== 1 ? 's' : ''}
              </p>
              {zones.map(zone => (
                <div key={zone.id} className="grid sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 items-center">
                  <input value={zone.label} onChange={e => updateZoneField(zone.id, 'label', e.target.value)}
                    className={inputCls} placeholder="Label" />
                  <select value={zone.status} onChange={e => updateZoneField(zone.id, 'status', e.target.value)} className={inputCls}>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                  </select>
                  <div className="flex gap-2">
                    <select value={zone.meta?.unitId ?? ''} onChange={e => updateZoneField(zone.id, 'unitId', e.target.value)}
                      className={`${inputCls} flex-1`}>
                      <option value="">— No unit link —</option>
                      {units.map((u: any) => (
                        <option key={u._id} value={u._id}>{u.name}</option>
                      ))}
                    </select>
                    <button onClick={() => handleZoneDelete(zone.id)} className="p-2 text-gray-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-olive-500 text-white rounded-xl text-sm font-semibold hover:bg-olive-400 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save All Zones'}
              </button>
            </div>
          )}
        </div>
      )}

      {!hasMedia && (
        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
          <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Upload a plan image or video above to start drawing unit zones</p>
        </div>
      )}
    </div>
  );
}

// ─── Units in this phase ──────────────────────────────────────────────────────

function PhaseUnitsPanel({ phaseId, projectId, projectSlug }: {
  phaseId: Id<'project_phases'>;
  projectId: Id<'projects'>;
  projectSlug: string;
}) {
  const units      = useQuery(api.projectUnits.getByPhase, { phaseId });
  const createUnit = useMutation(api.projectUnits.create);
  const removeUnit = useMutation(api.projectUnits.remove);

  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', bedrooms: '2', bathrooms: '2',
    area_sqft: '', price: '', status: 'available' as const,
    unit_type: '', description: '',
  });

  const autoSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleCreate = async () => {
    if (!form.name || !form.area_sqft || !form.price) return toast.error('Name, area and price are required');
    setSaving(true);
    try {
      await createUnit({
        projectId,
        phaseId,
        name:       form.name,
        slug:       form.slug || autoSlug(form.name),
        bedrooms:   Number(form.bedrooms),
        bathrooms:  Number(form.bathrooms),
        area_sqft:  Number(form.area_sqft),
        price:      Number(form.price),
        status:     form.status,
        unit_type:  form.unit_type || undefined,
        description: form.description || undefined,
        displayOrder: units?.length ?? 0,
      });
      toast.success('Unit created');
      setShowForm(false);
      setForm({ name: '', slug: '', bedrooms: '2', bathrooms: '2', area_sqft: '', price: '', status: 'available', unit_type: '', description: '' });
    } catch (e: any) { toast.error(e.message ?? 'Failed to create'); }
    finally { setSaving(false); }
  };

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700',
    reserved:  'bg-amber-100 text-amber-700',
    sold:      'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900">Units in this Phase</h3>
            <p className="text-sm text-gray-500">
              {units?.length ?? 0} unit{(units?.length ?? 0) !== 1 ? 's' : ''} — create units here, then link them to zones on the Phase Plan tab
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-olive-500 text-white rounded-xl text-sm font-medium hover:bg-olive-400">
            <Plus className="w-4 h-4" /> Add Unit
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-gray-50 rounded-xl p-5 mb-5 border border-gray-200 space-y-4">
            <h4 className="font-medium text-gray-900 text-sm">New Unit</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
                <input value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))}
                  placeholder="Unit A1 — 3BR" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Unit Type</label>
                <input value={form.unit_type} onChange={e => setForm(f => ({ ...f, unit_type: e.target.value }))}
                  placeholder="3BR Townhouse" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Bedrooms</label>
                <input type="number" min={0} value={form.bedrooms}
                  onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Bathrooms</label>
                <input type="number" min={0} value={form.bathrooms}
                  onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Area (sqft) *</label>
                <input type="number" min={0} value={form.area_sqft}
                  onChange={e => setForm(f => ({ ...f, area_sqft: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Price (KES) *</label>
                <input type="number" min={0} value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className={inputCls}>
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Slug</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={saving || !form.name}
                className="flex items-center gap-2 px-5 py-2.5 bg-olive-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Creating…' : 'Create Unit'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 text-sm">Cancel</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="divide-y divide-gray-50">
          {units?.map(u => (
            <div key={u._id} className="flex items-center gap-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                <p className="text-xs text-gray-400">{u.bedrooms}BR · {u.bathrooms}BA · {u.area_sqft.toLocaleString()} sqft · KES {u.price.toLocaleString()}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColors[u.status]}`}>
                {u.status}
              </span>
              <div className="flex items-center gap-1.5">
                <Link href={`/admin/projects/${projectId}/units/${u._id}`}
                  className="p-1.5 text-gray-400 hover:text-olive-500 hover:bg-olive-50 rounded-lg text-xs">
                  Edit
                </Link>
                <Link href={`/projects/${projectSlug}/units/${u.slug}`} target="_blank"
                  className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete "${u.name}"?`)) return;
                    try { await removeUnit({ id: u._id }); toast.success('Deleted'); }
                    catch { toast.error('Failed'); }
                  }}
                  className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {(!units || units.length === 0) && !showForm && (
            <p className="py-10 text-center text-sm text-gray-400">
              No units yet. Add units, then link them to zones on the Phase Plan tab.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PhaseAdminPage() {
  const { id, phaseId } = useParams<{ id: string; phaseId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const project = useQuery(api.projects.getById, { id: id as Id<'projects'> });
  const phase   = useQuery(api.projectPhases.getById, { id: phaseId as Id<'project_phases'> });
  const units   = useQuery(api.projectUnits.getByPhase, { phaseId: phaseId as Id<'project_phases'> });

  if (project === undefined || phase === undefined || units === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-olive-500 animate-spin" />
      </div>
    );
  }

  if (!phase || !project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Phase not found.</p>
        <Link href={`/admin/projects/${id}`} className="text-olive-500 hover:underline mt-2 inline-block">
          Back to project
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/admin/projects/${id}?tab=phases`}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-0.5">{project.name}</p>
          <h1 className="text-xl font-bold text-gray-900">{phase.name}</h1>
          <p className="text-gray-500 text-sm">/{phase.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${project.slug}/phases/${phase.slug}`} target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-olive-500 border border-gray-200 hover:border-olive-300 rounded-lg">
            <ExternalLink className="w-3.5 h-3.5" /> Preview Phase
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-xl overflow-x-auto w-fit max-w-full">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[tab]}
            {tab === 'units' && units.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-olive-100 text-olive-700 rounded-full text-[10px] font-semibold">
                {units.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'details' && (
        <PhaseDetailsForm phase={phase} phaseId={phaseId as Id<'project_phases'>} />
      )}

      {activeTab === 'media' && (
        <div className="space-y-2 max-w-4xl">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
            <strong>Phase Media</strong> — "Phase Views" appear as the hero background on the phase page.
            "Gallery" shows in the gallery tab. Use transition videos for smooth navigation between clips.
          </div>
          <MediaManager
            phaseId={phaseId as Id<'project_phases'>}
            phase={phase}
            categoryLabels={{ exterior: 'Phase Views', gallery: 'Gallery' }}
            hideCategories={['interior']}
          />
        </div>
      )}

      {activeTab === 'panoramas' && (
        <PanoramaManager
          entityId={phaseId as Id<'project_phases'>}
          entityType="phase"
          panoramas={phase.panoramas ?? []}
        />
      )}

      {activeTab === 'phase-plan' && (
        <PhasePlanManager
          phase={phase}
          phaseId={phaseId as Id<'project_phases'>}
          units={units ?? []}
        />
      )}

      {activeTab === 'units' && (
        <PhaseUnitsPanel
          phaseId={phaseId as Id<'project_phases'>}
          projectId={id as Id<'projects'>}
          projectSlug={project.slug}
        />
      )}
    </div>
  );
}
