/**
 * One coloured bar with the percentage written on it — the scenario
 * calculator has to be readable by a child ("máme 62 % šancu").
 */
export function ProbabilityBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number; // 0..1
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-sm muted">{label}</span>
      <div
        className="surface-2 relative h-7 flex-1 overflow-hidden rounded-full"
        role="img"
        aria-label={`${label}: ${pct} percent`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(pct, 2)}%`, background: color }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black">
          {pct} %
        </span>
      </div>
    </div>
  );
}
