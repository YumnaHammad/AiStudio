import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    RUNNING: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    RENDERING: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    PUBLISHING: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    AWAITING_APPROVAL: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    FAILED: 'text-red-400 bg-red-400/10 border-red-400/20',
    CANCELLED: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
    DRAFT: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
    PENDING: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
    QUEUED: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    SKIPPED: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
  };
  return map[status] ?? 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
}

export function workerLabel(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export function getWsBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  return apiUrl.replace(/\/api\/v\d+\/?$/, '');
}
