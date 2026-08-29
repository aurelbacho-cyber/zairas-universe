import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useSeasonStore } from './store/useSeasonStore';
import { useActiveProfile, usePredictionResults, useRealTies } from './store/selectors';
import { evaluateBadges } from './lib/badges';
import { scheduleReminders } from './lib/notifications';
import { MatchdaysScreen } from './screens/MatchdaysScreen';
import { TableScreen } from './screens/TableScreen';
import { BracketScreen } from './screens/BracketScreen';
import { PredictionsScreen } from './screens/PredictionsScreen';
import { ChronicleScreen } from './screens/ChronicleScreen';
import { ImportScreen } from './screens/ImportScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ScenariosScreen } from './screens/ScenariosScreen';

// Recharts is only needed on the team detail page — keeping it out of the main
// bundle matters on a phone over mobile data.
const TeamDetailScreen = lazy(() =>
  import('./screens/TeamDetailScreen').then((m) => ({ default: m.TeamDetailScreen })),
);
import { Confetti } from './components/Confetti';

export type Route =
  | { name: 'matchdays' }
  | { name: 'table' }
  | { name: 'bracket' }
  | { name: 'predictions' }
  | { name: 'chronicle' }
  | { name: 'team'; teamId: string }
  | { name: 'import' }
  | { name: 'settings' }
  | { name: 'scenarios' };

const TABS: Array<{ name: Route['name']; label: string; emoji: string }> = [
  { name: 'matchdays', label: 'Kolá', emoji: '📅' },
  { name: 'table', label: 'Tabuľka', emoji: '📊' },
  { name: 'bracket', label: 'Pavúk', emoji: '🕸️' },
  { name: 'predictions', label: 'Tipovačka', emoji: '🏆' },
  { name: 'chronicle', label: 'Kronika', emoji: '📖' },
];

export default function App() {
  const hydrate = useSeasonStore((s) => s.hydrate);
  const hydrated = useSeasonStore((s) => s.hydrated);
  const settings = useSeasonStore((s) => s.settings);
  const [route, setRoute] = useState<Route>({ name: 'matchdays' });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Theme + kid mode are plain classes on <html> so CSS variables can react.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', settings.theme === 'light');
    root.classList.toggle('dark', settings.theme === 'dark');
    root.classList.toggle('kid', settings.kidMode);
  }, [settings.theme, settings.kidMode]);

  useBadgeWatcher(hydrated);
  useReminders(hydrated);

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="muted animate-pulse">Načítavam sezónu…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header route={route} onNavigate={setRoute} />
      <main className="flex-1 overflow-y-auto px-3 pb-24 pt-2">
        <Suspense fallback={<p className="muted p-4">Načítavam…</p>}>
          <Screen route={route} onNavigate={setRoute} />
        </Suspense>
      </main>
      <BottomNav route={route} onNavigate={setRoute} />
      <GoalCelebration />
    </div>
  );
}

function Screen({ route, onNavigate }: { route: Route; onNavigate: (r: Route) => void }) {
  switch (route.name) {
    case 'matchdays':
      return <MatchdaysScreen onNavigate={onNavigate} />;
    case 'table':
      return <TableScreen onNavigate={onNavigate} />;
    case 'bracket':
      return <BracketScreen />;
    case 'predictions':
      return <PredictionsScreen onNavigate={onNavigate} />;
    case 'chronicle':
      return <ChronicleScreen onNavigate={onNavigate} />;
    case 'team':
      return <TeamDetailScreen teamId={route.teamId} onNavigate={onNavigate} />;
    case 'import':
      return <ImportScreen onNavigate={onNavigate} />;
    case 'settings':
      return <SettingsScreen onNavigate={onNavigate} />;
    case 'scenarios':
      return <ScenariosScreen onNavigate={onNavigate} />;
  }
}

