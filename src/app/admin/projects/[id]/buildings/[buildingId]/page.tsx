'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, ExternalLink, Save, Upload, X } from 'lucide-react';
import MediaManager from '@/components/admin/MediaManager';
import PanoramaManager from '@/components/admin/PanoramaManager';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';

const FloorPlanManager = dynamic(
  () => import('@/components/admin/FloorPlanManager'),
  { ssr: false, loading: () => <div className="h-32 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-olive-500" /></div> }
);

const TABS = ['details', 'media', 'panoramas', 'floor-plan'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  details: 'Details',
  media: 'Media',
  panoramas: 'Panoramas',
  'floor-plan': 'Floor Plan',
};

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400 bg-white';

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function EditBuildingPage() {
  const { id, buildingId } = useParams<{ id: string; buildingId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const building  = useQuery(api.projectBuildings.getById, { id: buildingId as Id<'project_buildings'> });
  const units     = useQuery(api.projectUnits.getByBuilding, { buildingId: buildingId as Id<'project_buildings'> });
  const allUnits  = useQuery(api.projectUnits.getByProject,  { projectId: id as Id<'projects'> });

  const updateBuilding = useMutation(api.projectBuildings.update);
  const generateUrl    = useMutation(api.files.generateUploadUrl);
  const getStorageUrl  = useMutation(api.files.getUrl);

  // ── Details form state ──
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const thumbRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<{
    name: string; slug: string; description: string;
    thumbnail_url: string; total_units: string; floors: string;
  } | null>(null);

  // Initialise form once building loads
  if (building && !form) {
    setForm({
      name:          building.name,
      slug:          building.slug,
      description:   building.description ?? '',
      thumbnail_url: building.thumbnail_url ?? '',
      total_units:   building.total_units?.toString() ?? '',
      floors:        building.floors?.toString() ?? '',
    });
  }

  // ── Upload helper ──
  const uploadFile = async (file: File): Promise<string> => {
    const uploadUrl = await generateUrl();
    const storageId: Id<'_storage'> = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', e => {
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
      setForm(f => f ? { ...f, thumbnail_url: url } : f);
      toast.success('Thumbnail uploaded');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  };

  const handleSaveDetails = async () => {
    if (!form) return;
    if (!form.name) return toast.error('Name is required');
    setSaving(true);
    try {
      await updateBuilding({
        id: buildingId as Id<'project_buildings'>,
        name:          form.name,
        slug:          form.slug || slugify(form.name),
        description:   form.description || undefined,
        thumbnail_url: form.thumbnail_url || undefined,
        total_units:   form.total_units ? Number(form.total_units) : undefined,
        floors:        form.floors ? Number(form.floors) : undefined,
      });
      toast.success('Building saved');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──
  if (building === undefined || units === undefined || allUnits === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-olive-500 animate-spin" />
      </div>
    );
  }

  if (!building) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Building not found.</p>
        <Link href={`/admin/projects/${id}`} className="text-olive-500 hover:underline mt-2 inline-block">
          Back to project
        </Link>
      </div>
    );
  }

  // Use building units if available, else all project units (for zone linking)
  const unitOptions = (allUnits ?? []).map(u => ({
    _id: u._id,
    name: u.name,
    slug: u.slug,
    bedrooms: u.bedrooms,
    status: u.status,
  }));

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/admin/projects/${id}`}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{building.name}</h1>
          <p className="text-gray-500 text-sm">/{building.slug} · {units?.length ?? 0} units</p>
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          <Link
            href={`/admin/projects/${id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg"
          >
            ← Project
          </Link>
          <Link
            href={`/projects/${building.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-olive-500 hover:bg-olive-400 rounded-lg"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Preview
          </Link>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ── Details Tab ── */}
      {activeTab === 'details' && form && (
        <div className="max-w-2xl space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <h3 className="font-semibold text-gray-900">Building Information</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => f ? { ...f, name: e.target.value, slug: slugify(e.target.value) } : f)}
                  placeholder="Block A, Tower 1…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Slug</label>
                <input
                  value={form.slug}
                  onChange={e => setForm(f => f ? { ...f, slug: slugify(e.target.value) } : f)}
                  placeholder="block-a"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => f ? { ...f, description: e.target.value } : f)}
                  placeholder="Premium residential block with panoramic views…"
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Total Units</label>
                <input
                  type="number" min={0}
                  value={form.total_units}
                  onChange={e => setForm(f => f ? { ...f, total_units: e.target.value } : f)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Floors</label>
                <input
                  type="number" min={1}
                  value={form.floors}
                  onChange={e => setForm(f => f ? { ...f, floors: e.target.value } : f)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Thumbnail <span className="text-gray-400 font-normal">(shown in site plan & building grid)</span>
              </label>
              <div className="flex gap-3 items-start">
                <input
                  value={form.thumbnail_url}
                  onChange={e => setForm(f => f ? { ...f, thumbnail_url: e.target.value } : f)}
                  placeholder="https://... or upload →"
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() => thumbRef.current?.click()}
                  disabled={uploading}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload
                </button>
                <input
                  ref={thumbRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbUpload(f); e.target.value = ''; }}
                />
              </div>
              {uploading && uploadProgress > 0 && (
                <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-olive-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              {form.thumbnail_url && (
                <div className="mt-2 relative w-24 h-20 rounded-xl overflow-hidden border border-gray-200">
                  <img src={form.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setForm(f => f ? { ...f, thumbnail_url: '' } : f)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-olive-500 text-white rounded-xl text-sm font-semibold hover:bg-olive-400 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Media Tab ── */}
      {activeTab === 'media' && (
        <MediaManager buildingId={building._id} building={building as any} />
      )}

      {/* ── Panoramas Tab ── */}
      {activeTab === 'panoramas' && (
        <PanoramaManager
          entityId={building._id}
          entityType="building"
          panoramas={building.panoramas ?? []}
        />
      )}

      {/* ── Floor Plan Tab ── */}
      {activeTab === 'floor-plan' && (
        <FloorPlanManager
          buildingId={building._id}
          projectId={id as Id<'projects'>}
          floorPlanUrl={(building as any).floor_plan_url}
          floorPlanZones={(building as any).floor_plan_zones ?? []}
          units={unitOptions}
        />
      )}
    </div>
  );
}
