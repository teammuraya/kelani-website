'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import UnitForm from '@/components/admin/UnitForm';
import MediaManager from '@/components/admin/MediaManager';
import PanoramaManager from '@/components/admin/PanoramaManager';

const TABS = ['details', 'media', 'panoramas'] as const;
type Tab = (typeof TABS)[number];

export default function EditUnitPage() {
  const { id, unitId } = useParams<{ id: string; unitId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const unit = useQuery(api.projectUnits.getById, {
    unitId: unitId as Id<'project_units'>,
  });

  if (unit === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-olive-500 animate-spin" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Unit not found.</p>
        <Link href={`/admin/projects/${id}`} className="text-olive-500 hover:underline mt-2 inline-block">
          Back to project
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/admin/projects/${id}`}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{unit.name}</h1>
          <p className="text-gray-500 text-sm capitalize">{unit.unit_type ?? 'Unit'} • {unit.bedrooms} bed · {unit.bathrooms} bath</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'details' && <UnitForm unit={unit} projectId={id as Id<'projects'>} />}
      {activeTab === 'media' && (
        <MediaManager unitId={unit._id} unit={unit} />
      )}
      {activeTab === 'panoramas' && (
        <PanoramaManager
          entityId={unit._id}
          entityType="unit"
          panoramas={unit.panoramas ?? []}
        />
      )}
    </div>
  );
}
