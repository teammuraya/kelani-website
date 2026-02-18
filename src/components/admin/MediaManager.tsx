'use client';

import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState } from 'react';
import { Plus, Trash2, GripVertical, Video, Image as ImageIcon, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

type MediaItem = {
  url: string;
  type: 'video' | 'image';
  thumbnailUrl?: string;
  isTransition?: boolean;
  transitionFromIndex?: number;
  transitionToIndex?: number;
  displayOrder?: number;
  caption?: string;
};

type Props = {
  projectId?: Id<'projects'>;
  unitId?: Id<'project_units'>;
  project?: any;
  unit?: any;
};

type Category = 'exterior' | 'interior' | 'gallery';

export default function MediaManager({ projectId, unitId, project, unit }: Props) {
  const updateProject = useMutation(api.projects.update);
  const updateUnit = useMutation(api.projectUnits.update);

  const entity = project || unit;
  const [activeCategory, setActiveCategory] = useState<Category>('exterior');
  const [saving, setSaving] = useState(false);

  const [newItem, setNewItem] = useState<Partial<MediaItem>>({
    url: '',
    type: 'video',
    thumbnailUrl: '',
    isTransition: false,
    caption: '',
    displayOrder: 0,
  });

  const getMedia = (cat: Category): MediaItem[] => {
    return (entity?.[`${cat}_media`] ?? []) as MediaItem[];
  };

  const saveMedia = async (cat: Category, items: MediaItem[]) => {
    setSaving(true);
    try {
      const field = `${cat}_media`;
      if (projectId) {
        await updateProject({ id: projectId, [field]: items });
      } else if (unitId) {
        await updateUnit({ id: unitId, [field]: items });
      }
      toast.success('Media saved');
    } catch {
      toast.error('Failed to save media');
    } finally {
      setSaving(false);
    }
  };

  const addItem = async () => {
    if (!newItem.url) return toast.error('URL is required');
    const items = getMedia(activeCategory);
    const item: MediaItem = {
      url: newItem.url!,
      type: newItem.type ?? 'video',
      thumbnailUrl: newItem.thumbnailUrl || undefined,
      isTransition: newItem.isTransition ?? false,
      transitionFromIndex: newItem.isTransition ? (newItem.transitionFromIndex ?? 0) : undefined,
      transitionToIndex: newItem.isTransition ? (newItem.transitionToIndex ?? 1) : undefined,
      displayOrder: items.length,
      caption: newItem.caption || undefined,
    };
    await saveMedia(activeCategory, [...items, item]);
    setNewItem({ url: '', type: 'video', thumbnailUrl: '', isTransition: false, caption: '', displayOrder: 0 });
  };

  const removeItem = async (index: number) => {
    const items = getMedia(activeCategory).filter((_, i) => i !== index);
    await saveMedia(activeCategory, items);
  };

  const moveItem = async (from: number, to: number) => {
    const items = [...getMedia(activeCategory)];
    const [item] = items.splice(from, 1);
    items.splice(to, 0, item);
    await saveMedia(activeCategory, items.map((m, i) => ({ ...m, displayOrder: i })));
  };

  const currentMedia = getMedia(activeCategory);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {/* Category tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {(['exterior', 'interior', 'gallery'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all ${activeCategory === cat ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {cat} ({getMedia(cat).length})
            </button>
          ))}
        </div>

        {/* Media list */}
        <div className="space-y-3 mb-6">
          {currentMedia.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex flex-col gap-1 items-center mt-1">
                <button onClick={() => i > 0 && moveItem(i, i - 1)} disabled={i === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-30 text-xs">▲</button>
                <GripVertical className="w-4 h-4 text-gray-300" />
                <button onClick={() => i < currentMedia.length - 1 && moveItem(i, i + 1)} disabled={i === currentMedia.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-30 text-xs">▼</button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.type === 'video' ? <Video className="w-4 h-4 text-blue-500" /> : <ImageIcon className="w-4 h-4 text-green-500" />}
                {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" className="w-12 h-8 object-cover rounded" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.url}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs text-gray-400 capitalize">{item.type}</span>
                  {item.isTransition && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Transition {item.transitionFromIndex}→{item.transitionToIndex}</span>}
                  {item.caption && <span className="text-xs text-gray-400">{item.caption}</span>}
                </div>
              </div>
              <button onClick={() => removeItem(i)} className="p-1.5 text-gray-300 hover:text-red-500 shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {currentMedia.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No {activeCategory} media yet
            </div>
          )}
        </div>

        {/* Add new item */}
        <div className="border-t border-gray-100 pt-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Add Media Item</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">URL *</label>
              <input
                value={newItem.url}
                onChange={(e) => setNewItem((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://youtube.com/... or direct video/image URL"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
              <select value={newItem.type} onChange={(e) => setNewItem((p) => ({ ...p, type: e.target.value as any }))} className={inputCls}>
                <option value="video">Video</option>
                <option value="image">Image</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Thumbnail URL (videos)</label>
              <input
                value={newItem.thumbnailUrl}
                onChange={(e) => setNewItem((p) => ({ ...p, thumbnailUrl: e.target.value }))}
                placeholder="https://..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Caption (optional)</label>
              <input
                value={newItem.caption}
                onChange={(e) => setNewItem((p) => ({ ...p, caption: e.target.value }))}
                placeholder="e.g. Front entrance"
                className={inputCls}
              />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newItem.isTransition}
                  onChange={(e) => setNewItem((p) => ({ ...p, isTransition: e.target.checked }))}
                  className="w-4 h-4 accent-purple-500"
                />
                <span className="text-sm text-gray-700">Transition video</span>
              </label>
            </div>
            {newItem.isTransition && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Transition From Index</label>
                  <input type="number" value={newItem.transitionFromIndex ?? 0} onChange={(e) => setNewItem((p) => ({ ...p, transitionFromIndex: Number(e.target.value) }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Transition To Index</label>
                  <input type="number" value={newItem.transitionToIndex ?? 1} onChange={(e) => setNewItem((p) => ({ ...p, transitionToIndex: Number(e.target.value) }))} className={inputCls} />
                </div>
              </>
            )}
          </div>
          <button
            onClick={addItem}
            disabled={saving}
            className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-olive-500 text-white rounded-xl hover:bg-olive-400 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Saving...' : 'Add Item'}
          </button>
        </div>

        <div className="mt-5 flex items-start gap-2 text-xs text-gray-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Supports YouTube, Vimeo, and direct video/image URLs. Transition videos play between main video clips for smooth navigation.</span>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400';
