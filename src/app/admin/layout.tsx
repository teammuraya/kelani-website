'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Loader2, Menu, X } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const clerkUserId = user?.id ?? '';
  const isAdmin = useQuery(
    api.adminUsers.isAdmin,
    clerkUserId ? { clerkUserId } : 'skip'
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    if (isAdmin === false) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, isAdmin, router]);

  if (!isLoaded || isAdmin === undefined) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-olive-500 animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center">
        <p className="text-white/50">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 min-h-screen">
        <div className="md:hidden flex items-center gap-3 px-6 pt-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 bg-charcoal-900 text-white rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-gray-900 font-semibold text-sm">Kelani Admin</span>
        </div>
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
