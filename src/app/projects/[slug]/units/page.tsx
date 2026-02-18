'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  Bed,
  Bath,
  Maximize,
  MapPin,
  Loader2,
  Building2,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';

function formatPrice(price: number) {
  if (price >= 1_000_000) return `KES ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `KES ${(price / 1_000).toFixed(0)}K`;
  return `KES ${price.toLocaleString()}`;
}

const statusStyles: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  reserved: 'bg-amber-100 text-amber-700',
  sold: 'bg-red-100 text-red-600',
};

export default function UnitSelectorPage() {
  const { slug } = useParams<{ slug: string }>();

  const project = useQuery(api.projects.getBySlug, { slug: slug ?? '' });
  const units = useQuery(api.projectUnits.getByProjectSlug, { projectSlug: slug ?? '' });

  const [bedroomFilter, setBedroomFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const loading = project === undefined || units === undefined;

  const filteredUnits = (units ?? [])
    .filter((u) => bedroomFilter === null || u.bedrooms === bedroomFilter)
    .filter((u) => statusFilter === null || u.status === statusFilter)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const bedroomOptions = [...new Set((units ?? []).map((u) => u.bedrooms))].sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-olive-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex flex-col items-center justify-center gap-6">
        <p className="text-white/50">Project not found</p>
        <Link href="/projects" className="px-6 py-3 bg-olive-500 text-white rounded-full text-sm">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-900">
      {/* Hero banner */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        <img
          src={project.image_url}
          alt={project.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal-900/60 via-charcoal-900/30 to-charcoal-900" />
        <div className="absolute bottom-0 left-0 right-0 px-6 lg:px-8 pb-8 max-w-7xl mx-auto">
          <Link
            href={`/projects/${slug}`}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {project.name}
          </Link>
          <h1 className="font-display text-3xl md:text-4xl text-white font-semibold">
            Available Units
          </h1>
          <p className="text-white/50 mt-1 flex items-center gap-1.5 text-sm">
            <MapPin className="w-3.5 h-3.5" />
            {project.location}, {project.country}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-white/40 text-sm">
            <SlidersHorizontal className="w-4 h-4" />
            Filter:
          </div>

          {/* Bedroom filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBedroomFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                bedroomFilter === null
                  ? 'bg-white text-charcoal-900'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              All Beds
            </button>
            {bedroomOptions.map((b) => (
              <button
                key={b}
                onClick={() => setBedroomFilter(bedroomFilter === b ? null : b)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  bedroomFilter === b
                    ? 'bg-olive-500 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {b} BR
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 ml-2">
            {['available', 'reserved', 'sold'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                  statusFilter === s
                    ? s === 'available'
                      ? 'bg-emerald-500 text-white'
                      : s === 'reserved'
                      ? 'bg-amber-500 text-white'
                      : 'bg-red-500 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <span className="text-white/30 text-sm ml-auto">
            {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Units grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-20">
        {filteredUnits.length === 0 ? (
          <div className="py-24 text-center">
            <Building2 className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-lg">
              {(units ?? []).length === 0
                ? 'No units have been added yet.'
                : 'No units match your filters.'}
            </p>
            {(units ?? []).length === 0 && (
              <p className="text-white/20 text-sm mt-2">
                Units can be added from the admin panel.
              </p>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUnits.map((unit) => (
              <UnitCard
                key={unit._id}
                unit={unit}
                projectSlug={slug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UnitCard({
  unit,
  projectSlug,
}: {
  unit: any;
  projectSlug: string;
}) {
  const hasMedia =
    (unit.exterior_media?.filter((m: any) => !m.isTransition).length ?? 0) > 0 ||
    (unit.interior_media?.filter((m: any) => !m.isTransition).length ?? 0) > 0;

  return (
    <div className="group bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-2xl overflow-hidden transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative h-48 overflow-hidden">
        {unit.thumbnail_url ? (
          <img
            src={unit.thumbnail_url}
            alt={unit.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <Building2 className="w-12 h-12 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Status badge */}
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyles[unit.status] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {unit.status}
        </span>

        {/* Media badge */}
        {hasMedia && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium bg-black/60 text-white/80 backdrop-blur-sm">
            ▶ Virtual Tour
          </span>
        )}

        {/* Price overlay */}
        <div className="absolute bottom-3 left-3">
          <p className="text-white font-bold text-xl">{formatPrice(unit.price)}</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="mb-3">
          {unit.unit_type && (
            <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">{unit.unit_type}</p>
          )}
          <h3 className="text-white font-semibold text-lg leading-tight">{unit.name}</h3>
          {unit.description && (
            <p className="text-white/40 text-sm mt-1 line-clamp-2">{unit.description}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-white/50 text-sm mb-4">
          <span className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5" />
            {unit.bedrooms} Bed
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" />
            {unit.bathrooms} Bath
          </span>
          <span className="flex items-center gap-1">
            <Maximize className="w-3.5 h-3.5" />
            {unit.area_sqft.toLocaleString()} ft²
          </span>
          {unit.floor_number != null && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Fl. {unit.floor_number}
            </span>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/projects/${projectSlug}/units/${unit.slug}`}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
            unit.status === 'sold'
              ? 'bg-white/5 text-white/30 cursor-not-allowed pointer-events-none'
              : 'bg-olive-500 hover:bg-olive-400 text-white'
          }`}
        >
          {unit.status === 'sold' ? 'Sold Out' : hasMedia ? 'View Unit Tour' : 'View Unit'}
          {unit.status !== 'sold' && <ChevronRight className="w-4 h-4" />}
        </Link>
      </div>
    </div>
  );
}
