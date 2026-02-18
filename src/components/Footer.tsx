'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-charcoal-900 text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="py-16 lg:py-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <img
                src="/kelani_logo_(3).png"
                alt="Kelani"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Crafting exceptional living spaces across Kenya and East Africa.
              Where modern luxury meets intentional design.
            </p>
            <div className="flex gap-3">
              {['X', 'In', 'Ig'].map((social) => (
                <button
                  key={social}
                  className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/50 text-xs font-medium hover:bg-olive-500 hover:border-olive-500 hover:text-white transition-all duration-300"
                >
                  {social}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-6">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Home', to: '/' },
                { label: 'Projects', to: '/projects' },
                { label: 'Locations', to: '/locations' },
                { label: 'Contact', to: '/contact' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    href={link.to}
                    className="text-white/50 hover:text-white text-sm transition-colors duration-300 flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-6">
              Locations
            </h4>
            <ul className="space-y-3">
              {['Nairobi', 'Mombasa Coast', 'Nakuru', 'Zanzibar', 'Kigali'].map(
                (loc) => (
                  <li key={loc}>
                    <span className="text-white/50 text-sm">{loc}</span>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-6">
              Get in Touch
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-olive-500 mt-0.5 shrink-0" />
                <span className="text-white/50 text-sm">
                  Westlands, Nairobi, Kenya
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-olive-500 shrink-0" />
                <span className="text-white/50 text-sm">+254 700 000 000</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-olive-500 shrink-0" />
                <span className="text-white/50 text-sm">info@kelani.co.ke</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs">
            &copy; {new Date().getFullYear()} Kelani Developments. All rights reserved.
          </p>
          <div className="flex gap-6">
            <span className="text-white/30 text-xs hover:text-white/50 cursor-pointer transition-colors">
              Privacy Policy
            </span>
            <span className="text-white/30 text-xs hover:text-white/50 cursor-pointer transition-colors">
              Terms of Service
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
