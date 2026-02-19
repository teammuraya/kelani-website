'use client';

import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState, useRef, useCallback } from 'react';
import {
  Plus, Trash2, Save, X, Upload, Link as LinkIcon,
  Loader2, CheckCircle2, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type Panorama = {
  name: string;
  panoramaUrl: string;
  description?: string;
  initialView?: { yaw: number; pitch: number; fov: number };
};

type UploadMode = 'url' | 'file';

type Props = {
  entityId: Id<'projects'> | Id<'project_units'> | Id<'project_buildings'>;
  entityType: 'project' | 'unit' | 'building';
  panoramas: Panorama[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400 bg-white';

function UploadProgressBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          {label}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-olive-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function FileUploadZone({
  accept, label, onFile, disabled,
}: {
  accept: string; label: string; onFile: (file: File) => void; disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-gray-200'
          : dragging
          ? 'border-olive-400 bg-olive-50'
          : 'border-gray-200 hover:border-olive-300 hover:bg-gray-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { onFile(file); e.target.value = ''; }
        }}
      />
      <Upload className="w-7 h-7 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xs text-gray-400 mt-1">Click or drag & drop</p>
    </div>
  );
}

// ─── Main PanoramaManager ─────────────────────────────────────────────────────

export default function PanoramaManager({ entityId, entityType, panoramas }: Props) {
  const updateProject  = useMutation(api.projects.update);
  const updateUnit     = useMutation(api.projectUnits.update);
  const updateBuilding = useMutation(api.projectBuildings.update);
  const generateUrl   = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getUrl);

  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [showTips, setShowTips]     = useState(false);
  const [urlMode, setUrlMode]       = useState<UploadMode>('url');
  const [uploadedFileName, setUploadedFileName] = useState('');

  const [newPano, setNewPano] = useState<Partial<Panorama>>({
    name: '',
    panoramaUrl: '',
    description: '',
    initialView: { yaw: 0, pitch: 0, fov: 100 },
  });

  // ── Convex upload helper ──

  const uploadToConvex = async (file: File): Promise<string> => {
    const uploadUrl = await generateUrl();

    const storageId: Id<'_storage'> = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 90));
      });
      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.storageId as Id<'_storage'>);
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });

    const url = await getStorageUrl({ storageId });
    if (!url) throw new Error('Could not get storage URL');
    return url;
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return toast.error('Panoramas require an equirectangular image (JPG/PNG/WebP)');
    }
    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadLabel(`Uploading ${file.name}…`);

      const url = await uploadToConvex(file);
      setUploadProgress(100);

      setNewPano(p => ({ ...p, panoramaUrl: url }));
      setUploadedFileName(file.name);
      toast.success(`${file.name} uploaded`);
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => { setUploadProgress(0); setUploadLabel(''); }, 1500);
    }
  };

  // ── Save helpers ──

  const savePanoramas = async (items: Panorama[]) => {
    setSaving(true);
    try {
      if (entityType === 'project') {
        await updateProject({ id: entityId as Id<'projects'>, panoramas: items });
      } else if (entityType === 'building') {
        await updateBuilding({ id: entityId as Id<'project_buildings'>, panoramas: items });
      } else {
        await updateUnit({ id: entityId as Id<'project_units'>, panoramas: items });
      }
      toast.success('Panoramas saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addPanorama = async () => {
    if (!newPano.name)       return toast.error('Name is required');
    if (!newPano.panoramaUrl) return toast.error('Panorama image URL or upload is required');

    const item: Panorama = {
      name: newPano.name!,
      panoramaUrl: newPano.panoramaUrl!,
      description: newPano.description || undefined,
      initialView: newPano.initialView,
    };
    await savePanoramas([...panoramas, item]);
    setNewPano({
      name: '', panoramaUrl: '', description: '',
      initialView: { yaw: 0, pitch: 0, fov: 100 },
    });
    setUploadedFileName('');
    setUrlMode('url');
    setShowForm(false);
  };

  const removePanorama = async (index: number) => {
    if (!confirm('Remove this panorama?')) return;
    await savePanoramas(panoramas.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-900">360° Panoramas</h3>
            <p className="text-sm text-gray-500">
              {panoramas.length} panorama{panoramas.length !== 1 ? 's' : ''} — viewers can explore
              spaces in an immersive 360° view
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-olive-500 text-white rounded-xl hover:bg-olive-400 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Panorama
          </button>
        </div>

        {/* Tips */}
        <button
          onClick={() => setShowTips(!showTips)}
          className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 mb-4 transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          What kind of image works for panoramas?
          {showTips ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showTips && (
          <div className="bg-blue-50 rounded-xl p-4 mb-5 border border-blue-100 text-xs text-blue-700 space-y-1.5">
            <p><strong>Equirectangular images</strong> — a 2:1 aspect ratio image that maps the full 360° sphere.</p>
            <p>You can create them with: Matterport exports, Google Street View, smartphone 360° cameras, or Photoshop sphere maps.</p>
            <p>Supported formats: JPG, PNG, WebP. Recommended size: 4096×2048 px or larger for best quality.</p>
            <p>Or paste a URL to any hosted equirectangular image.</p>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="bg-gray-50 rounded-xl p-5 mb-5 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">New Panorama</h4>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
                <input
                  value={newPano.name}
                  onChange={(e) => setNewPano(p => ({ ...p, name: e.target.value }))}
                  placeholder="Living Room, Master Bedroom…"
                  className={inputCls}
                />
              </div>
              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={newPano.description}
                  onChange={(e) => setNewPano(p => ({ ...p, description: e.target.value }))}
                  placeholder="Spacious open-plan living area"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Panorama image — URL or file upload */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Panorama image *{' '}
                <span className="text-gray-400 font-normal">(equirectangular 360° image)</span>
              </label>

              {/* Mode toggle */}
              <div className="flex gap-1 mb-3 p-0.5 bg-gray-200 rounded-lg w-fit">
                {(['url', 'file'] as UploadMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setUrlMode(mode)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all ${
                      urlMode === mode
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {mode === 'url' ? <LinkIcon className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                    {mode === 'url' ? 'Paste URL / Link' : 'Upload Image File'}
                  </button>
                ))}
              </div>

              {urlMode === 'url' ? (
                <input
                  value={newPano.panoramaUrl}
                  onChange={(e) => setNewPano(p => ({ ...p, panoramaUrl: e.target.value }))}
                  placeholder="https://... (equirectangular JPG/PNG/WebP image)"
                  className={inputCls}
                />
              ) : (
                <div className="space-y-2">
                  <FileUploadZone
                    accept="image/*"
                    label="Click or drop 360° panorama image (JPG/PNG/WebP)"
                    onFile={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading && (
                    <UploadProgressBar progress={uploadProgress} label={uploadLabel} />
                  )}
                  {newPano.panoramaUrl && !uploading && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <p className="text-xs text-green-700 truncate">
                        {uploadedFileName || newPano.panoramaUrl}
                      </p>
                      <button
                        onClick={() => { setNewPano(p => ({ ...p, panoramaUrl: '' })); setUploadedFileName(''); }}
                        className="ml-auto shrink-0 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panorama preview (for URL mode) */}
            {newPano.panoramaUrl && urlMode === 'url' && (
              <div className="mb-4 rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={newPano.panoramaUrl}
                  alt="Panorama preview"
                  className="w-full h-24 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            {/* Initial View */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Initial view position{' '}
                <span className="text-gray-400 font-normal">(optional — default is straight ahead)</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['yaw', 'pitch', 'fov'] as const).map((key) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 block mb-1 capitalize">
                      {key}{' '}
                      <span className="text-gray-300">
                        {key === 'yaw' ? '(-180 to 180°)' : key === 'pitch' ? '(-90 to 90°)' : '(50–120°)'}
                      </span>
                    </label>
                    <input
                      type="number"
                      value={newPano.initialView?.[key] ?? (key === 'fov' ? 100 : 0)}
                      onChange={(e) => setNewPano(p => ({
                        ...p,
                        initialView: { ...p.initialView!, [key]: Number(e.target.value) },
                      }))}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={addPanorama}
                disabled={saving || uploading || !newPano.name || !newPano.panoramaUrl}
                className="flex items-center gap-2 px-5 py-2.5 bg-olive-500 text-white rounded-lg text-sm hover:bg-olive-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Panorama'}
              </button>
              <button
                onClick={() => { setShowForm(false); setUploadedFileName(''); }}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Panorama list */}
        <div className="space-y-3">
          {panoramas.map((pano, i) => (
            <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              {/* 360° preview thumbnail */}
              <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 shrink-0">
                {pano.panoramaUrl ? (
                  <img
                    src={pano.panoramaUrl}
                    alt={pano.name}
                    className="w-full h-full object-cover opacity-70"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">360°</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{pano.name}</p>
                {pano.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{pano.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1 truncate">{pano.panoramaUrl}</p>
                {pano.initialView && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Yaw {pano.initialView.yaw}° · Pitch {pano.initialView.pitch}° · FOV {pano.initialView.fov}°
                  </p>
                )}
              </div>

              <button
                onClick={() => removePanorama(i)}
                className="p-1.5 text-gray-300 hover:text-red-500 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {panoramas.length === 0 && !showForm && (
            <div className="text-center py-10 text-gray-400">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-2xl">
                🌐
              </div>
              <p className="text-sm font-medium text-gray-600">No panoramas yet</p>
              <p className="text-xs mt-1 text-gray-400">
                Add 360° equirectangular images to enable immersive virtual tours
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
