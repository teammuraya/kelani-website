'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

type UnitData = {
  _id?: Id<'project_units'>;
  projectId?: Id<'projects'>;
  name?: string;
  slug?: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  price?: number;
  status?: 'available' | 'reserved' | 'sold';
  floor_number?: number;
  unit_type?: string;
  thumbnail_url?: string;
  floor_plan_url?: string;
  amenities?: string[];
  featured?: boolean;
  displayOrder?: number;
};

export default function UnitForm({ unit, projectId }: { unit?: UnitData; projectId: Id<'projects'> }) {
  const router = useRouter();
  const createUnit = useMutation(api.projectUnits.create);
  const updateUnit = useMutation(api.projectUnits.update);
  const [saving, setSaving] = useState(false);
  const [amenityInput, setAmenityInput] = useState('');

  const [form, setForm] = useState({
    name: unit?.name ?? '',
    slug: unit?.slug ?? '',
    description: unit?.description ?? '',
    bedrooms: unit?.bedrooms ?? 2,
    bathrooms: unit?.bathrooms ?? 2,
    area_sqft: unit?.area_sqft ?? 0,
    price: unit?.price ?? 0,
    status: unit?.status ?? 'available' as 'available' | 'reserved' | 'sold',
    floor_number: unit?.floor_number ?? undefined,
    unit_type: unit?.unit_type ?? '',
    thumbnail_url: unit?.thumbnail_url ?? '',
    floor_plan_url: unit?.floor_plan_url ?? '',
    amenities: unit?.amenities ?? [],
    featured: unit?.featured ?? false,
    displayOrder: unit?.displayOrder ?? 0,
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (unit?._id) {
        await updateUnit({ id: unit._id, ...form });
        toast.success('Unit saved');
      } else {
        const id = await createUnit({ projectId, ...form });
        toast.success('Unit created');
        router.push(`/admin/projects/${projectId}/units/${id}`);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-5">Unit Details</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Unit Name *</label>
            <input
              value={form.name}
              onChange={(e) => {
                set('name', e.target.value);
                if (!unit) set('slug', autoSlug(e.target.value));
              }}
              placeholder="Unit A1 – 3BR Townhouse"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Slug *</label>
            <input
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              placeholder="unit-a1-3br-townhouse"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Unit Type</label>
            <input value={form.unit_type} onChange={(e) => set('unit_type', e.target.value)} placeholder="3BR Townhouse" className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Bedrooms</label>
            <input type="number" value={form.bedrooms} onChange={(e) => set('bedrooms', Number(e.target.value))} min={0} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Bathrooms</label>
            <input type="number" value={form.bathrooms} onChange={(e) => set('bathrooms', Number(e.target.value))} min={0} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Area (sqft)</label>
            <input type="number" value={form.area_sqft || ''} onChange={(e) => set('area_sqft', Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Price (KES)</label>
            <input type="number" value={form.price || ''} onChange={(e) => set('price', Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Floor Number</label>
            <input type="number" value={form.floor_number ?? ''} onChange={(e) => set('floor_number', e.target.value ? Number(e.target.value) : undefined)} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Display Order</label>
            <input type="number" value={form.displayOrder} onChange={(e) => set('displayOrder', Number(e.target.value))} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Thumbnail URL</label>
            <input value={form.thumbnail_url} onChange={(e) => set('thumbnail_url', e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Floor Plan URL</label>
            <input value={form.floor_plan_url} onChange={(e) => set('floor_plan_url', e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
        </div>

        {/* Amenities */}
        <div className="mt-5">
          <label className="text-sm font-medium text-gray-700 block mb-2">Amenities</label>
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
              placeholder="Add amenity (press Enter)"
              className={inputCls + ' flex-1'}
            />
            <button type="button" onClick={() => {
              if (amenityInput.trim()) {
                set('amenities', [...form.amenities, amenityInput.trim()]);
                setAmenityInput('');
              }
            }} className="px-4 py-2 bg-olive-500 text-white rounded-lg text-sm hover:bg-olive-400">
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
        </div>

        <label className="flex items-center gap-3 mt-5 cursor-pointer">
          <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="w-4 h-4 accent-olive-500" />
          <span className="text-sm text-gray-700">Featured unit</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-olive-500 text-white rounded-xl hover:bg-olive-400 transition-colors font-medium disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : unit ? 'Save Unit' : 'Create Unit'}
      </button>
    </form>
  );
}
