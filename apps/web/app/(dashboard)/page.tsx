'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { DashboardCards } from '@/components/DashboardCards';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { useWorkspaceWebSocket } from '@/hooks/useProjectWebSocket';
import { apiClient } from '@/lib/api';

export default function DashboardPage() {
  const { todayCost } = useWorkspaceWebSocket();

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiClient.dashboard.summary(),
    refetchInterval: 60_000,
  });

  return (
    <div className="page-stack">
      <PageHeader
        title="Dashboard"
        description="Workspace overview and production metrics"
        className="hidden lg:flex"
        action={
          <Link href="/projects/new" className="block w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </Link>
        }
      />

      <div className="lg:hidden">
        <Link href="/projects/new" className="block w-full">
          <Button className="w-full">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load dashboard: {(error as Error).message}
        </div>
      )}

      {summary && <DashboardCards summary={summary} liveCost={todayCost} />}
    </div>
  );
}
