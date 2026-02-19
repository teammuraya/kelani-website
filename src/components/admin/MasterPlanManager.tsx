'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import dynamic from 'next/dynamic';
import {
  Upload, Loader2, Save, Trash2, X, Info, Link as LinkIcon, Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { CanvasZone, ZonePoint, ZoneStatus } from '@/components/canvas/ImmersiveCanvas';

const ImmersiveCanvas = dynamic(
  () => import('@/components/canvas/ImmersiveCanvas').then(m => m.ImmersiveCanvas),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-900 animate-pulse rounded-xl" /> }
);

type MasterPlanZone = {
  id: string;
  label: string;
  points: ZonePoint[];
  phaseId?: Id<'project_phases'>;
  status: 'available' | 'coming_soon' | 'sold_out';
};

type Phase = {
  _id: Id<'project_phases'>;
  name: string;
  slug: string;
};

type Props = {
  projectId: Id<'projects'>;
  masterPlanUrl?: string;
  masterPlanVideoUrl?: string;
  masterPlanZones?: MasterPlanZone[];
  phases: Phase[];
};

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400 bg-white';

export default function MasterPlanManager({
  projectId, masterPlanUrl: initialUrl, masterPlanVideoUrl: initialVideoUrl,
  masterPlanZones: initialZones = [], phases,
}: Props) {
  const updateProject = useMutation(api.projectPhases.updateProjectMasterPlan);
  const generateUrl   = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getUrl);

  // Image state
  const [imageUrl,   setImageUrl]   = useState(initialUrl ?? '');
  const [urlInput,   setUrlInput]   = useState(initialUrl ?? '');
  // Video state
  const [videoUrl,   setVideoUrl]   = useState(initialVideoUrl ?? '');
  const [videoInput, setVideoInput] = useState(initialVideoUrl ?? '');

  const [zones, setZones] = useState<CanvasZone[]>(
    (initialZones ?? []).map(z => ({
      id: z.id, label: z.label, points: z.points,
      status: z.status as ZoneStatus,
      meta: { phaseId: z.phaseId },
    }))
  );
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState<'image' | 'video' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlMode, setUrlMode]     = useState<'url' | 'file'>('url');

  // Pending zone form
  const [pendingZone,    setPendingZone]    = useState<{ id: string; points: ZonePoint[] } | null>(null);
  const [pendingLabel,   setPendingLabel]   = useState('');
  const [pendingStatus,  setPendingStatus]  = useState<'available' | 'coming_soon' | 'sold_out'>('available');
  const [pendingPhaseId, setPendingPhaseId] = useState('');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Upload helper ──────────────────────────────────────────────────────────

  const uploadToConvex = async (file: File): Promise<string> => {
    const uploadUrl = await generateUrl();
    const storageId: Id<'_storage'> = await new Promise((res, rej) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 90));
      });
      xhr.onload = () => xhr.status === 200 ? res(JSON.parse(xhr.responseText).storageId) : rej(new Error('Upload failed'));
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
      setUploading('image'); setUploadProgress(0);
      const url = await uploadToConvex(file);
      setUploadProgress(100);
      setImageUrl(url); setUrlInput(url);
      toast.success('Master plan image uploaded');
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(null); setTimeout(() => setUploadProgress(0), 1500); }
  };

  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) return toast.error('Video files only');
    try {
      setUploading('video'); setUploadProgress(0);
      const url = await uploadToConvex(file);
      setUploadProgress(100);
      setVideoUrl(url); setVideoInput(url);
      toast.success('Master plan video uploaded');
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(null); setTimeout(() => setUploadProgress(0), 1500); }
  };

  // ── Zone management ───────────────────────────────────────────────────────

  const handleZoneAdd = useCallback((points: ZonePoint[], id: string) => {
    setPendingZone({ id, points });
    setPendingLabel(''); setPendingStatus('available'); setPendingPhaseId('');
  }, []);

  const confirmPendingZone = () => {
    if (!pendingZone) return;
    if (!pendingLabel.trim()) return toast.error('Zone label is required');
    setZones(prev => [...prev, {
      id: pendingZone.id,
      label: pendingLabel.trim(),
      points: pendingZone.points,
      status: pendingStatus,
      meta: pendingPhaseId ? { phaseId: pendingPhaseId } : {},
    }]);
    setPendingZone(null);
  };

  const handleZoneDelete = useCallback((id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
  }, []);

  const updateZoneField = (id: string, field: string, value: any) => {
    setZones(prev => prev.map(z => {
      if (z.id !== id) return z;
      if (field === 'label')   return { ...z, label: value };
      if (field === 'status')  return { ...z, status: value };
      if (field === 'phaseId') return { ...z, meta: { phaseId: value || undefined } };
      return z;
    }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProject({
        projectId,
        master_plan_url:       imageUrl || undefined,
        master_plan_video_url: videoUrl || undefined,
        master_plan_zones: zones.map(z => ({
          id: z.id, label: z.label, points: z.points, status: z.status,
          phaseId: z.meta?.phaseId ?? undefined,
        })),
      });
      toast.success('Master plan saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const hasMedia = !!(imageUrl || videoUrl);

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Media upload card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Master Plan Media</h3>
        <p className="text-sm text-gray-500 mb-5">
          Upload a background image and/or video for the master plan. The zone canvas overlays on top.
          If both are set, the video plays and the canvas sits over it.
        </p>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Image */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Background Image</span>
              <span className="text-xs text-gray-400">(canvas overlay background)</span>
            </div>

            <div className="flex gap-1 mb-3 p-0.5 bg-gray-100 rounded-xl w-fit">
              {(['url', 'file'] as const).map(m => (
                <button key={m} onClick={() => setUrlMode(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    urlMode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {m === 'url' ? <LinkIcon className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                  {m === 'url' ? 'URL' : 'Upload'}
                </button>
              ))}
            </div>

            {urlMode === 'url' ? (
              <div className="flex gap-2">
                <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://... (site plan image)" className={`${inputCls} flex-1`} />
                <button onClick={() => setImageUrl(urlInput)}
                  className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">Apply</button>
              </div>
            ) : (
              <div onClick={() => imageInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-olive-300 hover:bg-gray-50">
                {uploading === 'image'
                  ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-olive-500" />
                  : <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1" />}
                <p className="text-xs text-gray-400 mt-1">Click to upload image</p>
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />

            {imageUrl && (
              <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-200 h-24">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => { setImageUrl(''); setUrlInput(''); }}
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
              <span className="text-sm font-semibold text-gray-800">Background Video</span>
              <span className="text-xs text-gray-400">(plays behind zones)</span>
            </div>

            <div className="flex gap-2 mb-3">
              <input value={videoInput} onChange={(e) => setVideoInput(e.target.value)}
                placeholder="https://... (MP4 video URL)" className={`${inputCls} flex-1`} />
              <button onClick={() => setVideoUrl(videoInput)}
                className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">Apply</button>
            </div>

            <div onClick={() => videoInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-purple-300 hover:bg-gray-50">
              {uploading === 'video'
                ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500" />
                : <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1" />}
              <p className="text-xs text-gray-400 mt-1">Or upload video file</p>
            </div>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ''; }} />

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

        {/* Upload progress */}
        {uploading && uploadProgress > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />
                Uploading {uploading}…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-olive-500 transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Canvas editor ── */}
      {hasMedia && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Draw Phase Zones</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Use the pencil tool (top-right) to draw polygon zones over each phase area.
                Link each zone to its phase so clicking it navigates to that phase.
              </p>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-olive-500 text-white rounded-xl text-sm font-semibold hover:bg-olive-400 disabled:opacity-50 shrink-0">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Zones'}
            </button>
          </div>

          <div className="h-[60vh] bg-gray-950 relative">
            {/* Video plays behind if set */}
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
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Name this phase zone</h4>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Zone Label *</label>
                  <input value={pendingLabel} onChange={(e) => setPendingLabel(e.target.value)}
                    placeholder="Phase 1, Phase 2…" className={inputCls} autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                  <select value={pendingStatus} onChange={(e) => setPendingStatus(e.target.value as any)} className={inputCls}>
                    <option value="available">Available</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="sold_out">Sold Out</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Link to Phase <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select value={pendingPhaseId} onChange={(e) => setPendingPhaseId(e.target.value)} className={inputCls}>
                    <option value="">— No link —</option>
                    {phases.map(ph => (
                      <option key={ph._id} value={ph._id}>{ph.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={confirmPendingZone} disabled={!pendingLabel.trim()}
                  className="px-4 py-2 bg-olive-500 text-white rounded-lg text-sm font-semibold hover:bg-olive-400 disabled:opacity-50">
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
              {zones.map((zone) => (
                <div key={zone.id} className="grid sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 items-center">
                  <input value={zone.label} onChange={(e) => updateZoneField(zone.id, 'label', e.target.value)}
                    className={inputCls} placeholder="Label" />
                  <select value={zone.status} onChange={(e) => updateZoneField(zone.id, 'status', e.target.value)} className={inputCls}>
                    <option value="available">Available</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="sold_out">Sold Out</option>
                  </select>
                  <div className="flex gap-2">
                    <select value={zone.meta?.phaseId ?? ''} onChange={(e) => updateZoneField(zone.id, 'phaseId', e.target.value)}
                      className={`${inputCls} flex-1`}>
                      <option value="">— No phase link —</option>
                      {phases.map(ph => (
                        <option key={ph._id} value={ph._id}>{ph.name}</option>
                      ))}
                    </select>
                    <button onClick={() => handleZoneDelete(zone.id)} className="p-2 text-gray-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={handleSave} disabled={saving}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-olive-500 text-white rounded-xl text-sm font-semibold hover:bg-olive-400 disabled:opacity-50">
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
          <p className="text-sm">Upload a master plan image or video above to start drawing phase zones</p>
        </div>
      )}
    </div>
  );
}
