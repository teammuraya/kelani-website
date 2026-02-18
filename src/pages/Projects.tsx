import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Project } from '../lib/types';
import ProjectCard from '../components/ProjectCard';
import { AfricanSectionOverlay, ScrollingAfricanBand } from '../components/AfricanPatterns';

const filters = ['All', 'Ongoing', 'Upcoming', 'Completed'];

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setProjects(data);
      setLoading(false);
    }
    fetchProjects();
  }, []);

  const filtered =
    activeFilter === 'All'
      ? projects
      : projects.filter(
          (p) => p.status === activeFilter.toLowerCase()
        );

  return (
    <div className="bg-charcoal-900 min-h-screen">
      <section className="relative pt-32 pb-20 overflow-hidden">
        <img
          src="https://images.pexels.com/photos/3288100/pexels-photo-3288100.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Projects"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-charcoal-900/80" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-olive-500" />
            <span className="text-white/50 text-sm uppercase tracking-[0.2em]">
              Our Portfolio
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-white font-semibold mb-4">
            Our Projects
          </h1>
          <p className="text-white/50 text-lg max-w-2xl">
            Discover our collection of luxury developments across Kenya and East
            Africa, each crafted with intention and designed for modern living.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <ScrollingAfricanBand direction="left" />
      </div>

      <section className="bg-white py-20 lg:py-28 relative">
        <AfricanSectionOverlay variant="light" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="flex flex-wrap gap-2 mb-12">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeFilter === f
                    ? 'bg-olive-500 text-white'
                    : 'bg-gray-100 text-charcoal-700 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-[520px] bg-gray-100 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-charcoal-700/50 text-lg">
                No projects found for this filter.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
