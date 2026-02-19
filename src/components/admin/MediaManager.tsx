'use client';

import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState, useRef, useCallback } from 'react';
import {
  Plus, Trash2, GripVertical, Video, Image as ImageIcon,
  Upload, Link as LinkIcon, X, Loader2, AlertCircle,
  CheckCircle2, Info, ExternalLink, ArrowDown, Zap,
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

// ─── ClipThumb ────────────────────────────────────────────────────────────────

function ClipThumb({ item, index, label }: { item: MediaItem; index: number; label?: string }) {
  const thumbUrl = item.type === 'video' ? (item.thumbnailUrl ?? '') : item.url;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-14 h-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0">
        {thumbUrl
          ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              <Video className="w-4 h-4 text-gray-400" />
            </div>
        }
      </div>
      <span className="text-[10px] text-gray-500 font-mono">#{index} {label ?? item.caption ?? ''}</span>
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

  // ── Which tab in the add form ──
  const [addMode, setAddMode] = useState<'main' | 'transition'>('main');

  // Form state — main
  const [inputMode, setInputMode] = useState<UploadMode>('url');
  const [newItem, setNewItem] = useState<Partial<MediaItem>>({
    url: '', type: 'video', thumbnailUrl: '', caption: '',
  });
  const [thumbnailMode, setThumbnailMode] = useState<UploadMode>('url');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedThumbName, setUploadedThumbName] = useState('');

  // Form state — transition
  const [transInputMode, setTransInputMode] = useState<UploadMode>('url');
  const [transItem, setTransItem] = useState<Partial<MediaItem>>({
    url: '', type: 'video', thumbnailUrl: '',
    isTransition: true, transitionFromIndex: 0, transitionToIndex: 1,
  });
  const [uploadedTransName, setUploadedTransName] = useState('');

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

  // ── Upload helper ──────────────────────────────────────────────────────────

  const uploadToConvex = async (
    file: File,
    label: string,
    onProgress?: (pct: number) => void
  ): Promise<string> => {
    const uploadUrl = await generateUrl();

    const storageId: Id<'_storage'> = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 90));
      });
      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).storageId as Id<'_storage'>);
        else reject(new Error(`Upload failed: ${xhr.status}`));
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

  // ── Generic upload wrapper ──

  const handleFileUpload = async (
    file: File,
    onSuccess: (url: string) => void,
    setName: (n: string) => void,
    label: string,
  ) => {
    try {
      setUploading(true); setUploadProgress(0); setUploadLabel(label);
      const url = await uploadToConvex(file, file.name, (pct) => setUploadProgress(pct));
      setUploadProgress(100);
      onSuccess(url); setName(file.name);
      toast.success(`${file.name} uploaded`);
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => { setUploadProgress(0); setUploadLabel(''); }, 1500);
    }
  };

  // ── Add main item ──

  const addMainItem = async () => {
    if (!newItem.url) return toast.error('Media URL or file is required');
    const items = getMedia(activeCategory);
    const item: MediaItem = {
      url: newItem.url!,
      type: newItem.type ?? 'video',
      thumbnailUrl: newItem.thumbnailUrl || undefined,
      isTransition: false,
      displayOrder: items.filter(m => !m.isTransition).length,
      caption: newItem.caption || undefined,
    };
    await saveMedia(activeCategory, [...items, item]);
    setNewItem({ url: '', type: 'video', thumbnailUrl: '', caption: '' });
    setUploadedFileName(''); setUploadedThumbName('');
    setInputMode('url');
  };

  // ── Add transition item ──

  const addTransitionItem = async () => {
    if (!transItem.url) return toast.error('Transition video URL or file is required');
    const items = getMedia(activeCategory);
    const mainItems = items.filter(m => !m.isTransition);
    const from = transItem.transitionFromIndex ?? 0;
    const to   = transItem.transitionToIndex   ?? 1;
    if (from >= mainItems.length || to >= mainItems.length) {
      return toast.error(`Clip indices must be between 0 and ${mainItems.length - 1}`);
    }
    const item: MediaItem = {
      url: transItem.url!,
      type: 'video',
      thumbnailUrl: transItem.thumbnailUrl || undefined,
      isTransition: true,
      transitionFromIndex: from,
      transitionToIndex:   to,
    };
    await saveMedia(activeCategory, [...items, item]);
    setTransItem({ url: '', type: 'video', thumbnailUrl: '', isTransition: true, transitionFromIndex: 0, transitionToIndex: 1 });
    setUploadedTransName('');
    setTransInputMode('url');
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

  // Build the interleaved display: for each gap between clips, show any transition that bridges it
  const getTransitionsForGap = (fromIdx: number, toIdx: number) =>
    transItems.filter(t => t.transitionFromIndex === fromIdx && t.transitionToIndex === toIdx);

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

          {/* ── Interleaved media list ── */}
          <div>
            {currentMedia.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">No {activeCategory} media yet</p>
                <p className="text-xs mt-1">Add videos or images below to enable the immersive tour</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Clips & Transitions — {mainItems.length} clips · {transItems.length} transitions
                </p>

                {mainItems.map((item, i) => {
                  const realIndex = currentMedia.indexOf(item);
                  const thumbUrl  = item.type === 'video' ? (item.thumbnailUrl ?? '') : item.url;
                  // Transitions from this clip to the next
                  const transitionsBelow = i < mainItems.length - 1
                    ? getTransitionsForGap(i, i + 1)
                    : [];
                  // Also show orphan transitions that reference this index
                  const orphanTrans = transItems.filter(t =>
                    (t.transitionFromIndex === i || t.transitionToIndex === i) &&
                    !transitionsBelow.includes(t)
                  );

                  return (
                    <div key={i}>
                      {/* ── Clip row ── */}
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
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

                        {/* Clip # badge */}
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold shrink-0 mt-1">
                          {i}
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
                              item.type === 'video' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                            }`}>{item.type}</span>
                            {item.caption && <span className="text-xs text-gray-400 italic">{item.caption}</span>}
                          </div>
                          {item.thumbnailUrl && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              Thumb: {item.thumbnailUrl}
                            </p>
                          )}
                        </div>

                        <button onClick={() => removeItem(realIndex)} className="p-1.5 text-gray-300 hover:text-red-500 shrink-0 mt-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* ── Transitions between this clip and next ── */}
                      {transitionsBelow.length > 0 && (
                        <div className="ml-16 my-1 space-y-1">
                          {transitionsBelow.map((t, ti) => {
                            const tRealIndex = currentMedia.indexOf(t);
                            const tThumb = t.thumbnailUrl ?? '';
                            return (
                              <div key={ti} className="flex items-center gap-2">
                                {/* Left connector line */}
                                <div className="flex flex-col items-center w-6 shrink-0">
                                  <div className="w-px h-2 bg-purple-200" />
                                  <ArrowDown className="w-3 h-3 text-purple-400" />
                                  <div className="w-px h-2 bg-purple-200" />
                                </div>

                                {/* Transition card */}
                                <div className="flex-1 flex items-center gap-2 p-2 bg-purple-50 rounded-xl border border-purple-100">
                                  <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />

                                  {tThumb && (
                                    <img src={tThumb} alt="" className="w-10 h-7 object-cover rounded-md shrink-0" />
                                  )}
                                  {!tThumb && (
                                    <div className="w-10 h-7 rounded-md bg-purple-100 flex items-center justify-center shrink-0">
                                      <Video className="w-3 h-3 text-purple-400" />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] text-purple-700 font-semibold">
                                      Transition: clip {t.transitionFromIndex} → clip {t.transitionToIndex}
                                    </p>
                                    <p className="text-[10px] text-gray-400 truncate">{t.url}</p>
                                  </div>

                                  <button onClick={() => removeItem(tRealIndex)} className="p-1 text-purple-300 hover:text-red-400 shrink-0">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Down arrow between clips (if not last) */}
                      {i < mainItems.length - 1 && transitionsBelow.length === 0 && (
                        <div className="ml-[4.5rem] flex items-center justify-start py-0.5">
                          <div className="w-px h-4 bg-gray-200" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Orphan transitions (reference non-adjacent clips) */}
                {transItems.filter(t => {
                  const f = t.transitionFromIndex ?? 0;
                  const to = t.transitionToIndex ?? 1;
                  return Math.abs(to - f) !== 1;
                }).length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 mb-2">Non-sequential transitions</p>
                    {transItems.filter(t => Math.abs((t.transitionToIndex ?? 1) - (t.transitionFromIndex ?? 0)) !== 1).map((t, ti) => {
                      const tRealIndex = currentMedia.indexOf(t);
                      return (
                        <div key={ti} className="flex items-center gap-2 py-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-xs text-amber-700">clip {t.transitionFromIndex} → clip {t.transitionToIndex}</span>
                          <span className="text-xs text-gray-400 truncate flex-1">{t.url}</span>
                          <button onClick={() => removeItem(tRealIndex)} className="p-1 text-amber-300 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Add form — tabbed: Main clip | Transition ── */}
          <div className="border-t border-gray-100 pt-6">

            {/* Tab selector */}
            <div className="flex gap-1 mb-5 p-1 bg-gray-100 rounded-xl w-fit">
              <button
                onClick={() => setAddMode('main')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  addMode === 'main' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Add clip
              </button>
              <button
                onClick={() => setAddMode('transition')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  addMode === 'transition' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-purple-500" />
                <span>Add transition</span>
                {mainItems.length === 0 && addMode === 'main' && (
                  <span className="text-xs text-gray-400">(add clips first)</span>
                )}
              </button>
            </div>

            {/* ════════ MAIN CLIP FORM ════════ */}
            {addMode === 'main' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-800">Add {activeCategory} clip or image</h4>

                {/* Mode toggle */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                  {(['url', 'file'] as UploadMode[]).map(mode => (
                    <button key={mode} onClick={() => setInputMode(mode)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        inputMode === mode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {mode === 'url' ? <LinkIcon className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                      {mode === 'url' ? 'Paste URL' : 'Upload File'}
                    </button>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Left: media */}
                  <div className="space-y-3">
                    {inputMode === 'url' ? (
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Media URL <span className="text-gray-400 font-normal">(YouTube, Vimeo, direct MP4/image)</span>
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
                        <label className="text-xs font-medium text-gray-600 block mb-1">Upload video or image</label>
                        <FileUploadZone
                          accept="video/*,image/*"
                          label="Click or drop a video / image"
                          onFile={(f) => handleFileUpload(
                            f,
                            (url) => setNewItem(p => ({ ...p, url, type: f.type.startsWith('video') ? 'video' : 'image' })),
                            setUploadedFileName,
                            `Uploading ${f.name}…`
                          )}
                          disabled={uploading}
                        />
                        {newItem.url && (
                          <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded-lg border border-green-100">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            <p className="text-xs text-green-700 truncate">{uploadedFileName || newItem.url}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Media type</label>
                      <div className="flex gap-2">
                        {(['video', 'image'] as const).map(t => (
                          <button key={t} onClick={() => setNewItem(p => ({ ...p, type: t }))}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                              newItem.type === t
                                ? t === 'video' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-green-50 border-green-200 text-green-700'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            {t === 'video' ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Caption <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input
                        value={newItem.caption}
                        onChange={(e) => setNewItem(p => ({ ...p, caption: e.target.value }))}
                        placeholder="e.g. Front entrance, Master bedroom…"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Right: thumbnail */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Thumbnail <span className="text-gray-400 font-normal">(preview image for videos in carousel)</span>
                      </label>
                      <div className="flex gap-1 mb-2 p-0.5 bg-gray-100 rounded-lg w-fit">
                        {(['url', 'file'] as UploadMode[]).map(mode => (
                          <button key={mode} onClick={() => setThumbnailMode(mode)}
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
                            onFile={(f) => handleFileUpload(
                              f,
                              (url) => setNewItem(p => ({ ...p, thumbnailUrl: url })),
                              setUploadedThumbName,
                              'Uploading thumbnail…'
                            )}
                            disabled={uploading}
                          />
                          {newItem.thumbnailUrl && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded-lg border border-green-100">
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                              <p className="text-xs text-green-700 truncate">{uploadedThumbName || newItem.thumbnailUrl}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {newItem.thumbnailUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-gray-200">
                        <img src={newItem.thumbnailUrl} alt="Thumbnail preview" className="w-full h-28 object-cover" />
                        <button onClick={() => { setNewItem(p => ({ ...p, thumbnailUrl: '' })); setUploadedThumbName(''); }}
                          className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full p-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {uploading && (
                  <div className="mt-2">
                    <UploadProgressBar progress={uploadProgress} label={uploadLabel} />
                  </div>
                )}

                <button
                  onClick={addMainItem}
                  disabled={saving || uploading || !newItem.url}
                  className="mt-2 flex items-center gap-2 px-6 py-3 bg-olive-500 hover:bg-olive-400 text-white rounded-xl transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Saving…' : `Add clip to ${activeCategory}`}
                </button>
              </div>
            )}

            {/* ════════ TRANSITION FORM ════════ */}
            {addMode === 'transition' && (
              <div className="space-y-4">

                {/* Explainer */}
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-purple-700 space-y-1">
                    <p className="font-semibold">What are transition videos?</p>
                    <p className="text-xs text-purple-600">
                      A short 1–5 sec clip that plays automatically when the viewer switches from one main clip to another — creating a smooth cinematic cut. Upload a clip and select which two clips it bridges.
                    </p>
                  </div>
                </div>

                {mainItems.length < 2 ? (
                  <div className="text-center py-6 text-gray-400">
                    <Zap className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm">You need at least 2 main clips before adding transitions.</p>
                  </div>
                ) : (
                  <>
                    {/* Visual clip selector */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-3">
                        Bridging — select which clips this transition connects
                      </label>

                      {/* Row of clips with FROM / TO selectors */}
                      <div className="flex items-center gap-2 flex-wrap p-4 bg-gray-50 rounded-xl border border-gray-200">
                        {mainItems.map((clip, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {/* Clip card — clickable as FROM or TO */}
                            <div
                              className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                                transItem.transitionFromIndex === i
                                  ? 'border-purple-400 scale-105 shadow-md'
                                  : transItem.transitionToIndex === i
                                  ? 'border-blue-400 scale-105 shadow-md'
                                  : 'border-transparent opacity-60 hover:opacity-90 hover:border-gray-300'
                              }`}
                              onClick={() => {
                                // Cycle: unset → from → to → unset
                                if (transItem.transitionFromIndex === i) {
                                  setTransItem(p => ({ ...p, transitionFromIndex: undefined }));
                                } else if (transItem.transitionToIndex === i) {
                                  setTransItem(p => ({ ...p, transitionToIndex: undefined }));
                                } else if (transItem.transitionFromIndex === undefined) {
                                  setTransItem(p => ({ ...p, transitionFromIndex: i }));
                                } else {
                                  setTransItem(p => ({ ...p, transitionToIndex: i }));
                                }
                              }}
                            >
                              <div className="w-16 h-12 bg-gray-200">
                                {(clip.thumbnailUrl || clip.type === 'image') ? (
                                  <img src={clip.thumbnailUrl ?? clip.url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-blue-50">
                                    <Video className="w-5 h-5 text-blue-400" />
                                  </div>
                                )}
                              </div>
                              {/* Badge */}
                              {transItem.transitionFromIndex === i && (
                                <div className="absolute top-0 left-0 right-0 bg-purple-500 text-white text-[9px] text-center font-bold py-0.5">FROM</div>
                              )}
                              {transItem.transitionToIndex === i && (
                                <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-[9px] text-center font-bold py-0.5">TO</div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center font-mono py-0.5">
                                #{i}
                              </div>
                            </div>

                            {/* Arrow between clips */}
                            {i < mainItems.length - 1 && (
                              <span className="text-gray-300 text-lg">→</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Click a clip to set it as <span className="font-semibold text-purple-500">FROM</span> (purple), click another to set as <span className="font-semibold text-blue-500">TO</span> (blue).
                      </p>

                      {/* Selected summary */}
                      {transItem.transitionFromIndex !== undefined && transItem.transitionToIndex !== undefined && (
                        <div className="flex items-center gap-3 mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                          <ClipThumb item={mainItems[transItem.transitionFromIndex]} index={transItem.transitionFromIndex} />
                          <div className="flex flex-col items-center">
                            <Zap className="w-4 h-4 text-purple-400 mb-1" />
                            <span className="text-[10px] text-purple-500 font-semibold">TRANSITION</span>
                          </div>
                          <ClipThumb item={mainItems[transItem.transitionToIndex]} index={transItem.transitionToIndex} />
                        </div>
                      )}
                    </div>

                    {/* Transition video upload */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-2">Transition video file</label>

                      <div className="flex gap-1 mb-3 p-1 bg-gray-100 rounded-xl w-fit">
                        {(['url', 'file'] as UploadMode[]).map(mode => (
                          <button key={mode} onClick={() => setTransInputMode(mode)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              transInputMode === mode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {mode === 'url' ? <LinkIcon className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                            {mode === 'url' ? 'Paste URL' : 'Upload File'}
                          </button>
                        ))}
                      </div>

                      {transInputMode === 'url' ? (
                        <input
                          value={transItem.url}
                          onChange={(e) => setTransItem(p => ({ ...p, url: e.target.value }))}
                          placeholder="https://cdn.../transition.mp4"
                          className={inputCls}
                        />
                      ) : (
                        <>
                          <FileUploadZone
                            accept="video/*"
                            label="Click or drop a short transition clip (1–5 sec)"
                            onFile={(f) => handleFileUpload(
                              f,
                              (url) => setTransItem(p => ({ ...p, url })),
                              setUploadedTransName,
                              `Uploading ${f.name}…`
                            )}
                            disabled={uploading}
                          />
                          {transItem.url && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded-lg border border-green-100">
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                              <p className="text-xs text-green-700 truncate">{uploadedTransName || transItem.url}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {uploading && (
                      <UploadProgressBar progress={uploadProgress} label={uploadLabel} />
                    )}

                    <button
                      onClick={addTransitionItem}
                      disabled={
                        saving || uploading || !transItem.url ||
                        transItem.transitionFromIndex === undefined ||
                        transItem.transitionToIndex === undefined
                      }
                      className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {saving ? 'Saving…' : 'Add transition'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="flex items-start gap-2 text-xs text-gray-400 pt-4 border-t border-gray-100">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-300" />
            <span>
              Supports YouTube, Vimeo, direct MP4/WebM/image URLs, and file uploads.
              Add a thumbnail so the carousel shows a still-frame preview for videos.
              Transition clips play automatically when switching between two specific clips in the viewer.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
