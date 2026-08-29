import type { Fixture, KnockoutTie, SeasonState, StandingRow, Team } from '../types';
import { computeStandings } from './standings';
import { resolveTie } from './bracket';
import { leaderboard, scoreAll } from './scoring';
import { ROUND_LABELS } from '../config/calendar';
import { BANDS } from '../config/rules';

export type ChronicleStats = {
  watchedTogether: number;
  totalWithScore: number;
  goals: number;
  bestRated: Fixture[];
  notes: Fixture[];
  photos: number;
};

export function chronicleStats(fixtures: Fixture[]): ChronicleStats {
  const withScore = fixtures.filter((f) => f.score);
  return {
    watchedTogether: fixtures.filter((f) => f.watchedTogether).length,
    totalWithScore: withScore.length,
    goals: withScore.reduce((sum, f) => sum + (f.score!.home + f.score!.away), 0),
    bestRated: fixtures
      .filter((f) => f.rating)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 10),
    notes: fixtures.filter((f) => (f.note ?? '').trim() || (f.momentOfMatch ?? '').trim()),
    photos: fixtures.filter((f) => f.photoDataUrl).length,
  };
}

/**
 * Builds a single self-contained HTML page — no scripts, no external files,
 * photos inlined. Open it and print to PDF; it should still work in ten years.
 */
