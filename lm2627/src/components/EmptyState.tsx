import type { ReactNode } from 'react';

export function EmptyState({
  emoji,
  title,
  children,
  action,
}: {
  emoji: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card mx-auto max-w-md text-center">
      <div className="text-5xl" aria-hidden="true">
        {emoji}
      </div>
      <h2 className="mt-2 text-lg font-black">{title}</h2>
      {children ? <div className="mt-1 text-sm muted">{children}</div> : null}
      {action ? <div className="mt-3 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}
