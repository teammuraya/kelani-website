import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Bed,
  Maximize,
  Calendar,
  Check,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Project } from '../lib/types';
import { AfricanDividerLight, AfricanSectionOverlay } from '../components/AfricanPatterns';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-KE').format(price);
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    ongoing: 'bg-olive-500 text-white',
    upcoming: 'bg-amber-500 text-white',
    completed: 'bg-emerald-600 text-white',
  };
  return styles[status] || 'bg-gray-200 text-gray-700';
}

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [related, setRelated] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    async function fetchProject() {
      setLoading(true);
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (data) {
        setProject(data);
        setActiveImage(0);

        const { data: relatedData } = await supabase
          .from('projects')
          .select('*')
          .neq('slug', slug)
          .limit(2);
        if (relatedData) setRelated(relatedData);
      }
      setLoading(false);
    }
    fetchProject();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-olive-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex flex-col items-center justify-center text-white gap-6">
        <h2 className="font-display text-3xl">Project not found</h2>
        <Link
          to="/projects"
          className="px-6 py-3 bg-olive-500 rounded-full text-sm font-medium hover:bg-olive-400 transition-colors"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  const allImages = [project.image_url, ...project.gallery];

  return (
    <div className="bg-charcoal-900 min-h-screen">
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        <img
          src={allImages[activeImage]}
          alt={project.name}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/30 to-charcoal-900/20" />

        <div className="absolute top-28 left-0 right-0 z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 max-w-7xl mx-auto px-6 lg:px-8 pb-12">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={`px-4 py-1.5 rounded-full text-xs font-medium ${statusBadge(
                project.status
              )}`}
            >
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
            <span className="text-white/50 text-sm flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {project.location}, {project.country}
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-semibold mb-3 text-shadow-lg">
            {project.name}
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl">
            {project.tagline}
          </p>
        </div>
      </section>

      {allImages.length > 1 && (
        <div className="max-w-7xl mx-auto px-6 lg:px-8 -mt-6 relative z-20">
          <div className="flex gap-3 overflow-x-auto pb-4">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                  activeImage === i
                    ? 'border-olive-500 opacity-100'
                    : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <img
                  src={img}
                  alt={`${project.name} ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="bg-white py-20 lg:py-28 relative">
        <AfricanSectionOverlay variant="light" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2">
              <h2 className="font-display text-3xl text-charcoal-900 font-semibold mb-6">
                About This Project
              </h2>
              <p className="text-charcoal-700/60 leading-relaxed text-base whitespace-pre-line">
                {project.description}
              </p>

              {project.amenities.length > 0 && (
                <div className="mt-12">
                  <h3 className="font-display text-2xl text-charcoal-900 font-semibold mb-6">
                    Amenities & Features
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {project.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-3 px-4 py-3 bg-sand-50 rounded-xl"
                      >
                        <div className="w-6 h-6 rounded-full bg-olive-500/10 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-olive-500" />
                        </div>
                        <span className="text-charcoal-900 text-sm font-medium">
                          {amenity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="bg-sand-50 rounded-2xl p-8 sticky top-28">
                <h3 className="font-display text-xl text-charcoal-900 font-semibold mb-6">
                  Project Details
                </h3>

                <div className="space-y-5">
                  <div className="flex items-center justify-between py-3 border-b border-sand-200">
                    <span className="text-charcoal-700/50 text-sm">Starting From</span>
                    <span className="text-charcoal-900 font-semibold">
                      KES {formatPrice(project.price_from)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-sand-200">
                    <span className="text-charcoal-700/50 text-sm flex items-center gap-2">
                      <Bed className="w-4 h-4" /> Bedrooms
                    </span>
                    <span className="text-charcoal-900 font-medium">
                      {project.bedrooms_min} - {project.bedrooms_max}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-sand-200">
                    <span className="text-charcoal-700/50 text-sm flex items-center gap-2">
                      <Maximize className="w-4 h-4" /> Area
                    </span>
                    <span className="text-charcoal-900 font-medium">
                      {project.area_from.toLocaleString()} -{' '}
                      {project.area_to.toLocaleString()} sqft
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-sand-200">
                    <span className="text-charcoal-700/50 text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Completion
                    </span>
                    <span className="text-charcoal-900 font-medium">
                      {project.completion_date}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <span className="text-charcoal-700/50 text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Location
                    </span>
                    <span className="text-charcoal-900 font-medium text-right">
                      {project.location}
                    </span>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <Link
                    to="/contact"
                    className="block text-center px-6 py-3.5 bg-olive-500 text-white text-sm font-medium rounded-full hover:bg-olive-400 transition-all duration-300"
                  >
                    Inquire About This Project
                  </Link>
                  <Link
                    to="/contact"
                    className="block text-center px-6 py-3.5 bg-charcoal-900 text-white text-sm font-medium rounded-full hover:bg-charcoal-800 transition-all duration-300"
                  >
                    Schedule a Visit
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AfricanDividerLight />

      {project.gallery.length > 0 && (
        <section className="bg-sand-100 py-20 lg:py-28 relative">
          <AfricanSectionOverlay variant="light" />
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="font-display text-3xl text-charcoal-900 font-semibold mb-10">
              Gallery
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {project.gallery.map((img, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden h-[280px] group cursor-pointer"
                >
                  <img
                    src={img}
                    alt={`${project.name} gallery ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="bg-white py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <h2 className="font-display text-3xl text-charcoal-900 font-semibold">
                Other Projects
              </h2>
              <Link
                to="/projects"
                className="text-olive-500 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {related.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.slug}`}
                  className="group relative block rounded-2xl overflow-hidden h-[400px]"
                >
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <p className="text-white/50 text-sm mb-1">{p.location}</p>
                    <h3 className="text-white font-display text-2xl font-semibold mb-2 text-shadow">
                      {p.name}
                    </h3>
                    <p className="text-white/60 text-sm">{p.tagline}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
