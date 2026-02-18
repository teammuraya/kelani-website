'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import UnitViewer from '@/components/unit-viewer/UnitViewer';

export default function UnitViewerPage() {
  const { slug, unitSlug } = useParams<{ slug: string; unitSlug: string }>();

  const project = useQuery(api.projects.getBySlug, { slug: slug ?? '' });
  const unit = useQuery(api.projectUnits.getByProjectSlugAndUnitSlug, {
    projectSlug: slug ?? '',
    unitSlug: unitSlug ?? '',
  });

  const loading = project === undefined || unit === undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <p className="text-white/50 text-lg">Unit not found</p>
        <Link
          href={`/projects/${slug}/units`}
          className="flex items-center gap-2 px-6 py-3 bg-olive-500 text-white rounded-full text-sm font-medium hover:bg-olive-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Units
        </Link>
      </div>
    );
  }

  return (
    <UnitViewer
      unit={unit as any}
      projectSlug={slug}
      projectName={project?.name ?? 'Project'}
    />
  );
}
