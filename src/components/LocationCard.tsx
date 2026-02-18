'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Location } from '../lib/types';

export default function LocationCard({ location }: { location: Location }) {
  return (
    <Link
      href={`/locations#${location.slug}`}
      className="group relative block rounded-2xl overflow-hidden h-[400px] cursor-pointer"
    >
      <img
        src={location.image_url}
        alt={location.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest mb-1">
              {location.country}
            </p>
            <h3 className="text-white font-display text-2xl font-semibold text-shadow">
              {location.name}
            </h3>
            <p className="text-white/50 text-sm mt-1">
              {location.projects_count} Project{location.projects_count !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-olive-500 group-hover:border-olive-500 transition-all duration-300">
            <ArrowUpRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}
