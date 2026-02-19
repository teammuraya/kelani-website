'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import dynamic from 'next/dynamic';
import {
  Upload, Loader2, Save, Trash2, X, Info, ChevronDown, ChevronUp,
  Link as LinkIcon, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { CanvasZone, ZonePoint, ZoneStatus } from '@/components/canvas/ImmersiveCanvas';

// Dynamic import — canvas uses window APIs
const ImmersiveCanvas = dynamic(
  () => import('@/components/canvas/ImmersiveCanvas').then(m => m.ImmersiveCanvas),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-900 animate-pulse rounded-xl" /> }
);

type MasterPlanZone = {
  id: string;
  label: string;
  points: ZonePoint[];
  buildingId?: Id<'project_buildings'>;
  status: 'available' | 'coming_soon' | 'sold_out';
};

type Building = {
  _id: Id<'project_buildings'>;
  name: string;
  slug: string;
};

type Props = {
  projectId: Id<'projects'>;
  masterPlanUrl?: string;
  masterPlanZones?: MasterPlanZone[];
  buildings: Building[];
};

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400 bg-white';

export default function MasterPlanManager({
  projectId, masterPlanUrl: initialUrl, masterPlanZones: initialZones = [], buildings,
}: Props) {
  const updateProject = useMutation(api.projectBuildings.updateProjectMasterPlan);
  const generateUrl   = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getUrl);

  const [imageUrl, setImageUrl] = useState(initialUrl ?? '');
  const [urlInput, setUrlInput] = useState(initialUrl ?? '');
  const [zones, setZones]       = useState<CanvasZone[]>(
    (initialZones ?? []).map(z => ({
      id: z.id,
      label: z.label,
      points: z.points,
      status: z.status as ZoneStatus,
      meta: { buildingId: z.buildingId },
    }))
  );
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlMode, setUrlMode]     = useState<'url' | 'file'>('url');

  // Zone editor state — when a newly drawn zone needs to be named
  const [pendingZone, setPendingZone] = useState<{ id: string; points: ZonePoint[] } | null>(null);
  const [pendingLabel, setPendingLabel] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'available' | 'coming_soon' | 'sold_out'>('available');
  const [pendingBuildingId, setPendingBuildingId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Upload helpers ──

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

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Image files only');
    try {
      setUploading(true);
      setUploadProgress(0);
      const url = await uploadToConvex(file);
      setUploadProgress(100);
      setImageUrl(url);
      setUrlInput(url);
      toast.success('Master plan uploaded');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  };

  // ── Zone management ──

  const handleZoneAdd = useCallback((points: ZonePoint[], id: string) => {
    setPendingZone({ id, points });
    setPendingLabel('');
    setPendingStatus('available');
    setPendingBuildingId('');
  }, []);

  const confirmPendingZone = () => {
    if (!pendingZone) return;
    if (!pendingLabel.trim()) return toast.error('Zone label is required');
    const newZone: CanvasZone = {
      id: pendingZone.id,
      label: pendingLabel.trim(),
      points: pendingZone.points,
      status: pendingStatus,
      meta: pendingBuildingId ? { buildingId: pendingBuildingId } : {},
    };
    setZones(prev => [...prev, newZone]);
    setPendingZone(null);
  };

  const handleZoneDelete = useCallback((id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
  }, []);

  const updateZoneField = (id: string, field: string, value: any) => {
    setZones(prev => prev.map(z => {
      if (z.id !== id) return z;
      if (field === 'label') return { ...z, label: value };
      if (field === 'status') return { ...z, status: value };
      if (field === 'buildingId') return { ...z, meta: { ...(z.meta ?? {}), buildingId: value || undefined } };
      return z;
    }));
  };

  // ── Save ──

  const handleSave = async () => {
    setSaving(true);
    try {
      const zonesPayload = zones.map(z => ({
        id: z.id,
        label: z.label,
        points: z.points,
        status: z.status,
        buildingId: z.meta?.buildingId ?? undefined,
      }));
      await updateProject({
        projectId,
        master_plan_url: imageUrl || undefined,
        master_plan_zones: zonesPayload,
      });
      toast.success('Master plan saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Image upload card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Site / Master Plan Image</h3>
        <p className="text-sm text-gray-500 mb-4">
          Upload the overall site plan image. You'll draw building zones on top of it below.
        </p>

        <div className="flex gap-1 mb-4 p-0.5 bg-gray-100 rounded-xl w-fit">
          {(['url', 'file'] as const).map(m => (
            <button
              key={m}
              onClick={() => setUrlMode(m)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                urlMode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'url' ? <LinkIcon className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
              {m === 'url' ? 'Paste URL' : 'Upload File'}
            </button>
          ))}
        </div>

        {urlMode === 'url' ? (
          <div className="flex gap-3">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://... (site plan image)"
              className={`${inputCls} flex-1`}
            />
            <button
              onClick={() => setImageUrl(urlInput)}
              className="shrink-0 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700"
            >
              Apply
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-olive-300 hover:bg-gray-50 transition-all"
          >
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Click to upload master plan image</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }}
        />

        {uploading && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Uploading…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-olive-500 transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {imageUrl && (
          <div className="mt-4 relative rounded-xl overflow-hidden border border-gray-200 max-h-40">
            <img src={imageUrl} alt="Master plan preview" className="w-full h-40 object-cover" />
            <button
              onClick={() => { setImageUrl(''); setUrlInput(''); }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Canvas editor */}
      {imageUrl && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Draw Building Zones</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Use the pencil tool (top-right) to draw polygon zones over each building on the master plan.
                Click to add points — double-click or click back on the start point to close.
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-olive-500 text-white rounded-xl text-sm font-semibold hover:bg-olive-400 disabled:opacity-50 shrink-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Zones'}
            </button>
          </div>

          {/* Canvas — tall dark container */}
          <div className="h-[60vh] bg-gray-950 relative">
            <ImmersiveCanvas
              imageUrl={imageUrl}
              zones={zones}
              mode="edit"
              onZoneAdd={handleZoneAdd}
              onZoneDelete={handleZoneDelete}
              className="w-full h-full"
            />
          </div>

          {/* Pending zone name form */}
          {pendingZone && (
            <div className="p-4 border-t border-gray-100 bg-orange-50">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Name this zone</h4>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Zone Label *</label>
                  <input
                    value={pendingLabel}
                    onChange={(e) => setPendingLabel(e.target.value)}
                    placeholder="Block A, Tower 1…"
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                  <select
                    value={pendingStatus}
                    onChange={(e) => setPendingStatus(e.target.value as any)}
                    className={inputCls}
                  >
                    <option value="available">Available</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="sold_out">Sold Out</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Link to Building <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={pendingBuildingId}
                    onChange={(e) => setPendingBuildingId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— No link —</option>
                    {buildings.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={confirmPendingZone}
                  disabled={!pendingLabel.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-olive-500 text-white rounded-lg text-sm font-semibold hover:bg-olive-400 disabled:opacity-50"
                >
                  Add Zone
                </button>
                <button
                  onClick={() => setPendingZone(null)}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Zone list / edit */}
          {zones.length > 0 && (
            <div className="p-4 border-t border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {zones.length} zone{zones.length !== 1 ? 's' : ''}
              </p>
              {zones.map((zone) => (
                <div key={zone.id} className="grid sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 items-center">
                  <input
                    value={zone.label}
                    onChange={(e) => updateZoneField(zone.id, 'label', e.target.value)}
                    className={`${inputCls} sm:col-span-1`}
                    placeholder="Label"
                  />
                  <select
                    value={zone.status}
                    onChange={(e) => updateZoneField(zone.id, 'status', e.target.value)}
                    className={inputCls}
                  >
                    <option value="available">Available</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="sold_out">Sold Out</option>
                  </select>
                  <div className="flex gap-2">
                    <select
                      value={zone.meta?.buildingId ?? ''}
                      onChange={(e) => updateZoneField(zone.id, 'buildingId', e.target.value)}
                      className={`${inputCls} flex-1`}
                    >
                      <option value="">— No building link —</option>
                      {buildings.map(b => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleZoneDelete(zone.id)}
                      className="shrink-0 p-2 text-gray-300 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-olive-500 text-white rounded-xl text-sm font-semibold hover:bg-olive-400 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save All Zones'}
              </button>
            </div>
          )}
        </div>
      )}

      {!imageUrl && (
        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
          <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Upload or paste the master plan image above to start drawing building zones</p>
        </div>
      )}
    </div>
  );
}
