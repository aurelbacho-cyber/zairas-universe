import type { Team } from '../types';

/**
 * Clubs are drawn as a coloured tile with their short code — no crest images
 * are shipped with the app. If a team has a `crestUrl` it is used instead.
 */
export function TeamTile({
  team,
  size = 'md',
  dimmed = false,
}: {
  team?: Team;
  size?: 'sm' | 'md' | 'lg';
  dimmed?: boolean;
}) {
  const px = size === 'sm' ? 24 : size === 'lg' ? 44 : 32;
  const font = size === 'sm' ? 9 : size === 'lg' ? 15 : 11;

  if (!team) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center justify-center rounded-md border border-dashed"
        style={{ width: px, height: px, borderColor: 'var(--app-border)' }}
      />
    );
  }

  if (team.crestUrl) {
    return (
      <img
        src={team.crestUrl}
        alt=""
        width={px}
        height={px}
        className="shrink-0 rounded-md object-contain"
        style={{ opacity: dimmed ? 0.45 : 1 }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-md font-black tracking-tight"
      style={{
        width: px,
        height: px,
        fontSize: font,
        background: team.colors.primary,
        color: readableOn(team.colors.primary),
        boxShadow: `inset 0 -3px 0 0 ${team.colors.secondary}`,
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      {team.short}
    </span>
  );
}

/** Picks black or white text so the short code stays readable (WCAG-ish). */
export function readableOn(hex: string): string {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? '#0b1020' : '#ffffff';
}
