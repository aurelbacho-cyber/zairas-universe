import { describe, expect, it } from 'vitest';
import { buildChronicleHtml, chronicleStats } from './chronicle';
import { createEmptyBracket } from '../config/bracketTopology';
import { propagateWinners } from './bracket';
import { fixture, team } from './testUtils';
import type { SeasonState } from '../types';

const season = (): SeasonState => {
  const ties = propagateWinners(
    createEmptyBracket().map((t) =>
      t.round === 'F'
        ? {
            ...t,
            teamAId: 'a',
            teamBId: 'b',
            legs: [{ score: { home: 2, away: 0 } }, undefined] as never,
          }
        : t,
    ),
  );
  return {
    schemaVersion: 1,
    teams: [team('a', 1, { name: 'Alfa' }), team('b', 2, { name: 'Beta' })],
    fixtures: [
      {
        ...fixture('m1', 'a', 'b', [3, 2]),
        watchedTogether: true,
        rating: 5,
        momentOfMatch: 'Gól z polovice ihriska',
        note: 'Kričali sme tak, že susedia klopali.',
      },
      { ...fixture('m2', 'b', 'a', [1, 1], 2), watchedTogether: true },
      fixture('m3', 'a', 'b', undefined, 3),
    ],
    fixturesAreDemo: false,
    ties,
    profiles: [{ id: 'otec', name: 'Otec', avatarEmoji: '🧔' }],
    predictions: [
      { userId: 'otec', fixtureId: 'm1', home: 3, away: 2, lockedAt: '2026-09-01T00:00:00.000Z' },
    ],
    seasonPredictions: [],
    earnedBadges: [],
    settings: {
      theme: 'dark',
      kidMode: false,
      soundOn: true,
      activeProfileId: 'otec',
      notificationsEnabled: false,
    },
    updatedAt: '2027-06-05T00:00:00.000Z',
  };
};

describe('chronicleStats', () => {
  it('counts only what actually happened', () => {
    const stats = chronicleStats(season().fixtures);
    expect(stats.watchedTogether).toBe(2);
    expect(stats.totalWithScore).toBe(2);
    expect(stats.goals).toBe(7); // 3+2 and 1+1
    expect(stats.notes).toHaveLength(1);
    expect(stats.bestRated[0].id).toBe('m1');
  });
});

describe('buildChronicleHtml', () => {
  it('produces one self-contained page with no external references', () => {
    const html = buildChronicleHtml(season());
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('</html>');
    // A keepsake has to keep working offline in ten years: no scripts, no
    // external stylesheets, no remote images.
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link[^>]+href="http/i);
    expect(html).not.toMatch(/src="http/i);
  });

  it('carries the notes, the table, the bracket and the winner', () => {
    const html = buildChronicleHtml(season());
    expect(html).toContain('Kričali sme tak, že susedia klopali.');
    expect(html).toContain('Gól z polovice ihriska');
    expect(html).toContain('Alfa');
    expect(html).toContain('Kronika sezóny');
    expect(html).toContain('🏆'); // the champion banner
    expect(html).toContain('Rodinná tipovačka');
  });

  it('escapes text so a note can never break the page', () => {
    const state = season();
    state.fixtures[0].note = '<script>alert("nie")</script> & <b>tučné</b>';
    const html = buildChronicleHtml(state);
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });

  it('works on an empty season', () => {
    const empty = { ...season(), fixtures: [], ties: createEmptyBracket(), predictions: [] };
    const html = buildChronicleHtml(empty);
    expect(html).toContain('Kronika sezóny');
    expect(html).toContain('</html>');
  });
});
