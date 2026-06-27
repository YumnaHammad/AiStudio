import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in — AI Content Studio',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-h-dvh items-center justify-center bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-surface to-surface" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
