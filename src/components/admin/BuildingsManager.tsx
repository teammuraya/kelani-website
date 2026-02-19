'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import Link from 'next/link';
import {
  Plus, Building2, ExternalLink, Trash2, Edit2, Upload, Loader2,
  CheckCircle2, X, GripVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

type Building = {
  _id: Id<'project_buildings'>;
  name: string;
  slug: string;
  description?: string;
  thumbnail_url?: string;
  floor_plan_url?: string;
  total_units?: number;
  floors?: number;
  displayOrder?: number;
};

type Props = {
  projectId: Id<'projects'>;
  projectSlug: string;
  buildings: Building[];
};

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400 bg-white';

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function BuildingsManager({ projectId, projectSlug, buildings }: Props) {
  const createBuilding = useMutation(api.projectBuildings.create);
  const deleteBuilding = useMutation(api.projectBuildings.remove);
  const generateUrl    = useMutation(api.files.generateUploadUrl);
  const getStorageUrl  = useMutation(api.files.getUrl);

  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    thumbnail_url: '',
    total_units: '',
    floors: '',
  });

  const uploadFile = async (file: File): Promise<string> => {
    const uploadUrl = await generateUrl();
    const storageId: Id<'_storage'> = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 90));
      });
      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).storageId);
        else reject(new Error('Upload failed'));
      };
      xhr.onerror = () => reject(new Error('Network error'));
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
      setUploading(true);
      setUploadProgress(0);
      const url = await uploadFile(file);
      setUploadProgress(100);
      setForm(f => ({ ...f, thumbnail_url: url }));
      toast.success('Thumbnail uploaded');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  };

  const handleCreate = async () => {
    if (!form.name) return toast.error('Name is required');
    const slug = form.slug || slugify(form.name);
    setSaving(true);
    try {
      await createBuilding({
        projectId,
        name: form.name,
        slug,
        description: form.description || undefined,
        thumbnail_url: form.thumbnail_url || undefined,
        total_units: form.total_units ? Number(form.total_units) : undefined,
        floors: form.floors ? Number(form.floors) : undefined,
        displayOrder: buildings.length,
      });
      toast.success('Building created');
      setShowForm(false);
      setForm({ name: '', slug: '', description: '', thumbnail_url: '', total_units: '', floors: '' });
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: Id<'project_buildings'>, name: string) => {
    if (!confirm(`Delete building "${name}"? This will not delete linked units.`)) return;
    try {
      await deleteBuilding({ id });
      toast.success('Building deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900">Buildings / Blocks</h3>
            <p className="text-sm text-gray-500">
              {buildings.length} building{buildings.length !== 1 ? 's' : ''} —
              each building has its own floor plan canvas for drawing unit zones
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-olive-500 text-white rounded-xl hover:bg-olive-400 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Building
          </button>
        </div>

        {/* New building form */}
        {showForm && (
          <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-200 space-y-4">
            <h4 className="font-medium text-gray-900">New Building</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                  placeholder="Block A, Tower 1, Building West…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Slug <span className="text-gray-400 font-normal">(auto-generated)</span>
                </label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                  placeholder="block-a"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Premium residential block with panoramic views"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Total Units</label>
                <input
                  type="number" min={0}
                  value={form.total_units}
                  onChange={(e) => setForm(f => ({ ...f, total_units: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Floors</label>
                <input
                  type="number" min={1}
                  value={form.floors}
                  onChange={(e) => setForm(f => ({ ...f, floors: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Thumbnail */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Thumbnail <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex gap-3 items-start">
                  <input
                    value={form.thumbnail_url}
                    onChange={(e) => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                    placeholder="https://... or upload →"
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    onClick={() => thumbInputRef.current?.click()}
                    disabled={uploading}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload
                  </button>
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbUpload(f); e.target.value = ''; }}
                  />
                </div>
                {uploading && uploadProgress > 0 && (
                  <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-olive-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
                {form.thumbnail_url && (
                  <div className="mt-2 relative w-20 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={form.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, thumbnail_url: '' }))} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={saving || !form.name}
                className="flex items-center gap-2 px-5 py-2.5 bg-olive-500 text-white rounded-xl text-sm font-semibold hover:bg-olive-400 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Creating…' : 'Create Building'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {buildings.map((b) => (
            <div key={b._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                {b.thumbnail_url ? (
                  <img src={b.thumbnail_url} alt={b.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{b.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  /{b.slug}
                  {b.total_units && ` · ${b.total_units} units`}
                  {b.floors && ` · ${b.floors} floors`}
                </p>
                {b.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{b.description}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/projects/${projectSlug}/buildings/${b.slug}`}
                  target="_blank"
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Preview building"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <Link
                  href={`/admin/projects/${projectId}/buildings/${b._id}`}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Edit building"
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(b._id, b.name)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {buildings.length === 0 && !showForm && (
            <div className="text-center py-12 text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No buildings yet</p>
              <p className="text-xs mt-1">Add buildings to define zones on the master plan and draw unit floor plans</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
