'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Select, Badge } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { formatRelativeTime, statusColor, cn } from '@/lib/utils';
import type { ProjectStatus } from '@/lib/types';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'AWAITING_APPROVAL', label: 'Awaiting approval' },
  { value: 'RENDERING', label: 'Rendering' },
  { value: 'PUBLISHING', label: 'Publishing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function ProjectsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', page, status],
    queryFn: () =>
      apiClient.projects.list({
        page,
        limit: 20,
        status: status || undefined,
      }),
  });

  const projects = data?.data.filter((p) =>
    search ? p.topic.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="page-stack">
      <PageHeader
        title="Projects"
        description={`${data?.meta.total ?? 0} content projects in your workspace`}
        action={
          <Link href="/projects/new" className="block w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </Link>
        }
      />

      <div className="page-toolbar">
        <div className="relative page-toolbar-grow">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search topics…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-full sm:min-w-[12rem] sm:max-w-xs"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load projects: {(error as Error).message}
        </div>
      )}

      {projects && projects.length === 0 && (
        <Card className="flex flex-col items-center py-16 text-center">
          <FolderKanban className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-lg font-medium text-zinc-300">No projects found</p>
          <p className="mt-1 text-sm text-zinc-500">
            Create your first project to start the AI pipeline
          </p>
          <Link href="/projects/new" className="mt-4">
            <Button>Create project</Button>
          </Link>
        </Card>
      )}

      {projects && projects.length > 0 && (
        <div className="space-y-2">
          {projects.map((project) => {
            const workflow = project.workflowExecutions?.[0];
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-xl border border-zinc-800 bg-surface-raised px-3 py-3 transition-colors hover:border-zinc-700 sm:px-4 sm:py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100">
                      {project.topic}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      {project.campaign && <span>{project.campaign.name}</span>}
                      <span>·</span>
                      <span>{project.language.toUpperCase()}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(project.updatedAt)}</span>
                    </div>
                    {workflow?.currentStep && (
                      <p className="mt-1 text-xs text-zinc-400">
                        Step: {workflow.currentStep.replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                  <Badge className={cn('shrink-0', statusColor(project.status))}>
                    {project.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-zinc-400">
            Page {page} of {data.meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
