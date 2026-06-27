'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Megaphone,
  MessageSquareText,
  ListOrdered,
  Settings,
  LogOut,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/prompts', label: 'Prompts', icon: MessageSquareText },
  { href: '/queues', label: 'Queues', icon: ListOrdered },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarPanelProps {
  onNavigate?: () => void;
  showClose?: boolean;
}

function SidebarPanel({ onNavigate, showClose }: SidebarPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, refreshToken, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await apiClient.auth.logout(refreshToken ?? undefined);
    } catch {
      // proceed with local logout even if API call fails
    }
    clearAuth();
    onNavigate?.();
    router.push('/login');
  };

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? 'User';

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-4 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-100">AI Content Studio</p>
            <p className="truncate text-xs text-zinc-500">Production pipeline</p>
          </div>
        </div>
        {showClose && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onNavigate}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-surface-overlay hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-zinc-400 hover:bg-surface-overlay hover:text-zinc-100',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 rounded-lg bg-surface px-3 py-2.5">
          <p className="truncate text-sm font-medium text-zinc-200">{displayName}</p>
          <p className="truncate text-xs text-zinc-500">{user?.email}</p>
          {user?.role && (
            <span className="mt-1.5 inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              {user.role}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-surface-overlay hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close navigation menu"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        id="mobile-sidebar"
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(100vw,20rem)] flex-col border-r border-zinc-800 bg-surface-raised shadow-2xl transition-transform duration-300 ease-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarPanel onNavigate={onClose} showClose />
      </aside>
    </>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-zinc-800 bg-surface-raised lg:flex">
      <SidebarPanel />
    </aside>
  );
}