function Header({ route, onNavigate }: { route: Route; onNavigate: (r: Route) => void }) {
  const isDemo = useSeasonStore((s) => s.fixturesAreDemo);
  const fixtureCount = useSeasonStore((s) => s.fixtures.length);
  const profile = useActiveProfile();

  return (
    <header className="sticky top-0 z-30 px-3 pt-3" style={{ background: 'var(--app-bg)' }}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-left"
          onClick={() => onNavigate({ name: 'matchdays' })}
        >
          <h1 className="text-xl font-black leading-none">
            🕸️ Pavúk <span style={{ color: 'var(--app-accent)' }}>LM 26/27</span>
          </h1>
        </button>
        <div className="ml-auto flex items-center gap-2">
          {fixtureCount === 0 || route.name === 'import' ? null : (
            <button
              type="button"
              className="btn btn-ghost px-3 text-sm"
              onClick={() => onNavigate({ name: 'scenarios' })}
            >
              📈<span className="sr-only">Kalkulačka scenárov</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost px-3 text-sm"
            aria-label={`Nastavenia — aktívny profil ${profile?.name ?? ''}`}
            onClick={() => onNavigate({ name: 'settings' })}
          >
            {profile?.avatarEmoji ?? '⚙️'}
          </button>
        </div>
      </div>
      {isDemo ? (
        <p className="mt-2 rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background: '#7c2d12', color: '#fed7aa' }}>
          ⚠️ Máš načítaný <strong>ukážkový</strong> rozpis — nie je to skutočný žreb UEFA.
        </p>
      ) : null}
    </header>
  );
}

function BottomNav({ route, onNavigate }: { route: Route; onNavigate: (r: Route) => void }) {
  return (
    <nav
      aria-label="Hlavná navigácia"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t px-1 pt-1"
      style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
    >
      {TABS.map((tab) => {
        const active = route.name === tab.name;
        return (
          <button
            key={tab.name}
            type="button"
            aria-current={active ? 'page' : undefined}
            className="tap flex flex-col items-center justify-center rounded-xl py-1 text-[11px] font-bold"
            style={{
              color: active ? 'var(--app-accent)' : 'var(--app-muted)',
              background: active ? 'var(--app-surface-2)' : 'transparent',
            }}
            onClick={() => onNavigate({ name: tab.name } as Route)}
          >
            <span className="text-lg" aria-hidden="true">
              {tab.emoji}
            </span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

/** Re-evaluates achievements whenever the season data changes. */
function useBadgeWatcher(ready: boolean) {
  const profiles = useSeasonStore((s) => s.profiles);
  const fixtures = useSeasonStore((s) => s.fixtures);
  const seasonPredictions = useSeasonStore((s) => s.seasonPredictions);
  const awardBadges = useSeasonStore((s) => s.awardBadges);
  const results = usePredictionResults();
  const ties = useRealTies();
  const profile = useActiveProfile();

  useEffect(() => {
    if (!ready) return;
    const earned = evaluateBadges({
      profiles,
      fixtures,
      ties,
      results,
      seasonPredictions,
      favouriteTeamId: profile?.favouriteTeamId,
    });
    awardBadges(earned);
  }, [ready, profiles, fixtures, ties, results, seasonPredictions, profile, awardBadges]);
}

function useReminders(ready: boolean) {
  const fixtures = useSeasonStore((s) => s.fixtures);
  const teams = useSeasonStore((s) => s.teams);
  const enabled = useSeasonStore((s) => s.settings.notificationsEnabled);
  const profile = useActiveProfile();

  useEffect(() => {
    if (!ready || !enabled) return;
    scheduleReminders(fixtures, teams, profile?.favouriteTeamId);
  }, [ready, enabled, fixtures, teams, profile]);
}

/**
 * Confetti when the favourite team's goal count goes up. Watching the score of
 * every fixture would be expensive, so we only compare totals.
 */
function GoalCelebration() {
  const fixtures = useSeasonStore((s) => s.fixtures);
  const kidMode = useSeasonStore((s) => s.settings.kidMode);
  const profile = useActiveProfile();
  const favourite = profile?.favouriteTeamId;

  const total = useMemo(() => {
    if (!favourite) return 0;
    return fixtures.reduce((sum, f) => {
      if (!f.score) return sum;
      if (f.homeId === favourite) return sum + f.score.home;
      if (f.awayId === favourite) return sum + f.score.away;
      return sum;
    }, 0);
  }, [fixtures, favourite]);

  const [previous, setPrevious] = useState<number | null>(null);
  const [fire, setFire] = useState(0);

  useEffect(() => {
    if (previous === null) {
      setPrevious(total);
      return;
    }
    if (total > previous && kidMode) setFire((n) => n + 1);
    setPrevious(total);
    // `previous` intentionally excluded: it is the comparison baseline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, kidMode]);

  const done = useCallback(() => undefined, []);
  return <Confetti fire={fire} onDone={done} />;
}
