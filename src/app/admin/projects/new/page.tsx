'use client';

import ProjectForm from '@/components/admin/ProjectForm';

export default function NewProjectPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">New Project</h1>
      <ProjectForm />
    </div>
  );
}
