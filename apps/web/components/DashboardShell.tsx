'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Sparkles } from 'lucide-react';
import { DesktopSidebar, MobileSidebar } from '@/components/Sidebar';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'Projects',
  '/projects/new': 'New Project',
  '/campaigns': 'Campaigns',
  '/prompts': 'Prompts',
  '/queues': 'Queues',
  '/settings': 'Settings',
};

function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]!;
  if (pathname.startsWith('/projects/')) return 'Project';
  return 'AI Content Studio';
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = resolvePageTitle(pathname);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-surface">
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-h-dvh w-full">
        <DesktopSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-14 shrink-0 items-center gap-3 border-b border-zinc-800 bg-surface/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-[backdrop-filter]:bg-surface/80 sm:px-4 lg:hidden">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-sidebar"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-surface-overlay hover:text-zinc-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/20">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <p className="truncate text-sm font-semibold text-zinc-100">{pageTitle}</p>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden overflow-y-auto scrollbar-thin">
            <div className="w-full px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-6 lg:mx-auto lg:max-w-7xl lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
