/**
 * Big +/− control for entering a score during a match. Sized so it can be used
 * one-handed on a phone: two taps and the result is in.
 */
export function ScoreStepper({
  value,
  onChange,
  label,
  compact = false,
}: {
  value: number | undefined;
  onChange: (next: number) => void;
  label: string;
  compact?: boolean;
}) {
  const current = value ?? 0;
  const box = compact ? 'h-10 w-10 text-lg' : 'h-12 w-12 text-2xl';

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={`btn ${box} rounded-full px-0`}
        aria-label={`${label}: uber gól`}
        onClick={() => onChange(Math.max(0, current - 1))}
        disabled={current <= 0}
      >
        −
      </button>
      <span
        className={`min-w-[2ch] text-center font-black tabular-nums ${compact ? 'text-xl' : 'text-3xl'}`}
        aria-label={`${label}: ${current}`}
      >
        {value === undefined ? '–' : current}
      </span>
      <button
        type="button"
        className={`btn btn-primary ${box} rounded-full px-0`}
        aria-label={`${label}: pridaj gól`}
        onClick={() => onChange(current + 1)}
      >
        +
      </button>
    </div>
  );
}
