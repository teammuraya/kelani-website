'use client';

import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState, useRef, useCallback } from 'react';
import {
  Plus, Trash2, GripVertical, Video, Image as ImageIcon,
  Upload, Link as LinkIcon, X, Loader2, AlertCircle,
  CheckCircle2, ChevronDown, ChevronUp, Info, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Category = 'exterior' | 'interior' | 'gallery';
type UploadMode = 'url' | 'file';

type Props = {
  projectId?: Id<'projects'>;
  unitId?: Id<'project_units'>;
  buildingId?: Id<'project_buildings'>;
  project?: any;
  unit?: any;
  building?: any;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400 bg-white';

function UploadProgressBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />{label}
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

// ─── Main MediaManager ────────────────────────────────────────────────────────

export default function MediaManager({ projectId, unitId, buildingId, project, unit, building }: Props) {
  const updateProject  = useMutation(api.projects.update);
  const updateUnit     = useMutation(api.projectUnits.update);
  const updateBuilding = useMutation(api.projectBuildings.update);
  const generateUrl   = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getUrl);

  const entity = project || unit || building;
  const [activeCategory, setActiveCategory] = useState<Category>('exterior');
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');

  // Form state
  const [inputMode, setInputMode] = useState<UploadMode>('url');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MediaItem>>({
    url: '',
    type: 'video',
    thumbnailUrl: '',
    isTransition: false,
    caption: '',
    transitionFromIndex: 0,
    transitionToIndex: 1,
  });
  const [thumbnailMode, setThumbnailMode] = useState<UploadMode>('url');
  // Track the uploaded file name for display
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedThumbName, setUploadedThumbName] = useState('');

  // ── Data helpers ──

  const getMedia = (cat: Category): MediaItem[] =>
    (entity?.[`${cat}_media`] ?? []) as MediaItem[];

  const saveMedia = async (cat: Category, items: MediaItem[]) => {
    setSaving(true);
    try {
      const field = `${cat}_media`;
      if (projectId)        await updateProject({ id: projectId,    [field]: items });
      else if (unitId)     await updateUnit({ id: unitId,      [field]: items });
      else if (buildingId) await updateBuilding({ id: buildingId, [field]: items });
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Core upload helper — returns the served URL ──────────────────────────

  const uploadToConvex = async (
    file: File,
    label: string,
    onProgress?: (pct: number) => void
  ): Promise<string> => {
    const uploadUrl = await generateUrl();

    const storageId: Id<'_storage'> = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 90));
        }
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

    // Resolve the storage ID to a real served URL
    const url = await getStorageUrl({ storageId });
    if (!url) throw new Error('Could not get storage URL');
    return url;
  };

  // ── Upload main media file ──

  const handleMediaFileUpload = async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) return toast.error('Please upload a video or image file');

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadLabel(`Uploading ${file.name}…`);

      const url = await uploadToConvex(file, file.name, (pct) => setUploadProgress(pct));
      setUploadProgress(100);

      setNewItem(p => ({ ...p, url, type: isVideo ? 'video' : 'image' }));
      setUploadedFileName(file.name);
      toast.success(`${file.name} uploaded`);
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => { setUploadProgress(0); setUploadLabel(''); }, 1500);
    }
  };

  // ── Upload thumbnail file ──

  const handleThumbnailFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image');
    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadLabel(`Uploading thumbnail…`);

      const url = await uploadToConvex(file, file.name, (pct) => setUploadProgress(pct));
      setUploadProgress(100);

      setNewItem(p => ({ ...p, thumbnailUrl: url }));
      setUploadedThumbName(file.name);
      toast.success('Thumbnail uploaded');
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => { setUploadProgress(0); setUploadLabel(''); }, 1500);
    }
  };

  // ── Add item ──

  const addItem = async () => {
    if (!newItem.url) return toast.error('Media URL or file is required');
    const items = getMedia(activeCategory);
    const item: MediaItem = {
      url: newItem.url!,
      type: newItem.type ?? 'video',
      thumbnailUrl: newItem.thumbnailUrl || undefined,
      isTransition: newItem.isTransition ?? false,
      transitionFromIndex: newItem.isTransition ? (newItem.transitionFromIndex ?? 0) : undefined,
      transitionToIndex:   newItem.isTransition ? (newItem.transitionToIndex   ?? 1) : undefined,
      displayOrder: items.filter(m => !m.isTransition).length,
      caption: newItem.caption || undefined,
    };
    await saveMedia(activeCategory, [...items, item]);
    setNewItem({
      url: '', type: 'video', thumbnailUrl: '', isTransition: false,
      caption: '', transitionFromIndex: 0, transitionToIndex: 1,
    });
    setUploadedFileName('');
    setUploadedThumbName('');
    setInputMode('url');
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
  const mainItems    = currentMedia.filter(m => !m.isTransition);
  const transItems   = currentMedia.filter(m => m.isTransition);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* ── Category tabs ── */}
        <div className="flex items-center gap-1 p-4 border-b border-gray-100 bg-gray-50">
          {(['exterior', 'interior', 'gallery'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
                activeCategory === cat
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat}
              <span className="ml-1.5 text-xs text-gray-400">
                ({getMedia(cat).filter(m => !m.isTransition).length})
              </span>
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">

          {/* ── Media list ── */}
          <div className="space-y-2">
            {mainItems.length > 0 && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Main Media ({mainItems.length})
              </p>
            )}
            {mainItems.map((item, i) => {
              const realIndex = currentMedia.indexOf(item);
              const thumbUrl  = item.type === 'video' ? (item.thumbnailUrl ?? '') : item.url;
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 items-center mt-1 shrink-0">
                    <button
                      onClick={() => i > 0 && moveItem(realIndex, realIndex - 1)}
                      disabled={i === 0}
                      className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs px-1"
                    >▲</button>
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <button
                      onClick={() => i < mainItems.length - 1 && moveItem(realIndex, realIndex + 1)}
                      disabled={i === mainItems.length - 1}
                      className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs px-1"
                    >▼</button>
                  </div>

                  {/* Preview */}
                  <div className="shrink-0">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="" className="w-16 h-12 object-cover rounded-lg bg-gray-200" />
                    ) : (
                      <div className={`w-16 h-12 rounded-lg flex items-center justify-center ${
                        item.type === 'video' ? 'bg-blue-50' : 'bg-green-50'
                      }`}>
                        {item.type === 'video'
                          ? <Video className="w-6 h-6 text-blue-400" />
                          : <ImageIcon className="w-6 h-6 text-green-400" />}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-gray-700 truncate max-w-[260px]">{item.url}</p>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <ExternalLink className="w-3 h-3 text-gray-300 hover:text-gray-500" />
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.type === 'video'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-green-50 text-green-600'
                      }`}>{item.type}</span>
                      {item.caption && <span className="text-xs text-gray-400 italic">{item.caption}</span>}
                      <span className="text-xs text-gray-300">#{i}</span>
                    </div>
                    {item.thumbnailUrl && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        Thumb: {item.thumbnailUrl}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => removeItem(realIndex)}
                    className="p-1.5 text-gray-300 hover:text-red-500 shrink-0 mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {/* Transition items */}
            {transItems.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2">
                  Transition Videos ({transItems.length})
                </p>
                {transItems.map((item, i) => {
                  const realIndex = currentMedia.indexOf(item);
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <Video className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">{item.url}</p>
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                          clip {item.transitionFromIndex} → clip {item.transitionToIndex}
                        </span>
                      </div>
                      <button onClick={() => removeItem(realIndex)} className="p-1.5 text-gray-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {currentMedia.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">No {activeCategory} media yet</p>
                <p className="text-xs mt-1">Add videos or images below to enable the immersive tour</p>
              </div>
            )}
          </div>

          {/* ── Add new item ── */}
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-sm font-semibold text-gray-800 mb-4">
              Add {activeCategory} media
            </h4>

            {/* Mode toggle — URL or Upload */}
            <div className="flex gap-1 mb-5 p-1 bg-gray-100 rounded-xl w-fit">
              {(['url', 'file'] as UploadMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    inputMode === mode
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {mode === 'url' ? <LinkIcon className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                  {mode === 'url' ? 'Paste URL / Link' : 'Upload File'}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">

              {/* ── Left: main media input ── */}
              <div className="space-y-3">
                {inputMode === 'url' ? (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Media URL *{' '}
                      <span className="text-gray-400 font-normal">
                        (YouTube, Vimeo, direct MP4/image link)
                      </span>
                    </label>
                    <input
                      value={newItem.url}
                      onChange={(e) => setNewItem(p => ({ ...p, url: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=... or https://cdn.../video.mp4"
                      className={inputCls}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Upload video or image file
                    </label>
                    <FileUploadZone
                      accept="video/*,image/*"
                      label="Click or drop a video / image"
                      onFile={handleMediaFileUpload}
                      disabled={uploading}
                    />
                    {newItem.url && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded-lg border border-green-100">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <p className="text-xs text-green-700 truncate">
                          {uploadedFileName || newItem.url}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Type selector */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Media type</label>
                  <div className="flex gap-2">
                    {(['video', 'image'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setNewItem(p => ({ ...p, type: t }))}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          newItem.type === t
                            ? t === 'video'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-green-50 border-green-200 text-green-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {t === 'video' ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Caption <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    value={newItem.caption}
                    onChange={(e) => setNewItem(p => ({ ...p, caption: e.target.value }))}
                    placeholder="e.g. Front entrance, Master bedroom…"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* ── Right: thumbnail ── */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Thumbnail{' '}
                    <span className="text-gray-400 font-normal">
                      (preview image shown for videos in carousel)
                    </span>
                  </label>

                  {/* Thumbnail mode toggle */}
                  <div className="flex gap-1 mb-2 p-0.5 bg-gray-100 rounded-lg w-fit">
                    {(['url', 'file'] as UploadMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setThumbnailMode(mode)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          thumbnailMode === mode ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'
                        }`}
                      >
                        {mode === 'url' ? <LinkIcon className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                        {mode === 'url' ? 'URL' : 'Upload'}
                      </button>
                    ))}
                  </div>

                  {thumbnailMode === 'url' ? (
                    <input
                      value={newItem.thumbnailUrl}
                      onChange={(e) => setNewItem(p => ({ ...p, thumbnailUrl: e.target.value }))}
                      placeholder="https://... (image URL)"
                      className={inputCls}
                    />
                  ) : (
                    <>
                      <FileUploadZone
                        accept="image/*"
                        label="Click or drop thumbnail image"
                        onFile={handleThumbnailFileUpload}
                        disabled={uploading}
                      />
                      {newItem.thumbnailUrl && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded-lg border border-green-100">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          <p className="text-xs text-green-700 truncate">
                            {uploadedThumbName || newItem.thumbnailUrl}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Thumbnail preview */}
                {newItem.thumbnailUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    <img
                      src={newItem.thumbnailUrl}
                      alt="Thumbnail preview"
                      className="w-full h-28 object-cover"
                    />
                    <button
                      onClick={() => { setNewItem(p => ({ ...p, thumbnailUrl: '' })); setUploadedThumbName(''); }}
                      className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="mt-4">
                <UploadProgressBar progress={uploadProgress} label={uploadLabel} />
              </div>
            )}

            {/* Advanced — transition options */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 mt-5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Advanced: transition video options
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-700">
                    Transition videos play between two main clips for a seamless effect. Upload a short
                    clip (1–5 sec) and specify which clip indices it bridges.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItem.isTransition}
                    onChange={(e) => setNewItem(p => ({ ...p, isTransition: e.target.checked }))}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Mark as transition video</span>
                </label>
                {newItem.isTransition && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">From clip #</label>
                      <input
                        type="number" min={0}
                        value={newItem.transitionFromIndex ?? 0}
                        onChange={(e) => setNewItem(p => ({ ...p, transitionFromIndex: Number(e.target.value) }))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">To clip #</label>
                      <input
                        type="number" min={0}
                        value={newItem.transitionToIndex ?? 1}
                        onChange={(e) => setNewItem(p => ({ ...p, transitionToIndex: Number(e.target.value) }))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={addItem}
              disabled={saving || uploading || !newItem.url}
              className="mt-5 flex items-center gap-2 px-6 py-3 bg-olive-500 hover:bg-olive-400 text-white rounded-xl transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Saving…' : `Add to ${activeCategory}`}
            </button>
          </div>

          {/* Tips */}
          <div className="flex items-start gap-2 text-xs text-gray-400 pt-4 border-t border-gray-100">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-300" />
            <span>
              Supports YouTube links, Vimeo links, direct MP4/WebM/image URLs, and file uploads.
              For video items, add a thumbnail so the carousel shows a still-frame preview.
              Files uploaded here are stored securely in Convex storage.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
