'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import BuildingViewer from '@/components/unit-viewer/BuildingViewer';

export default function BuildingPage() {
  const { slug, buildingSlug } = useParams<{ slug: string; buildingSlug: string }>();

  const project  = useQuery(api.projects.getBySlug, { slug });
  const building = useQuery(api.projectBuildings.getByProjectSlugAndBuildingSlug, {
    projectSlug: slug,
    buildingSlug,
  });

  // Once we have the building, fetch its units
  const units = useQuery(
    api.projectUnits.getByBuilding,
    building ? { buildingId: building._id } : 'skip'
  );

  if (project === undefined || building === undefined || units === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!project || !building) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black gap-4">
        <p className="text-white/60">Building not found.</p>
        <Link href={`/projects/${slug}/explore`} className="text-olive-400 hover:underline text-sm">
          ← Back to site plan
        </Link>
      </div>
    );
  }

  return (
    <BuildingViewer
      building={building as any}
      units={(units ?? []) as any}
      projectSlug={slug}
      projectName={project.name}
    />
  );
}
