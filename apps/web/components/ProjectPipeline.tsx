'use client';

import { useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  SkipForward,
  Clock,
  RotateCcw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Input';
import { useProjectWebSocket } from '@/hooks/useProjectWebSocket';
import { cn, statusColor, workerLabel } from '@/lib/utils';
import { WORKER_PIPELINE_ORDER } from '@/lib/types';
import type { WorkerExecution, WorkerStatusEvent } from '@/lib/types';

interface ProjectPipelineProps {
  projectId: string;
  workers: WorkerExecution[];
  onRetry?: (workerKey: string) => void;
  retrying?: string | null;
}

function statusIcon(status: string) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    case 'RUNNING':
      return <Loader2 className="h-5 w-5 animate-spin text-blue-400" />;
    case 'FAILED':
      return <XCircle className="h-5 w-5 text-red-400" />;
    case 'SKIPPED':
      return <SkipForward className="h-5 w-5 text-zinc-500" />;
    case 'QUEUED':
    case 'PENDING':
      return <Clock className="h-5 w-5 text-yellow-400" />;
    default:
      return <Circle className="h-5 w-5 text-zinc-600" />;
  }
}

function resolveStatus(
  workerKey: string,
  workers: WorkerExecution[],
  liveUpdates: Record<string, WorkerStatusEvent>,
): string {
  const execution = workers.find((w) => w.workerKey === workerKey);
  const dbStatus = execution?.status;
  const liveStatus = liveUpdates[workerKey]?.status;

  // DB is source of truth once a worker finished (websocket may have stale QUEUED)
  if (
    dbStatus === 'COMPLETED' ||
    dbStatus === 'FAILED' ||
    dbStatus === 'SKIPPED' ||
    dbStatus === 'CANCELLED'
  ) {
    return dbStatus;
  }
  if (liveStatus) return liveStatus;
  return dbStatus ?? 'PENDING';
}

export function ProjectPipeline({
  projectId,
  workers,
  onRetry,
  retrying,
}: ProjectPipelineProps) {
  const { connected, workerUpdates, workflowUpdate, renderProgress } =
    useProjectWebSocket(projectId);

  const workerMap = useMemo(() => {
    const map = new Map<string, WorkerExecution>();
    // API returns oldest-first; keep latest execution per worker key
    workers.forEach((w) => map.set(w.workerKey, w));
    return map;
  }, [workers]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>AI Pipeline</CardTitle>
            <CardDescription>
              {WORKER_PIPELINE_ORDER.length} worker stages in production order
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-500">
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                Connecting…
              </>
            )}
          </div>
        </div>
        {workflowUpdate && (
          <div className="mt-2 rounded-lg border border-zinc-700 bg-surface px-3 py-2 text-sm">
            <span className="text-zinc-400">Workflow: </span>
            <span className="font-medium text-zinc-200">{workflowUpdate.status}</span>
            {workflowUpdate.currentStep && (
              <span className="text-zinc-400"> · {workflowUpdate.currentStep}</span>
            )}
            {workflowUpdate.error && (
              <p className="mt-1 text-xs text-red-400">{workflowUpdate.error}</p>
            )}
          </div>
        )}
        {renderProgress && (
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-xs text-zinc-400">
              <span>Render progress</span>
              <span>{Math.round(renderProgress.progress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${renderProgress.progress}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <div className="relative space-y-0">
        {WORKER_PIPELINE_ORDER.map((workerKey, index) => {
          const execution = workerMap.get(workerKey);
          const status = resolveStatus(workerKey, workers, workerUpdates);
          const isLast = index === WORKER_PIPELINE_ORDER.length - 1;

          return (
            <div key={workerKey} className="relative flex gap-3 pb-6 sm:gap-4">
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-[17px] top-10 h-[calc(100%-24px)] w-0.5 sm:left-[18px]',
                    status === 'COMPLETED' ? 'bg-emerald-400/40' : 'bg-zinc-800',
                  )}
                />
              )}

              <div className="relative z-10 shrink-0 rounded-full bg-surface-raised p-0.5">
                {statusIcon(status)}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-zinc-200">
                    {workerLabel(workerKey)}
                  </p>
                  <Badge className={statusColor(status)}>
                    {status.replace(/_/g, ' ')}
                  </Badge>
                  {execution?.provider && (
                    <span className="text-xs text-zinc-500">{execution.provider}</span>
                  )}
                </div>

                {execution?.errorMessage && (
                  <p className="mt-1 text-xs text-red-400">{execution.errorMessage}</p>
                )}

                {execution?.costUsd != null && execution.costUsd > 0 && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Cost: ${execution.costUsd.toFixed(4)}
                  </p>
                )}

                {status === 'FAILED' && onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    loading={retrying === workerKey}
                    onClick={() => onRetry(workerKey)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry worker
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
