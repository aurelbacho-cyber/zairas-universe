import type { Fixture, Team, Pot } from '../types';
import { LEAGUE_PHASE } from '../config/rules';
import { MATCHDAYS } from '../config/calendar';

export type ValidationIssue = {
  level: 'error' | 'warning';
  code: string;
  message: string;
  /** Team or fixture the issue belongs to, when applicable. */
  teamId?: string;
  fixtureId?: string;
};

export type ValidationReport = {
  ok: boolean;
  issues: ValidationIssue[];
  counts: {
    fixtures: number;
    teamsSeen: number;
    perMatchday: Record<number, number>;
  };
};

const err = (code: string, message: string, extra: Partial<ValidationIssue> = {}): ValidationIssue => ({
  level: 'error',
  code,
  message,
  ...extra,
});

const warn = (code: string, message: string, extra: Partial<ValidationIssue> = {}): ValidationIssue => ({
  level: 'warning',
  code,
  message,
  ...extra,
});

/**
 * Checks an imported league-phase schedule against the competition format:
 * 144 matches, every team exactly 8 (4 home + 4 away), exactly 2 opponents
 * from each pot, no opponent twice.
 *
 * Errors block the import; warnings (dates outside the published windows,
 * duplicate ids that we can fix ourselves) do not.
 */
