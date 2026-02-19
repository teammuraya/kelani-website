'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, ExternalLink } from 'lucide-react';
import ProjectForm from '@/components/admin/ProjectForm';
import MediaManager from '@/components/admin/MediaManager';
import PanoramaManager from '@/components/admin/PanoramaManager';
import UnitsManager from '@/components/admin/UnitsManager';
import BuildingsManager from '@/components/admin/BuildingsManager';
import dynamic from 'next/dynamic';

// Dynamic import for MasterPlanManager (canvas uses browser APIs)
const MasterPlanManager = dynamic(
  () => import('@/components/admin/MasterPlanManager'),
  { ssr: false, loading: () => <div className="h-32 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-olive-500" /></div> }
);

const TABS = ['details', 'media', 'panoramas', 'master-plan', 'buildings', 'units'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  details: 'Details',
  media: 'Media',
  panoramas: 'Panoramas',
  'master-plan': 'Master Plan',
  buildings: 'Buildings',
  units: 'Units',
};

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const project = useQuery(api.projects.getById, { id: id as Id<'projects'> });
  const buildings = useQuery(api.projectBuildings.getByProject, { projectId: id as Id<'projects'> });

  if (project === undefined || buildings === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-olive-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Project not found.</p>
        <Link href="/admin/projects" className="text-olive-500 hover:underline mt-2 inline-block">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/projects"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-500 text-sm">/{project.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          <Link
            href={`/projects/${project.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-olive-500 border border-gray-200 hover:border-olive-300 rounded-lg"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Preview
          </Link>
          <Link
            href={`/projects/${project.slug}/explore`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-olive-500 border border-gray-200 hover:border-olive-300 rounded-lg"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Master Plan
          </Link>
          <Link
            href={`/projects/${project.slug}/units`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-olive-500 hover:bg-olive-400 rounded-lg"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Units
          </Link>
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-xl overflow-x-auto w-fit max-w-full">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && <ProjectForm project={project} />}
      {activeTab === 'media' && <MediaManager projectId={project._id} project={project} />}
      {activeTab === 'panoramas' && (
        <PanoramaManager entityId={project._id} entityType="project" panoramas={project.panoramas ?? []} />
      )}
      {activeTab === 'master-plan' && (
        <MasterPlanManager
          projectId={project._id}
          masterPlanUrl={(project as any).master_plan_url}
          masterPlanZones={(project as any).master_plan_zones ?? []}
          buildings={buildings ?? []}
        />
      )}
      {activeTab === 'buildings' && (
        <BuildingsManager
          projectId={project._id}
          projectSlug={project.slug}
          buildings={buildings ?? []}
        />
      )}
      {activeTab === 'units' && <UnitsManager projectId={project._id} />}
    </div>
  );
}
