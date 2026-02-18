'use client';

import Link from 'next/link';
import { MapPin, ArrowRight, Bed, Maximize } from 'lucide-react';
import type { Project } from '../lib/types';

function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `KES ${(price / 1000000).toFixed(1)}M`;
  }
  return `KES ${(price / 1000).toFixed(0)}K`;
}

function statusColor(status: string): string {
  switch (status) {
    case 'ongoing':
      return 'bg-olive-500/80 text-white';
    case 'upcoming':
      return 'bg-amber-500/80 text-white';
    case 'completed':
      return 'bg-emerald-500/80 text-white';
    default:
      return 'bg-white/20 text-white';
  }
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block rounded-2xl overflow-hidden relative h-[520px] cursor-pointer"
    >
      <img
        src={project.image_url}
        alt={project.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div className="absolute top-4 left-4 flex gap-2">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md ${statusColor(
            project.status
          )}`}
        >
          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
        </span>
      </div>

      <div className="absolute top-4 right-4">
        <span className="glass-card px-4 py-1.5 rounded-full text-white text-sm font-semibold">
          {formatPrice(project.price_from)}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="glass-card rounded-2xl p-5 transition-all duration-500 group-hover:bg-white/20">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-white font-display text-xl font-semibold mb-1 text-shadow">
                {project.name}
              </h3>
              <div className="flex items-center gap-1.5 text-white/70 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                <span>{project.location}</span>
              </div>
            </div>
          </div>

          <p className="text-white/60 text-sm leading-relaxed mb-4 line-clamp-2">
            {project.tagline}
          </p>

          <div className="flex items-center gap-3 mb-4">
            <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-white/70" />
              <span className="text-white text-xs font-medium">
                {project.bedrooms_min}-{project.bedrooms_max} Bed
              </span>
            </div>
            <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <Maximize className="w-3.5 h-3.5 text-white/70" />
              <span className="text-white text-xs font-medium">
                {project.area_from.toLocaleString()} sqft
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs">
              Completion: {project.completion_date}
            </span>
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center group-hover:bg-olive-500 transition-colors duration-300">
              <ArrowRight className="w-4 h-4 text-charcoal-900 group-hover:text-white transition-colors duration-300" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
