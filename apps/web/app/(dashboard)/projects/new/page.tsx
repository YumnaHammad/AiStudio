'use client';

import { Suspense } from 'react';
import { CreateProjectForm } from '@/components/CreateProjectForm';
import { PageHeader } from '@/components/PageHeader';
import { useSearchParams } from 'next/navigation';

function NewProjectContent() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaignId') ?? undefined;

  return <CreateProjectForm defaultCampaignId={campaignId} />;
}

export default function NewProjectPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Create Project"
        description="Configure a new content project and launch the AI pipeline"
      />
      <Suspense
        fallback={
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        }
      >
        <NewProjectContent />
      </Suspense>
    </div>
  );
}
