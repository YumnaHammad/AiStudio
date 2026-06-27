'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ListOrdered, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Select, Badge } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

type JobStatus = 'waiting' | 'active' | 'failed';

export default function QueuesPage() {
  const queryClient = useQueryClient();
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>('waiting');
  const [actionJobId, setActionJobId] = useState<string | null>(null);

  const { data: queues, isLoading, error } = useQuery({
    queryKey: ['queues'],
    queryFn: () => apiClient.queues.list(),
    refetchInterval: 10_000,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['queues', selectedQueue, jobStatus],
    queryFn: () => apiClient.queues.jobs(selectedQueue!, jobStatus),
    enabled: !!selectedQueue,
    refetchInterval: 5_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiClient.queues.cancelJob(selectedQueue!, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      setActionJobId(null);
    },
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiClient.queues.retryJob(selectedQueue!, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      setActionJobId(null);
    },
  });

  return (
    <div className="page-stack">
      <PageHeader
        title="Queues"
        description="Monitor and manage BullMQ job queues"
      />

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load queues: {(error as Error).message}
        </div>
      )}

      {queues && queues.length === 0 && (
        <Card className="flex flex-col items-center py-16 text-center">
          <ListOrdered className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-lg font-medium text-zinc-300">No queues available</p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {queues?.map((queue) => (
          <button
            key={queue.name}
            type="button"
            onClick={() => setSelectedQueue(queue.name)}
            className={cn(
              'rounded-xl border p-4 text-left transition-colors sm:p-5',
              selectedQueue === queue.name
                ? 'border-accent bg-accent/10'
                : 'border-zinc-800 bg-surface-raised hover:border-zinc-700',
            )}
          >
            <p className="break-words font-medium text-zinc-100">{queue.name}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge className="text-yellow-400 bg-yellow-400/10 border-yellow-400/20">
                {queue.waiting} waiting
              </Badge>
              <Badge className="text-blue-400 bg-blue-400/10 border-blue-400/20">
                {queue.active} active
              </Badge>
              {queue.failed !== undefined && queue.failed > 0 && (
                <Badge className="text-red-400 bg-red-400/10 border-red-400/20">
                  {queue.failed} failed
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>

      {selectedQueue && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="break-words">{selectedQueue} jobs</CardTitle>
                <CardDescription>Browse and manage jobs in this queue</CardDescription>
              </div>
              <Select
                className="w-full sm:w-40"
                value={jobStatus}
                onChange={(e) => setJobStatus(e.target.value as JobStatus)}
              >
                <option value="waiting">Waiting</option>
                <option value="active">Active</option>
                <option value="failed">Failed</option>
              </Select>
            </div>
          </CardHeader>

          {jobsLoading && (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          )}

          {jobs && jobs.length === 0 && (
            <p className="text-sm text-zinc-500">No {jobStatus} jobs in this queue.</p>
          )}

          <div className="space-y-2">
            {jobs?.map((job) => (
              <div
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-surface px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200">{job.name}</p>
                  <p className="text-xs text-zinc-500">
                    ID: {job.id} · Attempts: {job.attemptsMade} · State: {job.state}
                  </p>
                  {job.data && Object.keys(job.data).length > 0 && (
                    <pre className="mt-1 max-h-20 overflow-auto text-xs text-zinc-600">
                      {JSON.stringify(job.data, null, 2)}
                    </pre>
                  )}
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  {jobStatus !== 'failed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400"
                      loading={actionJobId === String(job.id) && cancelMutation.isPending}
                      onClick={() => {
                        setActionJobId(String(job.id));
                        cancelMutation.mutate(String(job.id));
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  )}
                  {jobStatus === 'failed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={actionJobId === String(job.id) && retryMutation.isPending}
                      onClick={() => {
                        setActionJobId(String(job.id));
                        retryMutation.mutate(String(job.id));
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
