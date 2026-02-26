'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Building2,
  Users,
  Home,
  X,
  ChevronRight,
  ExternalLink,
  MessageSquareText,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/homepage', label: 'Homepage', icon: Home },
  { href: '/admin/projects', label: 'Projects', icon: Building2 },
  { href: '/admin/contacts', label: 'Contact Submissions', icon: MessageSquareText },
  { href: '/admin/admins', label: 'Admin Users', icon: Users },
];

export default function AdminSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen w-64 bg-charcoal-900 text-white z-50
        flex flex-col
        transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div>
          <p className="font-bold text-lg tracking-tight">KELANI</p>
          <p className="text-white/40 text-xs uppercase tracking-widest">Admin Panel</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-medium text-white/30 uppercase tracking-widest">
          Navigation
        </p>
        {NAV.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isActive(href, exact)
                ? 'bg-olive-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'}
            `}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        <div className="pt-4">
          <p className="px-3 py-2 text-xs font-medium text-white/30 uppercase tracking-widest">
            Live Site
          </p>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            View Website
          </Link>
        </div>
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3">
        <UserButton
          appearance={{
            elements: { userButtonAvatarBox: 'w-9 h-9' },
          }}
        />
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">Account</p>
          <p className="text-white/40 text-xs">Click to manage</p>
        </div>
      </div>
    </aside>
  );
}
