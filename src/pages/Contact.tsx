import { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Project } from '../lib/types';
import { AfricanSectionOverlay, ScrollingAfricanBand } from '../components/AfricanPatterns';

export default function Contact() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    message: '',
    project_interest: '',
  });

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase.from('projects').select('name, slug');
      if (data) setProjects(data as Project[]);
    }
    fetchProjects();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    await supabase.from('contact_submissions').insert([form]);

    setSending(false);
    setSubmitted(true);
    setForm({
      full_name: '',
      email: '',
      phone: '',
      message: '',
      project_interest: '',
    });
  };

  return (
    <div className="bg-charcoal-900 min-h-screen">
      <section className="relative pt-32 pb-20 overflow-hidden">
        <img
          src="https://images.pexels.com/photos/2079234/pexels-photo-2079234.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Contact"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-charcoal-900/85" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-olive-500" />
            <span className="text-white/50 text-sm uppercase tracking-[0.2em]">
              Get in Touch
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-white font-semibold mb-4">
            Contact Us
          </h1>
          <p className="text-white/50 text-lg max-w-2xl">
            Whether you are looking for your dream home or exploring investment
            opportunities, our team is ready to help.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <ScrollingAfricanBand direction="right" />
      </div>

      <section className="bg-white py-20 lg:py-28 relative">
        <AfricanSectionOverlay variant="light" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-5 gap-16">
            <div className="lg:col-span-2">
              <h2 className="font-display text-3xl text-charcoal-900 font-semibold mb-6">
                Let's Start a Conversation
              </h2>
              <p className="text-charcoal-700/60 leading-relaxed mb-10">
                Reach out to us and let our team guide you through Kelani's
                developments. We would love to hear from you.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: MapPin,
                    label: 'Visit Us',
                    value: 'Westlands, Nairobi, Kenya',
                  },
                  {
                    icon: Phone,
                    label: 'Call Us',
                    value: '+254 700 000 000',
                  },
                  {
                    icon: Mail,
                    label: 'Email Us',
                    value: 'info@kelani.co.ke',
                  },
                  {
                    icon: Clock,
                    label: 'Working Hours',
                    value: 'Mon - Fri, 8:00 AM - 6:00 PM',
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-olive-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-olive-500" />
                    </div>
                    <div>
                      <p className="text-charcoal-900 font-medium text-sm mb-0.5">
                        {label}
                      </p>
                      <p className="text-charcoal-700/50 text-sm">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 rounded-2xl overflow-hidden h-[220px]">
                <img
                  src="https://images.pexels.com/photos/3935702/pexels-photo-3935702.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Nairobi"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              {submitted ? (
                <div className="bg-sand-50 rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-olive-500/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-olive-500" />
                  </div>
                  <h3 className="font-display text-2xl text-charcoal-900 font-semibold mb-3">
                    Message Sent
                  </h3>
                  <p className="text-charcoal-700/60 mb-8 max-w-sm mx-auto">
                    Thank you for reaching out. Our team will get back to you
                    within 24 hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-3 bg-olive-500 text-white text-sm font-medium rounded-full hover:bg-olive-400 transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="bg-sand-50 rounded-2xl p-8 lg:p-12"
                >
                  <h3 className="font-display text-2xl text-charcoal-900 font-semibold mb-8">
                    Send Us a Message
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-charcoal-900 text-sm font-medium mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        required
                        value={form.full_name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="w-full px-4 py-3.5 bg-white border border-sand-200 rounded-xl text-sm text-charcoal-900 placeholder:text-charcoal-700/30 focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-charcoal-900 text-sm font-medium mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        className="w-full px-4 py-3.5 bg-white border border-sand-200 rounded-xl text-sm text-charcoal-900 placeholder:text-charcoal-700/30 focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-charcoal-900 text-sm font-medium mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+254 700 000 000"
                        className="w-full px-4 py-3.5 bg-white border border-sand-200 rounded-xl text-sm text-charcoal-900 placeholder:text-charcoal-700/30 focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-charcoal-900 text-sm font-medium mb-2">
                        Project Interest
                      </label>
                      <select
                        name="project_interest"
                        value={form.project_interest}
                        onChange={handleChange}
                        className="w-full px-4 py-3.5 bg-white border border-sand-200 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-500 transition-all"
                      >
                        <option value="">Select a project</option>
                        {projects.map((p) => (
                          <option key={p.slug} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="block text-charcoal-900 text-sm font-medium mb-2">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Tell us what you're looking for..."
                      className="w-full px-4 py-3.5 bg-white border border-sand-200 rounded-xl text-sm text-charcoal-900 placeholder:text-charcoal-700/30 focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-500 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full sm:w-auto px-8 py-3.5 bg-olive-500 text-white text-sm font-medium rounded-full hover:bg-olive-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
