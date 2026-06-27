import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1 lg:block">
        <h1 className="text-lg font-bold tracking-tight text-zinc-100 sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {action}
        </div>
      )}
    </div>
  );
}
