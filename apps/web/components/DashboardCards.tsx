'use client';

import Link from 'next/link';
import {
  DollarSign,
  Cpu,
  Film,
  Upload,
  FolderOpen,
  Activity,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Input';
import { formatCurrency, formatRelativeTime, statusColor, cn } from '@/lib/utils';
import type { DashboardSummary } from '@/lib/types';

interface DashboardCardsProps {
  summary: DashboardSummary;
  liveCost?: number | null;
}

export function DashboardCards({ summary, liveCost }: DashboardCardsProps) {
  const cost = liveCost ?? summary.todayCost;

  const stats = [
    {
      label: "Today's AI Cost",
      value: formatCurrency(cost),
      icon: DollarSign,
      color: 'text-emerald-400 bg-emerald-400/10',
      compact: false,
    },
    {
      label: 'Active AI Jobs',
      value: String(summary.activeAiJobs),
      icon: Cpu,
      color: 'text-blue-400 bg-blue-400/10',
      compact: false,
    },
    {
      label: 'Render Queue',
      value: `${summary.renderingQueue.waiting} waiting`,
      detail: `${summary.renderingQueue.active} active`,
      icon: Film,
      color: 'text-violet-400 bg-violet-400/10',
      compact: true,
    },
    {
      label: 'Upload Queue',
      value: `${summary.uploadQueue.waiting} waiting`,
      detail: `${summary.uploadQueue.active} active`,
      icon: Upload,
      color: 'text-cyan-400 bg-cyan-400/10',
      compact: true,
    },
  ];

  const totalProjects = Object.values(summary.projectCounts).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map(({ label, value, detail, icon: Icon, color, compact }) => (
          <Card key={label} className="relative overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-400 sm:text-sm">{label}</p>
                <p
                  className={cn(
                    'mt-1 font-semibold leading-snug text-zinc-100',
                    compact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl',
                  )}
                >
                  {value}
                </p>
                {detail && (
                  <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">{detail}</p>
                )}
              </div>
              <div className={cn('shrink-0 rounded-lg p-2 sm:p-2.5', color)}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FolderOpen className="h-5 w-5 shrink-0 text-accent" />
              Recent Projects
            </CardTitle>
            <CardDescription>
              {totalProjects} total projects across all statuses
            </CardDescription>
          </CardHeader>
          <div className="space-y-2">
            {summary.recentProjects.length === 0 ? (
              <p className="text-sm text-zinc-500">No projects yet.</p>
            ) : (
              summary.recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-lg border border-zinc-800 bg-surface px-3 py-3 transition-colors hover:border-zinc-700 sm:px-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-200">
                        {project.topic}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatRelativeTime(project.updatedAt)}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        'w-fit shrink-0 self-start text-[10px] sm:text-xs',
                        statusColor(project.status),
                      )}
                    >
                      {project.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Activity className="h-5 w-5 shrink-0 text-accent" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest workspace audit events</CardDescription>
          </CardHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {summary.recentActivity.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent activity.</p>
            ) : (
              summary.recentActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-zinc-800 bg-surface px-3 py-3 sm:px-4"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                    <p className="min-w-0 break-words text-sm text-zinc-300">
                      <span className="font-medium text-zinc-100">
                        {entry.user?.firstName ?? entry.user?.email ?? 'System'}
                      </span>{' '}
                      {entry.action.replace(/_/g, ' ').toLowerCase()}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 break-all text-xs text-zinc-500">
                    {entry.resource} · {entry.resourceId.slice(0, 8)}…
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {summary.queues.length > 0 && (
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Queue Overview</CardTitle>
            <CardDescription>BullMQ queue statistics</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {summary.queues.map((queue) => (
              <div
                key={queue.name}
                className="rounded-lg border border-zinc-800 bg-surface p-3 sm:p-4"
              >
                <p className="break-words text-sm font-medium text-zinc-200">{queue.name}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
                  <span>{queue.waiting} waiting</span>
                  <span>{queue.active} active</span>
                  {'failed' in queue && queue.failed !== undefined && (
                    <span className="text-red-400">{queue.failed} failed</span>
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
