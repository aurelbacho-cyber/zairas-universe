import type { EarnedBadge, Fixture, KnockoutTie, Profile, SeasonPrediction } from '../types';
import type { PredictionResult } from './scoring';
import { matchdayPoints } from './scoring';
import { LEAGUE_PHASE } from '../config/rules';
import { resolveTie } from './bracket';

export type BadgeContext = {
  profiles: Profile[];
  fixtures: Fixture[];
  ties: KnockoutTie[];
  results: PredictionResult[];
  seasonPredictions: SeasonPrediction[];
  favouriteTeamId?: string;
};

/**
 * Evaluates every achievement for every profile. Badges are cumulative: once
 * earned they stay earned, so this only ever adds.
 */
export function evaluateBadges(ctx: BadgeContext): EarnedBadge[] {
  const now = new Date().toISOString();
  const earned: EarnedBadge[] = [];
  const award = (badgeId: string, userId: string) => earned.push({ badgeId, userId, earnedAt: now });

  const watched = ctx.fixtures.filter((f) => f.watchedTogether);
  const finalists = new Set(
    ctx.ties
      .filter((t) => t.round === 'F')
      .flatMap((t) => [t.teamAId, t.teamBId])
      .filter((id): id is string => !!id),
  );

  for (const profile of ctx.profiles) {
    const mine = ctx.results.filter((r) => r.userId === profile.id);

    if (mine.some((r) => r.kind === 'exact')) award('first-exact', profile.id);

    if (watched.length >= 10) award('ten-together', profile.id);

    // All eight league-phase matches of the favourite team watched together.
    const favourite = profile.favouriteTeamId ?? ctx.favouriteTeamId;
    if (favourite) {
      const theirs = ctx.fixtures.filter(
        (f) => f.homeId === favourite || f.awayId === favourite,
      );
      if (
        theirs.length === LEAGUE_PHASE.matchesPerTeam &&
        theirs.every((f) => f.watchedTogether)
      ) {
        award('all-favourite-matches', profile.id);
      }
    }

    // Season prediction: did their pick reach the final?
    const seasonPick = ctx.seasonPredictions.find((p) => p.userId === profile.id);
    const picks = [seasonPick?.winnerId, ...(seasonPick?.finalistIds ?? [])].filter(Boolean);
    if (picks.some((id) => id && finalists.has(id))) award('picked-finalist', profile.id);

    // Top of a matchday.
    for (let md = 1; md <= LEAGUE_PHASE.matchdays; md++) {
      const points = matchdayPoints(ctx.results, ctx.fixtures, md);
      if (points.size < 2) continue;
      const best = Math.max(...points.values());
      if (best > 0 && points.get(profile.id) === best) {
        award('matchday-champion', profile.id);
        break;
      }
    }

    // Predicted every match of some matchday.
    for (let md = 1; md <= LEAGUE_PHASE.matchdays; md++) {
      const ids = new Set(ctx.fixtures.filter((f) => f.matchday === md).map((f) => f.id));
      if (!ids.size) continue;
      const covered = mine.filter((r) => ids.has(r.fixtureId)).length;
      if (covered === ids.size) {
        award('perfect-matchday', profile.id);
        break;
      }
    }

    // Shared, family-wide achievements are awarded to everyone.
    if (ctx.fixtures.some((f) => f.score && f.score.home + f.score.away >= 6)) {
      award('goal-fest', profile.id);
    }
    if (ctx.fixtures.some((f) => f.rating === 5)) award('five-stars', profile.id);
    if (ctx.ties.some((t) => resolveTie(t).decidedBy === 'penalties')) {
      award('penalty-drama', profile.id);
    }
    if (ctx.fixtures.filter((f) => (f.note ?? '').trim().length > 0).length >= 20) {
      award('chronicler', profile.id);
    }
  }

  return earned;
}
