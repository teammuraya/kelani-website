import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Shield, TreePine, Building, Award, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Project, Location } from '../lib/types';
import ProjectCard from '../components/ProjectCard';
import LocationCard from '../components/LocationCard';
import { AfricanDividerLight, AfricanDividerDark, AfricanSectionOverlay, ScrollingAfricanBand } from '../components/AfricanPatterns';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useScrollAnimation(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [projectsRes, locationsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('featured', true).limit(3),
        supabase.from('locations').select('*').order('projects_count', { ascending: false }).limit(4),
      ]);
      if (projectsRes.data) setFeaturedProjects(projectsRes.data);
      if (locationsRes.data) setLocations(locationsRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="bg-charcoal-900">
      <section className="relative min-h-screen flex items-end pb-20 overflow-hidden">
        <img
          src="https://images.pexels.com/photos/2462015/pexels-photo-2462015.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Kelani Developments"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/50 to-charcoal-900/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/70 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-end">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-olive-500" />
                <span className="text-white/60 text-sm uppercase tracking-[0.2em] font-light">
                  Welcome to Kelani
                </span>
              </div>

              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-white font-semibold leading-[1.05] mb-6 text-shadow-lg">
                Your Property.
                <br />
                Your Legacy.
                <br />
                Your Story.
              </h1>

              <p className="text-white/60 text-base md:text-lg max-w-xl leading-relaxed mb-8">
                Welcome to Kelani -- luxury developments crafted for comfort,
                style, and effortless modern living across Kenya and East Africa.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/projects"
                  className="px-7 py-3.5 bg-olive-500 text-white text-sm font-medium rounded-full hover:bg-olive-400 transition-all duration-300 hover:shadow-lg hover:shadow-olive-500/25 flex items-center gap-2"
                >
                  Explore Projects
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contact"
                  className="px-7 py-3.5 bg-white/10 backdrop-blur-md text-white text-sm font-medium rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
                >
                  Schedule a Tour
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex justify-end">
              <div className="space-y-4">
                <p className="text-white/50 text-sm max-w-[280px] leading-relaxed">
                  A boutique developer building for modern East African
                  living -- elevated, intimate, and intentional.
                </p>
                <div className="flex gap-3">
                  <div className="w-40 h-28 rounded-xl overflow-hidden">
                    <img
                      src="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=400"
                      alt="Interior"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="w-40 h-28 rounded-xl overflow-hidden relative group cursor-pointer">
                    <img
                      src="https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400"
                      alt="Interior"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-28 relative">
        <AfricanSectionOverlay variant="light" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <AnimatedSection>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  image: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
                  label: 'Amenities',
                },
                {
                  image: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
                  label: 'Floor Plans',
                },
                {
                  image: 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=800',
                  label: 'Neighbourhood',
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="group relative rounded-2xl overflow-hidden h-[320px] cursor-pointer"
                >
                  <img
                    src={card.image}
                    alt={card.label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between">
                    <span className="text-white font-medium text-lg">{card.label}</span>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center group-hover:bg-olive-500 transition-colors duration-300">
                      <ArrowRight className="w-4 h-4 text-charcoal-900 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <AfricanDividerLight />

      <section className="bg-sand-100 py-20 lg:py-28 relative">
        <AfricanSectionOverlay variant="light" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden h-[500px]">
                  <img
                    src="https://images.pexels.com/photos/2079234/pexels-photo-2079234.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="About Kelani"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 w-48 h-48 rounded-2xl overflow-hidden border-4 border-sand-100 hidden lg:block">
                  <img
                    src="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=400"
                    alt="Interior detail"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-olive-500" />
                  <span className="text-charcoal-700/60 text-sm uppercase tracking-[0.2em]">
                    About Kelani
                  </span>
                </div>

                <h2 className="font-display text-4xl md:text-5xl text-charcoal-900 font-semibold leading-tight mb-6">
                  Crafted with Intention.
                  <br />
                  Designed to Belong.
                </h2>

                <p className="text-charcoal-700/60 leading-relaxed mb-8">
                  Designed for those who value balance, flow, and everyday ease,
                  every Kelani home is built to climate efficiency, and filled with
                  natural light. Whether you are considering a place for a family
                  or looking for your forever home, we build spaces to support the
                  rhythm of modern living -- calm, timeless, and beautifully
                  functional.
                </p>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  {[
                    { icon: Shield, label: 'Trusted Developer' },
                    { icon: TreePine, label: 'Eco-Conscious' },
                    { icon: Building, label: '6+ Projects' },
                    { icon: Award, label: 'Award Winning' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-olive-500/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-olive-500" />
                      </div>
                      <span className="text-charcoal-900 text-sm font-medium">{label}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/projects"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-olive-500 text-white text-sm font-medium rounded-full hover:bg-olive-400 transition-all duration-300"
                >
                  View Our Projects
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <div className="bg-white">
        <ScrollingAfricanBand direction="left" />
      </div>

      <section className="bg-white py-20 lg:py-28 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <AnimatedSection>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-olive-500" />
                  <span className="text-charcoal-700/60 text-sm uppercase tracking-[0.2em]">
                    Featured Projects
                  </span>
                </div>
                <h2 className="font-display text-4xl md:text-5xl text-charcoal-900 font-semibold">
                  Signature Developments
                </h2>
              </div>
              <Link
                to="/projects"
                className="mt-6 md:mt-0 text-olive-500 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all group"
              >
                View All Projects
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </AnimatedSection>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[520px] bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <AnimatedSection>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      <AfricanDividerDark />

      <section className="bg-charcoal-900 py-20 lg:py-28 relative">
        <AfricanSectionOverlay variant="dark" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <AnimatedSection>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-olive-500" />
                  <span className="text-white/40 text-sm uppercase tracking-[0.2em]">
                    Our Presence
                  </span>
                </div>
                <h2 className="font-display text-4xl md:text-5xl text-white font-semibold">
                  Where We Build
                </h2>
              </div>
              <Link
                to="/locations"
                className="mt-6 md:mt-0 text-olive-400 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all group"
              >
                All Locations
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </AnimatedSection>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[400px] bg-charcoal-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <AnimatedSection>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {locations.map((loc) => (
                  <LocationCard key={loc.id} location={loc} />
                ))}
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      <div className="bg-charcoal-900">
        <ScrollingAfricanBand direction="right" />
      </div>

      <section className="relative py-32 overflow-hidden">
        <img
          src="https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="CTA background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-charcoal-900/80" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <AnimatedSection>
            <h2 className="font-display text-4xl md:text-5xl text-white font-semibold mb-6">
              Ready to Find Your Next Home?
            </h2>
            <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
              Let our team guide you through our developments and help you find
              the perfect space for your lifestyle.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/contact"
                className="px-8 py-4 bg-olive-500 text-white font-medium rounded-full hover:bg-olive-400 transition-all duration-300 hover:shadow-lg hover:shadow-olive-500/25"
              >
                Get in Touch
              </Link>
              <Link
                to="/projects"
                className="px-8 py-4 bg-white/10 backdrop-blur-md text-white font-medium rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                Browse Projects
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
