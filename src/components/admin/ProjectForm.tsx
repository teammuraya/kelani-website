'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

type ProjectData = {
  _id?: Id<'projects'>;
  name?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  location?: string;
  country?: string;
  price_from?: number;
  status?: 'ongoing' | 'upcoming' | 'completed';
  image_url?: string;
  gallery?: string[];
  bedrooms_min?: number;
  bedrooms_max?: number;
  area_from?: number;
  area_to?: number;
  amenities?: string[];
  completion_date?: string;
  featured?: boolean;
  floor_plan_url?: string;
  video_url?: string;
};

export default function ProjectForm({ project }: { project?: ProjectData }) {
  const router = useRouter();
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);

  const [saving, setSaving] = useState(false);
  const [amenityInput, setAmenityInput] = useState('');
  const [galleryInput, setGalleryInput] = useState('');

  const [form, setForm] = useState({
    name: project?.name ?? '',
    slug: project?.slug ?? '',
    tagline: project?.tagline ?? '',
    description: project?.description ?? '',
    location: project?.location ?? '',
    country: project?.country ?? 'Kenya',
    price_from: project?.price_from ?? 0,
    status: project?.status ?? 'upcoming' as 'ongoing' | 'upcoming' | 'completed',
    image_url: project?.image_url ?? '',
    gallery: project?.gallery ?? [],
    bedrooms_min: project?.bedrooms_min ?? 1,
    bedrooms_max: project?.bedrooms_max ?? 4,
    area_from: project?.area_from ?? 0,
    area_to: project?.area_to ?? 0,
    amenities: project?.amenities ?? [],
    completion_date: project?.completion_date ?? '',
    featured: project?.featured ?? false,
    floor_plan_url: project?.floor_plan_url ?? '',
    video_url: project?.video_url ?? '',
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (project?._id) {
        await updateProject({ id: project._id, ...form });
        toast.success('Project updated');
      } else {
        const id = await createProject(form);
        toast.success('Project created');
        router.push(`/admin/projects/${id}`);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* Basic Info */}
      <Section title="Basic Information">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Project Name" required>
            <input
              value={form.name}
              onChange={(e) => {
                set('name', e.target.value);
                if (!project) set('slug', autoSlug(e.target.value));
              }}
              placeholder="Lukenya Hills Residences"
              className={inputCls}
              required
            />
          </Field>
          <Field label="URL Slug" required>
            <input
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              placeholder="lukenya-hills-residences"
              className={inputCls}
              required
            />
          </Field>
          <Field label="Tagline" className="sm:col-span-2">
            <input
              value={form.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              placeholder="Where hillside serenity meets modern luxury"
              className={inputCls}
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={5}
              placeholder="Project description..."
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* Location */}
      <Section title="Location & Status">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="Location">
            <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Lukenya, Machakos" className={inputCls} />
          </Field>
          <Field label="Country">
            <input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="Kenya" className={inputCls} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field label="Completion Date">
            <input value={form.completion_date} onChange={(e) => set('completion_date', e.target.value)} placeholder="Q4 2025" className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Pricing & Size */}
      <Section title="Pricing & Size">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="Price From (KES)" required>
            <input type="number" value={form.price_from || ''} onChange={(e) => set('price_from', Number(e.target.value))} placeholder="4500000" className={inputCls} />
          </Field>
          <Field label="Bedrooms Min">
            <input type="number" value={form.bedrooms_min || ''} onChange={(e) => set('bedrooms_min', Number(e.target.value))} min={1} className={inputCls} />
          </Field>
          <Field label="Bedrooms Max">
            <input type="number" value={form.bedrooms_max || ''} onChange={(e) => set('bedrooms_max', Number(e.target.value))} min={1} className={inputCls} />
          </Field>
          <Field label="Area From (sqft)">
            <input type="number" value={form.area_from || ''} onChange={(e) => set('area_from', Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Area To (sqft)">
            <input type="number" value={form.area_to || ''} onChange={(e) => set('area_to', Number(e.target.value))} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Media URLs */}
      <Section title="Main Images">
        <div className="space-y-4">
          <Field label="Hero Image URL" required>
            <input value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://..." className={inputCls} />
          </Field>
          {form.image_url && (
            <img src={form.image_url} alt="preview" className="w-32 h-20 object-cover rounded-lg" />
          )}
          <Field label="Hero Video URL (optional)">
            <input value={form.video_url} onChange={(e) => set('video_url', e.target.value)} placeholder="https://youtube.com/... or direct .mp4" className={inputCls} />
          </Field>
          <Field label="Floor Plan URL (optional)">
            <input value={form.floor_plan_url} onChange={(e) => set('floor_plan_url', e.target.value)} placeholder="https://..." className={inputCls} />
          </Field>
        </div>

        {/* Gallery */}
        <div className="mt-5">
          <label className="text-sm font-medium text-gray-700 block mb-2">Gallery Images</label>
          <div className="flex gap-2 mb-3">
            <input
              value={galleryInput}
              onChange={(e) => setGalleryInput(e.target.value)}
              placeholder="Paste image URL and press Add"
              className={inputCls + ' flex-1'}
            />
            <button
              type="button"
              onClick={() => {
                if (galleryInput.trim()) {
                  set('gallery', [...form.gallery, galleryInput.trim()]);
                  setGalleryInput('');
                }
              }}
              className="px-4 py-2 bg-olive-500 text-white rounded-lg text-sm hover:bg-olive-400"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.gallery.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt="" className="w-20 h-14 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => set('gallery', form.gallery.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Amenities */}
      <Section title="Amenities">
        <div className="flex gap-2 mb-3">
          <input
            value={amenityInput}
            onChange={(e) => setAmenityInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (amenityInput.trim()) {
                  set('amenities', [...form.amenities, amenityInput.trim()]);
                  setAmenityInput('');
                }
              }
            }}
            placeholder="Type amenity and press Enter or Add"
            className={inputCls + ' flex-1'}
          />
          <button
            type="button"
            onClick={() => {
              if (amenityInput.trim()) {
                set('amenities', [...form.amenities, amenityInput.trim()]);
                setAmenityInput('');
              }
            }}
            className="px-4 py-2 bg-olive-500 text-white rounded-lg text-sm hover:bg-olive-400"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.amenities.map((a, i) => (
            <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-olive-100 text-olive-700 rounded-full text-sm">
              {a}
              <button type="button" onClick={() => set('amenities', form.amenities.filter((_, j) => j !== i))} className="text-olive-400 hover:text-olive-700">×</button>
            </span>
          ))}
        </div>
      </Section>

      {/* Featured */}
      <Section title="Settings">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => set('featured', e.target.checked)}
            className="w-4 h-4 accent-olive-500"
          />
          <span className="text-sm text-gray-700">Featured on homepage</span>
        </label>
      </Section>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-olive-500 text-white rounded-xl hover:bg-olive-400 transition-colors font-medium disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-5">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-gray-700 block mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400 bg-white';
