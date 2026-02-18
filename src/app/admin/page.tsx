'use client';

import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import Link from 'next/link';
import {
  FolderOpen,
  Home,
  Users,
  TrendingUp,
  ArrowRight,
  Building2,
} from 'lucide-react';

export default function AdminDashboard() {
  const projects = useQuery(api.projects.getAll);

  const totalProjects = projects?.length ?? 0;
  const ongoingProjects = projects?.filter((p) => p.status === 'ongoing').length ?? 0;
  const upcomingProjects = projects?.filter((p) => p.status === 'upcoming').length ?? 0;
  const completedProjects = projects?.filter((p) => p.status === 'completed').length ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome to the Kelani admin panel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard label="Total Projects" value={totalProjects} icon={<Building2 className="w-5 h-5" />} color="bg-olive-500" />
        <StatCard label="Ongoing" value={ongoingProjects} icon={<TrendingUp className="w-5 h-5" />} color="bg-blue-500" />
        <StatCard label="Upcoming" value={upcomingProjects} icon={<FolderOpen className="w-5 h-5" />} color="bg-amber-500" />
        <StatCard label="Completed" value={completedProjects} icon={<Home className="w-5 h-5" />} color="bg-emerald-500" />
      </div>

      {/* Recent projects */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Projects</h2>
          <Link
            href="/admin/projects"
            className="text-olive-500 text-sm flex items-center gap-1 hover:gap-2 transition-all"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {projects?.slice(0, 5).map((p) => (
            <div key={p._id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-sm text-gray-500">{p.location}, {p.country}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={p.status} />
                <Link
                  href={`/admin/projects/${p._id}`}
                  className="text-xs text-olive-500 hover:underline"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
          {(!projects || projects.length === 0) && (
            <div className="px-6 py-10 text-center text-gray-400">
              No projects yet.{' '}
              <Link href="/admin/projects/new" className="text-olive-500 hover:underline">
                Create your first project
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <QuickAction
          href="/admin/projects/new"
          icon={<Building2 className="w-6 h-6 text-olive-500" />}
          label="New Project"
          desc="Add a new development"
        />
        <QuickAction
          href="/admin/projects"
          icon={<FolderOpen className="w-6 h-6 text-blue-500" />}
          label="Manage Projects"
          desc="Edit projects & units"
        />
        <QuickAction
          href="/admin/admins"
          icon={<Users className="w-6 h-6 text-purple-500" />}
          label="Admin Users"
          desc="Manage admin access"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ongoing: 'bg-olive-100 text-olive-700',
    upcoming: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function QuickAction({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-200 hover:border-olive-300 hover:shadow-sm transition-all"
    >
      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </Link>
  );
}