export function validateFixtures(fixtures: Fixture[], teams: Team[]): ValidationReport {
  const issues: ValidationIssue[] = [];
  const byId = new Map(teams.map((t) => [t.id, t]));

  // --- global count -------------------------------------------------------
  if (fixtures.length !== LEAGUE_PHASE.totalMatches) {
    issues.push(
      err(
        'total-count',
        `Rozpis má ${fixtures.length} zápasov, očakáva sa ${LEAGUE_PHASE.totalMatches}.`,
      ),
    );
  }

  // --- duplicate fixture ids ---------------------------------------------
  const seenIds = new Set<string>();
  for (const f of fixtures) {
    if (seenIds.has(f.id)) {
      issues.push(warn('duplicate-id', `Duplicitné id zápasu „${f.id}" — premenujeme ho.`, { fixtureId: f.id }));
    }
    seenIds.add(f.id);
  }

  // --- per-fixture sanity -------------------------------------------------
  const perMatchday: Record<number, number> = {};
  const playedPairs = new Set<string>();

  for (const f of fixtures) {
    perMatchday[f.matchday] = (perMatchday[f.matchday] ?? 0) + 1;

    if (!byId.has(f.homeId)) {
      issues.push(err('unknown-team', `Neznámy domáci tím „${f.homeId}".`, { fixtureId: f.id }));
    }
    if (!byId.has(f.awayId)) {
      issues.push(err('unknown-team', `Neznámy hosťujúci tím „${f.awayId}".`, { fixtureId: f.id }));
    }
    if (f.homeId === f.awayId) {
      issues.push(err('self-match', `Tím „${f.homeId}" hrá sám proti sebe.`, { fixtureId: f.id }));
    }
    if (!(f.matchday >= 1 && f.matchday <= LEAGUE_PHASE.matchdays)) {
      issues.push(err('bad-matchday', `Zápas „${f.id}" má neplatné kolo ${f.matchday}.`, { fixtureId: f.id }));
    }
    if (Number.isNaN(Date.parse(f.date))) {
      issues.push(err('bad-date', `Zápas „${f.id}" má neplatný dátum „${f.date}".`, { fixtureId: f.id }));
    } else {
      const window = MATCHDAYS.find((m) => m.matchday === f.matchday);
      if (window) {
        const day = f.date.slice(0, 10);
        if (day < window.from || day > window.to) {
          issues.push(
            warn(
              'date-outside-window',
              `Zápas „${f.id}" má dátum ${day}, kolo ${f.matchday} sa hrá ${window.label}.`,
              { fixtureId: f.id },
            ),
          );
        }
      }
    }

    // The same two teams may not meet twice, in either direction.
    const pair = [f.homeId, f.awayId].sort().join('|');
    if (playedPairs.has(pair)) {
      issues.push(
        err('duplicate-pairing', `Dvojica ${label(byId, f.homeId)} – ${label(byId, f.awayId)} sa opakuje.`, {
          fixtureId: f.id,
        }),
      );
    }
    playedPairs.add(pair);
  }

  // --- matches per matchday ----------------------------------------------
  for (let md = 1; md <= LEAGUE_PHASE.matchdays; md++) {
    const n = perMatchday[md] ?? 0;
    if (n !== LEAGUE_PHASE.matchesPerMatchday) {
      issues.push(
        err('matchday-count', `Kolo ${md} má ${n} zápasov, očakáva sa ${LEAGUE_PHASE.matchesPerMatchday}.`),
      );
    }
  }

  // --- per-team checks ----------------------------------------------------
  for (const team of teams) {
    const home = fixtures.filter((f) => f.homeId === team.id);
    const away = fixtures.filter((f) => f.awayId === team.id);
    const total = home.length + away.length;

    if (total !== LEAGUE_PHASE.matchesPerTeam) {
      issues.push(
        err('team-match-count', `${team.name}: ${total} zápasov namiesto ${LEAGUE_PHASE.matchesPerTeam}.`, {
          teamId: team.id,
        }),
      );
    }
    if (home.length !== LEAGUE_PHASE.homeMatchesPerTeam) {
      issues.push(
        err('team-home-count', `${team.name}: ${home.length} zápasov doma namiesto ${LEAGUE_PHASE.homeMatchesPerTeam}.`, {
          teamId: team.id,
        }),
      );
    }
    if (away.length !== LEAGUE_PHASE.awayMatchesPerTeam) {
      issues.push(
        err('team-away-count', `${team.name}: ${away.length} zápasov vonku namiesto ${LEAGUE_PHASE.awayMatchesPerTeam}.`, {
          teamId: team.id,
        }),
      );
    }

    // Two opponents from each pot.
    const opponents = [...home.map((f) => f.awayId), ...away.map((f) => f.homeId)];
    const perPot: Record<Pot, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const oppId of opponents) {
      const opp = byId.get(oppId);
      if (opp) perPot[opp.pot] += 1;
    }
    for (const pot of [1, 2, 3, 4] as Pot[]) {
      if (perPot[pot] !== LEAGUE_PHASE.opponentsPerPot) {
        issues.push(
          err(
            'team-pot-spread',
            `${team.name}: ${perPot[pot]} súperov z koša ${pot} namiesto ${LEAGUE_PHASE.opponentsPerPot}.`,
            { teamId: team.id },
          ),
        );
      }
    }

    // No opponent twice.
    const dupes = opponents.filter((id, i) => opponents.indexOf(id) !== i);
    for (const dupe of new Set(dupes)) {
      issues.push(
        err('team-duplicate-opponent', `${team.name} hrá dvakrát proti ${label(byId, dupe)}.`, {
          teamId: team.id,
        }),
      );
    }

    // At most one match per matchday.
    const mds = [...home, ...away].map((f) => f.matchday);
    const dupMd = mds.filter((md, i) => mds.indexOf(md) !== i);
    for (const md of new Set(dupMd)) {
      issues.push(
        err('team-two-matches-same-matchday', `${team.name} hrá v kole ${md} dvakrát.`, { teamId: team.id }),
      );
    }
  }

  const teamsSeen = new Set(fixtures.flatMap((f) => [f.homeId, f.awayId])).size;

  return {
    ok: !issues.some((i) => i.level === 'error'),
    issues,
    counts: { fixtures: fixtures.length, teamsSeen, perMatchday },
  };
}

function label(byId: Map<string, Team>, id: string): string {
  return byId.get(id)?.name ?? id;
}
