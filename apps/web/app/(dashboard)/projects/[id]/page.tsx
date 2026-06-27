'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { ProjectPipeline } from '@/components/ProjectPipeline';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { formatDate, statusColor, cn } from '@/lib/utils';

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [retryingWorker, setRetryingWorker] = useState<string | null>(null);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => apiClient.projects.get(id),
    refetchInterval: 15_000,
  });

  const approveMutation = useMutation({
    mutationFn: () => apiClient.projects.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', id] }),
  });

  const regenerateVoiceMutation = useMutation({
    mutationFn: () => apiClient.projects.retryWorker(id, 'voice'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', id] }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiClient.projects.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', id] }),
  });

  const resumeMutation = useMutation({
    mutationFn: () => apiClient.projects.resume(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', id] }),
  });

  const retryRenderMutation = useMutation({
    mutationFn: () => apiClient.projects.retryRender(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', id] }),
  });

  const handleRetry = async (workerKey: string) => {
    setRetryingWorker(workerKey);
    try {
      await apiClient.projects.retryWorker(id, workerKey);
      await queryClient.invalidateQueries({ queryKey: ['projects', id] });
    } finally {
      setRetryingWorker(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error ? (error as Error).message : 'Project not found'}
      </div>
    );
  }

  const workflow = project.workflowExecutions?.[0];
  const workers = workflow?.workerExecutions ?? [];
  const video = project.videos?.[0];
  const script = project.scriptArtifacts?.[0];

  return (
    <div className="page-stack">
      <div>
        <Link
          href="/projects"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <h1 className="text-xl font-bold leading-snug text-zinc-100 sm:text-2xl">
                {project.topic}
              </h1>
              <Badge className={cn('w-fit shrink-0', statusColor(project.status))}>
                {project.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {project.campaign.name} · {project.language.toUpperCase()} ·{' '}
              {project.platform} · Updated {formatDate(project.updatedAt)}
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {project.status === 'AWAITING_APPROVAL' && (
              <>
                <Button
                  loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve script
                </Button>
                <Button
                  variant="outline"
                  loading={regenerateVoiceMutation.isPending}
                  onClick={() => regenerateVoiceMutation.mutate()}
                  className="w-full sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4" />
                  Regenerate voice
                </Button>
              </>
            )}
            {(project.status === 'RENDERING' ||
              project.status === 'COMPLETED' ||
              (project.status === 'FAILED' && video)) && (
              <Button
                loading={retryRenderMutation.isPending}
                onClick={() => retryRenderMutation.mutate()}
                className="w-full sm:w-auto"
              >
                <Play className="h-4 w-4" />
                Retry render
              </Button>
            )}
            {['RUNNING', 'RENDERING', 'PUBLISHING'].includes(project.status) && (
              <Button
                variant="danger"
                loading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                className="w-full sm:w-auto"
              >
                <Pause className="h-4 w-4" />
                Cancel
              </Button>
            )}
            {['FAILED', 'CANCELLED'].includes(project.status) && (
              <Button
                loading={resumeMutation.isPending}
                onClick={() => resumeMutation.mutate()}
                className="w-full sm:w-auto"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )}
          </div>
        </div>
        {(approveMutation.isError || regenerateVoiceMutation.isError) && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {(approveMutation.error ?? regenerateVoiceMutation.error)?.message}
          </div>
        )}
        {regenerateVoiceMutation.isSuccess && (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            Voice regeneration started. Wait about 30 seconds, then click Approve script.
          </div>
        )}
      </div>

      {video?.status === 'COMPLETED' && (
        <Card>
          <CardHeader>
            <CardTitle>Your video</CardTitle>
          </CardHeader>
          <VideoPlayer projectId={id} videoId={video.id} topic={project.topic} />
          {video.durationMs != null && (
            <p className="mt-3 text-xs text-zinc-500">
              {Math.round(video.durationMs / 1000)}s
              {video.width && video.height ? ` · ${video.width}×${video.height}` : ''}
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjectPipeline
            projectId={id}
            workers={workers}
            onRetry={handleRetry}
            retrying={retryingWorker}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-zinc-500">Style</dt>
                <dd className="text-right text-zinc-200">{project.videoStyle ?? 'Default'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-zinc-500">Duration target</dt>
                <dd className="text-right text-zinc-200">
                  {project.durationTarget ? `${project.durationTarget}s` : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Auto-approve</dt>
                <dd className="text-zinc-200">
                  {project.settings?.autoApprove ? 'Yes' : 'No'}
                </dd>
              </div>
              {workflow && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Workflow</dt>
                    <dd>
                      <Badge className={statusColor(workflow.status)}>
                        {workflow.status.replace(/_/g, ' ')}
                      </Badge>
                    </dd>
                  </div>
                  {workflow.currentStep && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Current step</dt>
                      <dd className="text-zinc-200">
                        {workflow.currentStep.replace(/_/g, ' ')}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </Card>

          {script && (
            <Card>
              <CardHeader>
                <CardTitle>Script used for voice</CardTitle>
              </CardHeader>
              <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {script.content}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {script.wordCount} words · v{script.version}
              </p>
            </Card>
          )}

          {video && (
            <Card>
              <CardHeader>
                <CardTitle>Latest video</CardTitle>
              </CardHeader>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Status</dt>
                  <dd>
                    <Badge className={statusColor(video.status)}>{video.status}</Badge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Version</dt>
                  <dd className="text-zinc-200">v{video.version}</dd>
                </div>
                {video.status === 'COMPLETED' && project.status !== 'COMPLETED' && (
                  <p className="text-xs text-zinc-400">
                    Video rendered but project status is out of sync. Refresh the page.
                  </p>
                )}
                {video.status === 'FAILED' && (
                  <p className="text-xs text-red-400">
                    Render failed. Click Retry render above.
                  </p>
                )}
              </dl>
            </Card>
          )}

          {project.status === 'RENDERING' && (
            <Card className="border-accent/30">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-medium text-zinc-200">AI pipeline complete — rendering video</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    First render may take 2–5 minutes (Remotion bundling). If stuck at 0%, click Retry render after restarting the backend.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {project.status === 'FAILED' && (
            <Card className="border-red-500/30">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 shrink-0 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">Pipeline failed</p>
                  {workers.find((w) => w.errorMessage)?.errorMessage && (
                    <p className="mt-1 text-xs text-red-300">
                      {workers.find((w) => w.errorMessage)!.errorMessage}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-400">
                    Retry failed workers or resume the workflow to continue production.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