export function buildChronicleHtml(state: SeasonState): string {
  const { teams, fixtures, ties, profiles, predictions } = state;
  const name = (id?: string) => teams.find((t) => t.id === id)?.name ?? '—';
  const stats = chronicleStats(fixtures);
  const table = computeStandings(teams, fixtures);
  const results = scoreAll(teams, fixtures, predictions);
  const board = leaderboard(profiles, results);
  const champion = ties.find((t) => t.round === 'F')?.winnerId;

  return `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kronika sezóny — Liga majstrov 2026/27</title>
<style>
  :root { --ink:#12182b; --muted:#5a6480; --line:#d9dfec; --gold:#b8860b; }
  * { box-sizing: border-box; }
  body { margin:0; font:16px/1.6 Georgia, 'Times New Roman', serif; color:var(--ink); background:#fbfaf7; }
  .page { max-width: 900px; margin:0 auto; padding: 40px 24px 64px; }
  h1 { font-size: 2.4rem; margin:0 0 4px; letter-spacing:-0.5px; }
  h2 { font-size:1.4rem; margin:36px 0 10px; border-bottom:2px solid var(--line); padding-bottom:6px; }
  h3 { font-size:1.05rem; margin:18px 0 6px; }
  .sub { color:var(--muted); font-style:italic; margin:0 0 24px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; }
  .stat { border:1px solid var(--line); border-radius:10px; padding:12px; text-align:center; background:#fff; }
  .stat b { display:block; font-size:1.9rem; line-height:1.1; }
  .stat span { color:var(--muted); font-size:.8rem; }
  table { width:100%; border-collapse:collapse; font-size:.86rem; }
  th, td { padding:4px 6px; border-bottom:1px solid var(--line); text-align:left; }
  td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; }
  .band { display:inline-block; width:6px; height:12px; border-radius:2px; margin-right:6px; vertical-align:-1px; }
  .entry { border:1px solid var(--line); border-radius:10px; padding:12px; margin:10px 0; background:#fff; break-inside:avoid; }
  .entry .meta { color:var(--muted); font-size:.8rem; }
  .entry img { max-width:100%; border-radius:8px; margin-top:8px; }
  .moment { font-style:italic; color:var(--gold); }
  .bracket { font-size:.85rem; }
  .bracket li { margin:2px 0; }
  ul { padding-left:20px; }
  .champion { text-align:center; font-size:1.6rem; padding:20px; border:3px double var(--gold); border-radius:14px; margin:20px 0; }
  footer { margin-top:48px; color:var(--muted); font-size:.78rem; text-align:center; }
  @media print { body { background:#fff; } .page { padding:0; } .entry, .stat { break-inside:avoid; } }
</style>
</head>
<body>
<div class="page">
  <h1>Kronika sezóny</h1>
  <p class="sub">Liga majstrov 2026/27 — naša spoločná cesta od septembra po finále v Madride.</p>

  ${champion ? `<div class="champion">🏆 Víťaz: <strong>${esc(name(champion))}</strong></div>` : ''}

  <h2>Čísla sezóny</h2>
  <div class="grid">
    <div class="stat"><b>${stats.watchedTogether}</b><span>zápasov spolu</span></div>
    <div class="stat"><b>${stats.totalWithScore}</b><span>zapísaných zápasov</span></div>
    <div class="stat"><b>${stats.goals}</b><span>gólov</span></div>
    <div class="stat"><b>${stats.notes.length}</b><span>poznámok</span></div>
    <div class="stat"><b>${stats.photos}</b><span>fotiek</span></div>
  </div>

  ${board.some((r) => r.predictions > 0) ? `
  <h2>Rodinná tipovačka</h2>
  <table>
    <thead><tr><th>#</th><th>Kto</th><th class="num">Presne</th><th class="num">Víťaz</th><th class="num">Body</th></tr></thead>
    <tbody>
      ${board
        .map(
          (r) => `<tr><td>${r.rank}.</td><td>${esc(r.profile.avatarEmoji)} ${esc(r.profile.name)}</td>
          <td class="num">${r.exact}</td><td class="num">${r.outcome}</td><td class="num"><strong>${r.points}</strong></td></tr>`,
        )
        .join('')}
    </tbody>
  </table>` : ''}

  ${stats.bestRated.length ? `
  <h2>Najlepšie zápasy</h2>
  ${stats.bestRated
    .map(
      (f) => `<div class="entry">
      <strong>${esc(name(f.homeId))} ${f.score ? `${f.score.home}:${f.score.away}` : ''} ${esc(name(f.awayId))}</strong>
      <div class="meta">${f.matchday}. kolo · ${formatDate(f.date)} · ${'★'.repeat(f.rating ?? 0)}${'☆'.repeat(5 - (f.rating ?? 0))}</div>
      ${f.momentOfMatch ? `<p class="moment">„${esc(f.momentOfMatch)}"</p>` : ''}
      ${f.note ? `<p>${esc(f.note)}</p>` : ''}
      ${f.photoDataUrl ? `<img src="${f.photoDataUrl}" alt="Fotka zo zápasu">` : ''}
    </div>`,
    )
    .join('')}` : ''}

  ${stats.notes.length ? `
  <h2>Naše poznámky</h2>
  ${stats.notes
    .map(
      (f) => `<div class="entry">
      <strong>${esc(name(f.homeId))} ${f.score ? `${f.score.home}:${f.score.away}` : ''} ${esc(name(f.awayId))}</strong>
      <div class="meta">${f.matchday}. kolo · ${formatDate(f.date)}${f.watchedTogether ? ' · pozerali sme spolu' : ''}</div>
      ${f.momentOfMatch ? `<p class="moment">„${esc(f.momentOfMatch)}"</p>` : ''}
      ${f.note ? `<p>${esc(f.note)}</p>` : ''}
      ${f.photoDataUrl ? `<img src="${f.photoDataUrl}" alt="Fotka zo zápasu">` : ''}
    </div>`,
    )
    .join('')}` : ''}

  <h2>Konečná tabuľka ligovej fázy</h2>
  ${renderTable(table, teams)}

  <h2>Pavúk</h2>
  ${renderBracket(ties, name)}

  <footer>
    Vygenerované ${new Date().toLocaleString('sk-SK')} aplikáciou „Pavúk LM 26/27".
  </footer>
</div>
</body>
</html>`;
}

function renderTable(table: StandingRow[], teams: Team[]): string {
  const name = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const colour = (rank: number) =>
    rank <= BANDS.directR16.to ? '#22c55e' : rank <= BANDS.playoff.to ? '#eab308' : '#94a3b8';
  return `<table>
    <thead><tr><th>#</th><th>Tím</th><th class="num">Z</th><th class="num">V</th><th class="num">R</th><th class="num">P</th><th class="num">Skóre</th><th class="num">B</th></tr></thead>
    <tbody>${table
      .map(
        (r) => `<tr>
        <td><span class="band" style="background:${colour(r.rank)}"></span>${r.rank}</td>
        <td>${esc(name(r.teamId))}</td>
        <td class="num">${r.played}</td><td class="num">${r.won}</td><td class="num">${r.drawn}</td><td class="num">${r.lost}</td>
        <td class="num">${r.goalsFor}:${r.goalsAgainst}</td><td class="num"><strong>${r.points}</strong></td>
      </tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

function renderBracket(ties: KnockoutTie[], name: (id?: string) => string): string {
  const rounds: Array<KnockoutTie['round']> = ['PO', 'R16', 'QF', 'SF', 'F'];
  return rounds
    .map((round) => {
      const inRound = ties.filter((t) => t.round === round).sort((a, b) => a.slot - b.slot);
      if (!inRound.some((t) => t.teamAId || t.teamBId)) return '';
      return `<h3>${ROUND_LABELS[round]}</h3><ul class="bracket">${inRound
        .map((tie) => {
          const outcome = resolveTie(tie);
          const score = outcome.aggregate ? ` — ${outcome.aggregate.a}:${outcome.aggregate.b}` : '';
          const extra =
            outcome.decidedBy === 'penalties'
              ? ' (na penalty)'
              : outcome.decidedBy === 'extraTime'
                ? ' (po predĺžení)'
                : '';
          const winner = tie.winnerId ? ` → <strong>${esc(name(tie.winnerId))}</strong>` : '';
          return `<li>${esc(name(tie.teamAId))} – ${esc(name(tie.teamBId))}${score}${extra}${winner}</li>`;
        })
        .join('')}</ul>`;
    })
    .join('');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const formatDate = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : new Date(t).toLocaleDateString('sk-SK');
};
