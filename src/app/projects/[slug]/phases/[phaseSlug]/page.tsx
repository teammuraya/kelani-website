'use client';

import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import PhaseViewer from '@/components/unit-viewer/PhaseViewer';

export default function PhaseViewerPage() {
  const { slug, phaseSlug } = useParams<{ slug: string; phaseSlug: string }>();

  const project = useQuery(api.projects.getBySlug, { slug });
  const phase   = useQuery(api.projectPhases.getByProjectSlugAndPhaseSlug, {
    projectSlug: slug, phaseSlug,
  });
  const units   = useQuery(
    api.projectUnits.getByPhase,
    phase ? { phaseId: phase._id } : 'skip'
  );

  if (project === undefined || phase === undefined || units === undefined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!phase || !project) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-2xl font-bold mb-2">Phase not found</p>
          <p className="text-white/50">This phase does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <PhaseViewer
      phase={phase as any}
      units={(units ?? []) as any}
      projectSlug={slug}
      projectName={project.name}
    />
  );
}
