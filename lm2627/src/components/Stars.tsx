import type { Rating } from '../types';

export function Stars({
  value,
  onChange,
  readOnly = false,
}: {
  value?: Rating;
  onChange?: (next: Rating | undefined) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <span aria-label={value ? `${value} z 5 hviezdičiek` : 'bez hodnotenia'}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} style={{ opacity: value && n <= value ? 1 : 0.25 }}>
            ⭐
          </span>
        ))}
      </span>
    );
  }
  return (
    <div className="flex gap-1" role="group" aria-label="Hodnotenie zápasu">
      {([1, 2, 3, 4, 5] as Rating[]).map((n) => (
        <button
          key={n}
          type="button"
          className="tap rounded-lg text-2xl leading-none"
          aria-label={`${n} z 5 hviezdičiek`}
          aria-pressed={value === n}
          style={{ opacity: value && n <= value ? 1 : 0.3 }}
          onClick={() => onChange?.(value === n ? undefined : n)}
        >
          ⭐
        </button>
      ))}
    </div>
  );
}
