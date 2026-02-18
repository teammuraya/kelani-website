'use client';

import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

type Panorama = {
  name: string;
  panoramaUrl: string;
  description?: string;
  initialView?: { yaw: number; pitch: number; fov: number };
};

type Props = {
  entityId: Id<'projects'> | Id<'project_units'>;
  entityType: 'project' | 'unit';
  panoramas: Panorama[];
};

export default function PanoramaManager({ entityId, entityType, panoramas }: Props) {
  const updateProject = useMutation(api.projects.update);
  const updateUnit = useMutation(api.projectUnits.update);

  const [saving, setSaving] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [newPanorama, setNewPanorama] = useState<Partial<Panorama>>({
    name: '',
    panoramaUrl: '',
    description: '',
    initialView: { yaw: 0, pitch: 0, fov: 100 },
  });
  const [showForm, setShowForm] = useState(false);

  const savePanoramas = async (items: Panorama[]) => {
    setSaving(true);
    try {
      if (entityType === 'project') {
        await updateProject({ id: entityId as Id<'projects'>, panoramas: items });
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
    if (!newPanorama.name || !newPanorama.panoramaUrl) {
      return toast.error('Name and URL are required');
    }
    const item: Panorama = {
      name: newPanorama.name!,
      panoramaUrl: newPanorama.panoramaUrl!,
      description: newPanorama.description || undefined,
      initialView: newPanorama.initialView,
    };
    await savePanoramas([...panoramas, item]);
    setNewPanorama({ name: '', panoramaUrl: '', description: '', initialView: { yaw: 0, pitch: 0, fov: 100 } });
    setShowForm(false);
  };

  const removePanorama = async (index: number) => {
    if (!confirm('Remove this panorama?')) return;
    await savePanoramas(panoramas.filter((_, i) => i !== index));
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400';

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-900">360° Panoramas</h3>
            <p className="text-sm text-gray-500">{panoramas.length} panorama{panoramas.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-olive-500 text-white rounded-xl hover:bg-olive-400 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Panorama
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-gray-50 rounded-xl p-5 mb-5 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">New Panorama</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
                <input
                  value={newPanorama.name}
                  onChange={(e) => setNewPanorama((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Living Room"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Panorama URL *</label>
                <input
                  value={newPanorama.panoramaUrl}
                  onChange={(e) => setNewPanorama((p) => ({ ...p, panoramaUrl: e.target.value }))}
                  placeholder="https://... (equirectangular image)"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Description (optional)</label>
                <input
                  value={newPanorama.description}
                  onChange={(e) => setNewPanorama((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Spacious open-plan living area"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-gray-600 mb-2">Initial View (optional)</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['yaw', 'pitch', 'fov'] as const).map((key) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 block mb-1 capitalize">{key}</label>
                      <input
                        type="number"
                        value={newPanorama.initialView?.[key] ?? (key === 'fov' ? 100 : 0)}
                        onChange={(e) => setNewPanorama((p) => ({
                          ...p,
                          initialView: { ...p.initialView, [key]: Number(e.target.value) } as any,
                        }))}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={addPanorama}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-olive-500 text-white rounded-lg text-sm hover:bg-olive-400 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Panorama'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {panoramas.map((pano, i) => (
            <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg shrink-0">
                360°
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{pano.name}</p>
                {pano.description && <p className="text-sm text-gray-500 mt-0.5">{pano.description}</p>}
                <p className="text-xs text-gray-400 mt-1 truncate">{pano.panoramaUrl}</p>
                {pano.initialView && (
                  <p className="text-xs text-gray-400">
                    Yaw: {pano.initialView.yaw}° · Pitch: {pano.initialView.pitch}° · FOV: {pano.initialView.fov}°
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
            <div className="text-center py-8 text-gray-400 text-sm">
              No panoramas yet. Add 360° equirectangular images to enable panorama views.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
