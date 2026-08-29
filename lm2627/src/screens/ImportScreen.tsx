import { useRef, useState } from 'react';
import type { Route } from '../App';
import { useSeasonStore } from '../store/useSeasonStore';
import { parseFixtures } from '../lib/importParsers';
import { validateFixtures, type ValidationReport } from '../lib/validateFixtures';
import { generateDemoSchedule } from '../lib/demoSchedule';
import type { Fixture } from '../types';

export function ImportScreen({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const teams = useSeasonStore((s) => s.teams);
  const existing = useSeasonStore((s) => s.fixtures);
  const isDemo = useSeasonStore((s) => s.fixturesAreDemo);
  const replaceFixtures = useSeasonStore((s) => s.replaceFixtures);
  const clearFixtures = useSeasonStore((s) => s.clearFixtures);

  const [text, setText] = useState('');
  const [pending, setPending] = useState<Fixture[] | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const check = (raw: string) => {
    setError(null);
    setReport(null);
    setPending(null);
    const parsed = parseFixtures(raw, teams);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setPending(parsed.fixtures);
    setReport(validateFixtures(parsed.fixtures, teams));
  };

  const onFile = async (file: File) => {
    const content = await file.text();
    setText(content);
    check(content);
  };

  const makeDemo = () => {
    setBusy(true);
    setError(null);
    // Let the button paint before the generator runs.
    setTimeout(() => {
      const result = generateDemoSchedule(teams);
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      replaceFixtures(result.fixtures, true);
      onNavigate({ name: 'matchdays' });
    }, 10);
  };

  const errors = report?.issues.filter((i) => i.level === 'error') ?? [];
  const warnings = report?.issues.filter((i) => i.level === 'warning') ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h2 className="text-lg font-black">Import rozpisu zápasov</h2>
      <p className="text-sm muted">
        Rozpis 144 zápasov ligovej fázy nie je v aplikácii predvyplnený — stiahni si ho z
        uefa.com po žrebe a vlož ho sem ako JSON alebo CSV. Skôr než sa uloží, prejde
        validátorom.
      </p>

      <div className="card space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            📂 Vybrať súbor
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,.csv,.txt,application/json,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
          <button
            type="button"
            className="btn"
            disabled={!text.trim()}
            onClick={() => check(text)}
          >
            ✅ Skontrolovať
          </button>
        </div>

        <label className="block text-sm font-bold" htmlFor="fixtures-input">
          …alebo sem vlož obsah
        </label>
        <textarea
          id="fixtures-input"
          className="input min-h-[9rem] py-2 font-mono text-xs"
          placeholder={'[{"matchday":1,"date":"2026-09-08T19:00:00Z","homeId":"psg","awayId":"slovan"}]'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => e.target.value.trim() && check(e.target.value)}
        />
      </div>

      {error ? (
        <p className="card text-sm" style={{ borderColor: '#b91c1c', color: '#fca5a5' }}>
          {error}
        </p>
      ) : null}

      {report ? (
        <div className="card space-y-2">
          <h3 className="font-black">
            {report.ok ? '✅ Rozpis je v poriadku' : '❌ Rozpis nesedí'}
          </h3>
          <p className="text-sm muted">
            {report.counts.fixtures} zápasov · {report.counts.teamsSeen} tímov ·{' '}
            {Object.keys(report.counts.perMatchday).length} kôl
          </p>

          {errors.length ? (
            <details open>
              <summary className="cursor-pointer font-bold" style={{ color: '#fca5a5' }}>
                {errors.length} chýb
              </summary>
              <ul className="mt-1 max-h-56 space-y-1 overflow-y-auto text-sm">
                {errors.map((issue, i) => (
                  <li key={i}>• {issue.message}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {warnings.length ? (
            <details>
              <summary className="cursor-pointer font-bold" style={{ color: '#fcd34d' }}>
                {warnings.length} upozornení
              </summary>
              <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-sm">
                {warnings.map((issue, i) => (
                  <li key={i}>• {issue.message}</li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!pending || !report.ok}
              onClick={() => {
                if (!pending) return;
                replaceFixtures(pending, false);
                onNavigate({ name: 'matchdays' });
              }}
            >
              Uložiť rozpis
            </button>
            {!report.ok && pending?.length ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  replaceFixtures(pending, false);
                  onNavigate({ name: 'matchdays' });
                }}
              >
                Uložiť aj tak (neúplný rozpis)
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="card space-y-2">
        <h3 className="font-black">Ukážkový rozpis</h3>
        <p className="text-sm muted">
          Kým UEFA rozpis nezverejní, môžeš si appku vyskúšať na <strong>vymyslenom</strong>{' '}
          rozpise. Dodržiava pravidlá žrebu (144 zápasov, 8 na tím, 4 doma + 4 vonku, 2 súperi
          z každého koša), ale <strong>nie sú to skutočné zápasy</strong>. Appka ti to bude
          všade pripomínať a jedným klikom to zmažeš.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={makeDemo} disabled={busy}>
            {busy ? 'Generujem…' : '🎲 Vygenerovať ukážkový rozpis'}
          </button>
          {existing.length ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (confirm('Naozaj vymazať celý rozpis aj so zapísanými výsledkami?')) {
                  clearFixtures();
                }
              }}
            >
              🗑️ Vymazať rozpis {isDemo ? '(ukážkový)' : ''}
            </button>
          ) : null}
        </div>
      </div>

      <details className="card">
        <summary className="cursor-pointer font-black">Aký formát appka očakáva?</summary>
        <div className="mt-2 space-y-2 text-sm muted">
          <p>JSON — pole objektov:</p>
          <pre className="surface-2 overflow-x-auto rounded-xl p-2 text-xs">{`[
  {
    "matchday": 1,
    "date": "2026-09-08T19:00:00Z",
    "homeId": "psg",
    "awayId": "slovan"
  }
]`}</pre>
          <p>CSV — hlavička a riadky:</p>
          <pre className="surface-2 overflow-x-auto rounded-xl p-2 text-xs">{`matchday,date,homeId,awayId
1,2026-09-08T19:00:00Z,psg,slovan`}</pre>
          <p>
            Namiesto <code>id</code> tímu môžeš použiť aj skratku (<code>PSG</code>) alebo celý
            názov. Ak už poznáš výsledok, pridaj stĺpce <code>homeScore</code> a{' '}
            <code>awayScore</code>.
          </p>
        </div>
      </details>
    </div>
  );
}
