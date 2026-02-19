'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import MasterPlanViewer from '@/components/unit-viewer/MasterPlanViewer';

export default function ExplorePage() {
  const { slug } = useParams<{ slug: string }>();

  const project = useQuery(api.projects.getBySlug, { slug });
  const phases  = useQuery(api.projectPhases.getByProjectSlug, { projectSlug: slug });

  if (project === undefined || phases === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black gap-4">
        <p className="text-white/60">Project not found.</p>
        <Link href="/projects" className="text-olive-400 hover:underline text-sm">← Back to projects</Link>
      </div>
    );
  }

  return (
    <MasterPlanViewer
      project={project as any}
      phases={(phases ?? []) as any}
    />
  );
}
