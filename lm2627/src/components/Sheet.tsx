import { useEffect, useRef, type ReactNode } from 'react';

/** Bottom sheet used for every detail panel. Closes on Escape or backdrop tap. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Zavrieť"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="pop-in surface relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-4 sm:rounded-3xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-black">{title}</h2>
          <button type="button" className="btn btn-ghost px-3" onClick={onClose}>
            Zavrieť
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
