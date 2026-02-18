'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useState } from 'react';
import { Plus, Trash2, Shield, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const admins = useQuery(api.adminUsers.getAll);
  const addAdmin = useMutation(api.adminUsers.addAdmin);
  const removeAdmin = useMutation(api.adminUsers.removeAdmin);

  const [clerkUserId, setClerkUserId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clerkUserId || !email || !name) return;
    setAdding(true);
    try {
      await addAdmin({ clerkUserId, email, name, role });
      toast.success('Admin added');
      setClerkUserId('');
      setEmail('');
      setName('');
    } catch {
      toast.error('Failed to add admin');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
        <p className="text-gray-500">Manage who has access to this dashboard</p>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Add Admin</h2>
        <p className="text-sm text-gray-500 mb-4">
          You need the Clerk User ID from your{' '}
          <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer" className="text-olive-500 hover:underline">
            Clerk dashboard
          </a>. Users must sign in first so they appear in Clerk.
        </p>
        <form onSubmit={handleAdd} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">Clerk User ID</label>
            <input
              value={clerkUserId}
              onChange={(e) => setClerkUserId(e.target.value)}
              placeholder="user_2abc..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={adding}
              className="px-5 py-2.5 bg-olive-500 text-white rounded-xl hover:bg-olive-400 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {adding ? 'Adding...' : 'Add Admin'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {admins?.map((admin) => (
            <div key={admin._id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${admin.role === 'super_admin' ? 'bg-amber-100' : 'bg-olive-100'}`}>
                  {admin.role === 'super_admin' ? (
                    <Crown className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Shield className="w-4 h-4 text-olive-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{admin.name}</p>
                  <p className="text-sm text-gray-500">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${admin.role === 'super_admin' ? 'bg-amber-100 text-amber-700' : 'bg-olive-100 text-olive-700'}`}>
                  {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
                <button
                  onClick={async () => {
                    if (!confirm(`Remove ${admin.name} as admin?`)) return;
                    await removeAdmin({ id: admin._id });
                    toast.success('Admin removed');
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {admins?.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-400">No admin users yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
