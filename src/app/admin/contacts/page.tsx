'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useState } from 'react';
import { Trash2, Mail, Phone, MessageSquareText, Search, User, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactSubmissionsPage() {
  const submissions = useQuery(api.contactSubmissions.getAll);
  const removeSubmission = useMutation(api.contactSubmissions.remove);

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = submissions?.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.message.toLowerCase().includes(q) ||
      s.project_interest.toLowerCase().includes(q)
    );
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Contact Submissions</h1>
        <p className="text-gray-500">
          View and manage enquiries from the contact form
          {submissions && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-olive-100 text-olive-700">
              {submissions.length} total
            </span>
          )}
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, message..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filtered?.map((submission) => {
            const isExpanded = expandedId === submission._id;
            return (
              <div key={submission._id} className="group">
                {/* Summary row */}
                <div
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : submission._id)}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-olive-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-olive-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{submission.full_name}</p>
                      <p className="text-sm text-gray-500 truncate">{submission.email}</p>
                    </div>
                    {submission.project_interest && (
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 shrink-0">
                        <Building2 className="w-3 h-3" />
                        {submission.project_interest}
                      </span>
                    )}
                    <span className="hidden md:block text-xs text-gray-400 shrink-0">
                      {formatDate(submission._creationTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Delete submission from ${submission.full_name}?`)) return;
                        try {
                          await removeSubmission({ id: submission._id });
                          toast.success('Submission deleted');
                          if (isExpanded) setExpandedId(null);
                        } catch {
                          toast.error('Failed to delete');
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-6 pb-5 pt-0 bg-gray-50/50 border-t border-gray-100">
                    <div className="grid sm:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                          <a href={`mailto:${submission.email}`} className="text-sm text-olive-600 hover:underline">
                            {submission.email}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</p>
                          <p className="text-sm text-gray-900">
                            {submission.phone ? (
                              <a href={`tel:${submission.phone}`} className="text-olive-600 hover:underline">
                                {submission.phone}
                              </a>
                            ) : (
                              <span className="text-gray-400">Not provided</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Project Interest</p>
                          <p className="text-sm text-gray-900">
                            {submission.project_interest || <span className="text-gray-400">None selected</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MessageSquareText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</p>
                          <p className="text-sm text-gray-900">{formatDate(submission._creationTime)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Message</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{submission.message}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered?.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-400">
              {search ? 'No submissions match your search.' : 'No contact submissions yet.'}
            </div>
          )}

          {!submissions && (
            <div className="px-6 py-12 text-center text-gray-400">Loading submissions...</div>
          )}
        </div>
      </div>
    </div>
  );
}