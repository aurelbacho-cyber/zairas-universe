import { useSeasonStore } from '../store/useSeasonStore';
import { useActiveProfile } from '../store/selectors';
import { BADGES } from '../config/badges';

/** Trophy cabinet — unearned badges are shown as silhouettes. */
export function BadgeCabinet() {
  const earned = useSeasonStore((s) => s.earnedBadges);
  const profile = useActiveProfile();
  const mine = new Map(
    earned.filter((b) => b.userId === profile?.id).map((b) => [b.badgeId, b.earnedAt]),
  );

  return (
    <div className="space-y-2">
      <p className="text-sm muted">
        {mine.size} z {BADGES.length} odznakov pre {profile?.name ?? 'teba'}.
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BADGES.map((badge) => {
          const at = mine.get(badge.id);
          const has = !!at;
          return (
            <li
              key={badge.id}
              className="card text-center"
              style={{
                borderColor: has ? 'var(--app-accent)' : 'var(--app-border)',
                opacity: has ? 1 : 0.55,
              }}
            >
              <div
                className="text-4xl"
                aria-hidden="true"
                style={has ? undefined : { filter: 'grayscale(1) brightness(0.45)' }}
              >
                {badge.emoji}
              </div>
              <p className="mt-1 text-sm font-black">{badge.title}</p>
              <p className="text-[11px] muted">{badge.description}</p>
              <p className="mt-1 text-[10px] muted">
                {has ? `Získané ${new Date(at!).toLocaleDateString('sk-SK')}` : 'Zatiaľ nezískané'}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
