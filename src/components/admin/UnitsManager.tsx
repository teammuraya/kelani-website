'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import Link from 'next/link';
import { useState } from 'react';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import UnitForm from './UnitForm';

export default function UnitsManager({ projectId }: { projectId: Id<'projects'> }) {
  const units = useQuery(api.projectUnits.getByProject, { projectId });
  const project = useQuery(api.projects.getById, { id: projectId });
  const removeUnit = useMutation(api.projectUnits.remove);
  const [showNewForm, setShowNewForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: Id<'project_units'>, name: string) => {
    if (!confirm(`Delete unit "${name}"?`)) return;
    setDeleting(id);
    try {
      await removeUnit({ id });
      toast.success('Unit deleted');
    } catch {
      toast.error('Failed to delete unit');
    } finally {
      setDeleting(null);
    }
  };

  const sorted = units?.slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Units</h3>
          <p className="text-sm text-gray-500">{units?.length ?? 0} units in this project</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 px-4 py-2 bg-olive-500 text-white rounded-xl hover:bg-olive-400 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Unit
        </button>
      </div>

      {showNewForm && (
        <div className="border border-olive-200 rounded-2xl p-6 bg-olive-50/30">
          <h4 className="font-medium text-gray-900 mb-4">New Unit</h4>
          <UnitForm projectId={projectId} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Unit</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Specs</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Price</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted?.map((unit) => (
                <tr key={unit._id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {unit.thumbnail_url ? (
                        <img src={unit.thumbnail_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <div className="w-9 h-9 bg-gray-100 rounded-lg" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{unit.name}</p>
                        <p className="text-xs text-gray-400">/{unit.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{unit.unit_type ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{unit.bedrooms}BR · {unit.bathrooms}BA · {unit.area_sqft.toLocaleString()} sqft</td>
                  <td className="px-5 py-4 text-sm text-gray-600">KES {unit.price.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <UnitStatusBadge status={unit.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/projects/${projectId}/units/${unit._id}`}
                        className="p-1.5 text-gray-400 hover:text-olive-500 hover:bg-olive-50 rounded-lg transition-colors"
                        title="Edit unit"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      {project?.slug && (
                        <Link
                          href={`/projects/${project.slug}/units/${unit.slug}`}
                          target="_blank"
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview live unit"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(unit._id, unit.name)}
                        disabled={deleting === unit._id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!units || units.length === 0) && !showNewForm && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">
                    No units yet. Click "Add Unit" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UnitStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700',
    reserved: 'bg-amber-100 text-amber-700',
    sold: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
