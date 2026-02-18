'use client';

import Link from 'next/link';
import { MapPin, ArrowRight, Globe } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { AfricanDividerLight, AfricanSectionOverlay, ScrollingAfricanBand } from '@/components/AfricanPatterns';

export default function Locations() {
  const locations = useQuery(api.locations.getAll);
  const projects = useQuery(api.projects.getAll);
  const loading = locations === undefined || projects === undefined;

  return (
    <div className="bg-charcoal-900 min-h-screen">
      <section className="relative pt-32 pb-20 overflow-hidden">
        <img
          src="https://images.pexels.com/photos/2119714/pexels-photo-2119714.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="East Africa"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-charcoal-900/80" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-olive-500" />
            <span className="text-white/50 text-sm uppercase tracking-[0.2em]">
              Our Reach
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-white font-semibold mb-4">
            Where We Build
          </h1>
          <p className="text-white/50 text-lg max-w-2xl">
            From the highlands of Nairobi to the shores of Zanzibar, Kelani is
            shaping the future of luxury living across East Africa.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <ScrollingAfricanBand direction="left" />
      </div>

      <section className="bg-white py-20 lg:py-28 relative">
        <AfricanSectionOverlay variant="light" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              { value: '5', label: 'Countries in Focus' },
              { value: '6+', label: 'Active Projects' },
              { value: '1,000+', label: 'Units Planned' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center py-8 border border-sand-200 rounded-2xl"
              >
                <p className="font-display text-4xl text-olive-500 font-semibold mb-2">
                  {stat.value}
                </p>
                <p className="text-charcoal-700/50 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="space-y-16">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[400px] bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-24">
              {locations.map((location, index) => {
                const locationProjects = projects.filter(
                  (p) =>
                    p.location.toLowerCase().includes(location.city.toLowerCase()) ||
                    p.country.toLowerCase() === location.country.toLowerCase()
                );

                return (
                  <div
                    key={location._id}
                    id={location.slug}
                    className="scroll-mt-28"
                  >
                    <div
                      className={`grid lg:grid-cols-2 gap-12 items-center ${
                        index % 2 !== 0 ? 'lg:flex-row-reverse' : ''
                      }`}
                    >
                      <div className={index % 2 !== 0 ? 'lg:order-2' : ''}>
                        <div className="rounded-2xl overflow-hidden h-[400px]">
                          <img
                            src={location.image_url}
                            alt={location.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div className={index % 2 !== 0 ? 'lg:order-1' : ''}>
                        <div className="flex items-center gap-2 mb-3">
                          <Globe className="w-4 h-4 text-olive-500" />
                          <span className="text-olive-500 text-sm font-medium">
                            {location.country}
                          </span>
                        </div>

                        <h2 className="font-display text-4xl text-charcoal-900 font-semibold mb-4">
                          {location.name}
                        </h2>

                        <p className="text-charcoal-700/60 leading-relaxed mb-8">
                          {location.description}
                        </p>

                        {locationProjects.length > 0 && (
                          <div className="mb-8">
                            <h4 className="text-sm font-semibold uppercase tracking-widest text-charcoal-700/30 mb-4">
                              Projects Here
                            </h4>
                            <div className="space-y-3">
                              {locationProjects.map((p) => (
                                <Link
                                  key={p._id}
                                  href={`/projects/${p.slug}`}
                                  className="group flex items-center justify-between p-4 bg-sand-50 rounded-xl hover:bg-sand-100 transition-colors"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
                                      <img
                                        src={p.image_url}
                                        alt={p.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div>
                                      <p className="text-charcoal-900 font-medium text-sm">
                                        {p.name}
                                      </p>
                                      <p className="text-charcoal-700/50 text-xs flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3" />
                                        {p.location}
                                      </p>
                                    </div>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-charcoal-700/30 group-hover:text-olive-500 transition-colors" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {locationProjects.length === 0 && (
                          <div className="p-6 bg-sand-50 rounded-xl mb-8">
                            <p className="text-charcoal-700/50 text-sm">
                              Projects coming soon to {location.name}. Stay tuned
                              for exciting developments.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <AfricanDividerLight />

      <section className="relative py-32 overflow-hidden">
        <img
          src="https://images.pexels.com/photos/2462015/pexels-photo-2462015.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="CTA"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-charcoal-900/80" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl md:text-5xl text-white font-semibold mb-6">
            Invest in East Africa&apos;s Future
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
            Join us in building exceptional communities across the region&apos;s most
            promising locations.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-olive-500 text-white font-medium rounded-full hover:bg-olive-400 transition-all duration-300 hover:shadow-lg hover:shadow-olive-500/25"
          >
            Get in Touch
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
