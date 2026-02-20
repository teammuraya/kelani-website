'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Upload, X, Loader2, Save, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULTS: Record<string, string> = {
  hero_bg:
    'https://images.pexels.com/photos/2462015/pexels-photo-2462015.jpeg?auto=compress&cs=tinysrgb&w=1920',
  hero_thumb_1:
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=400',
  hero_thumb_2:
    'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
  card_amenities:
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
  card_floor_plans:
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
  card_neighbourhood:
    'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=800',
  about_main:
    'https://images.pexels.com/photos/2079234/pexels-photo-2079234.jpeg?auto=compress&cs=tinysrgb&w=800',
  about_detail:
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=400',
  cta_bg:
    'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=1920',
};

const SECTIONS = [
  {
    title: 'Hero Section',
    description: 'Main banner area at the top of the homepage',
    fields: [
      { key: 'hero_bg', label: 'Hero Background', aspect: 'aspect-video' },
      { key: 'hero_thumb_1', label: 'Hero Thumbnail 1', aspect: 'aspect-video' },
      { key: 'hero_thumb_2', label: 'Hero Thumbnail 2', aspect: 'aspect-video' },
    ],
  },
  {
    title: 'Feature Cards',
    description: 'Three image cards below the hero',
    fields: [
      { key: 'card_amenities', label: 'Amenities Card', aspect: 'aspect-[4/3]' },
      { key: 'card_floor_plans', label: 'Floor Plans Card', aspect: 'aspect-[4/3]' },
      { key: 'card_neighbourhood', label: 'Neighbourhood Card', aspect: 'aspect-[4/3]' },
    ],
  },
  {
    title: 'About Kelani',
    description: 'About section images',
    fields: [
      { key: 'about_main', label: 'Main Image', aspect: 'aspect-[3/4]' },
      { key: 'about_detail', label: 'Detail Overlay', aspect: 'aspect-square' },
    ],
  },
  {
    title: 'Call to Action',
    description: 'Bottom CTA background',
    fields: [
      { key: 'cta_bg', label: 'CTA Background', aspect: 'aspect-video' },
    ],
  },
];

type ImageFields = Record<string, string | undefined>;

export default function AdminHomepage() {
  const content = useQuery(api.homepageContent.get);
  const upsert = useMutation(api.homepageContent.upsert);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getUrl);

  const [overrides, setOverrides] = useState<ImageFields>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loading = content === undefined;

  const getImageUrl = (key: string) => {
    if (overrides[key] !== undefined) return overrides[key];
    if (content && (content as Record<string, unknown>)[key]) return (content as Record<string, unknown>)[key] as string;
    return DEFAULTS[key];
  };

  const isModified = (key: string) => {
    return overrides[key] !== undefined;
  };

  const hasChanges = Object.keys(overrides).length > 0;

  const uploadFile = async (key: string, file: File) => {
    setUploading(key);
    try {
      const uploadUrl = await generateUploadUrl();
      const storageId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          if (xhr.status === 200) {
            const { storageId } = JSON.parse(xhr.responseText);
            resolve(storageId);
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
      const url = await getStorageUrl({ storageId });
      if (url) {
        setOverrides((prev) => ({ ...prev, [key]: url }));
        toast.success(`${key.replace(/_/g, ' ')} uploaded`);
      }
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    uploadFile(key, file);
    e.target.value = '';
  };

  const clearOverride = (key: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: ImageFields = {};
      // Merge existing content with overrides
      if (content) {
        for (const key of Object.keys(DEFAULTS)) {
          const val = (content as Record<string, unknown>)[key];
          if (typeof val === 'string') payload[key] = val;
        }
      }
      // Apply overrides
      for (const [key, val] of Object.entries(overrides)) {
        payload[key] = val;
      }
      await upsert(payload);
      setOverrides({});
      toast.success('Homepage images saved!');
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-olive-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homepage</h1>
          <p className="text-gray-500">Manage images displayed on the landing page</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-olive-500 text-white text-sm font-medium rounded-xl hover:bg-olive-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <div className="mb-5">
              <h3 className="font-semibold text-gray-900">{section.title}</h3>
              <p className="text-gray-400 text-sm">{section.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {section.fields.map(({ key, label, aspect }) => {
                const url = getImageUrl(key);
                const modified = isModified(key);
                const isUploading = uploading === key;

                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      {modified && (
                        <button
                          onClick={() => clearOverride(key)}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Undo
                        </button>
                      )}
                    </div>

                    <div
                      className={`relative ${aspect} rounded-xl overflow-hidden border-2 transition-colors ${
                        modified ? 'border-olive-500' : 'border-gray-200'
                      } group`}
                    >
                      {url ? (
                        <img
                          src={url}
                          alt={label}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        </div>
                      )}

                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}

                      {!isUploading && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => fileInputRefs.current[key]?.click()}
                            className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-gray-900 flex items-center gap-2 shadow-lg"
                          >
                            <Upload className="w-4 h-4" />
                            {url ? 'Replace' : 'Upload'}
                          </button>
                        </div>
                      )}

                      <input
                        ref={(el) => { fileInputRefs.current[key] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(key, e)}
                      />
                    </div>

                    {modified && (
                      <p className="text-xs text-olive-600 mt-1">Modified — save to apply</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
