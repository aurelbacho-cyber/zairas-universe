import { useRef, useState } from 'react';
import type { Route } from '../App';
import { useSeasonStore } from '../store/useSeasonStore';
import { useActiveProfile, useSeasonSnapshot } from '../store/selectors';
import { backupFilename, buildBackup, downloadText, parseBackup } from '../lib/backup';
import { calendarSkeletonIcs, fixturesToIcs } from '../lib/ics';
import { requestPermission } from '../lib/notifications';
import { NOTIFY_MINUTES_BEFORE } from '../config/rules';

const AVATARS = ['🧔', '🧒', '👩', '👦', '👧', '🦊', '🐻', '🦁', '🐼', '🚀'];

export function SettingsScreen({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const settings = useSeasonStore((s) => s.settings);
  const patchSettings = useSeasonStore((s) => s.patchSettings);
  const profiles = useSeasonStore((s) => s.profiles);
  const teams = useSeasonStore((s) => s.teams);
  const fixtures = useSeasonStore((s) => s.fixtures);
  const addProfile = useSeasonStore((s) => s.addProfile);
  const updateProfile = useSeasonStore((s) => s.updateProfile);
  const removeProfile = useSeasonStore((s) => s.removeProfile);
  const importState = useSeasonStore((s) => s.importState);
  const restore = useSeasonStore((s) => s.restoreFromHistory);
  const history = useSeasonStore((s) => s.history);
  const state = useSeasonSnapshot();
  const profile = useActiveProfile();

  const [newName, setNewName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h2 className="text-lg font-black">Nastavenia</h2>

      <section className="card space-y-3">
        <h3 className="font-black">Vzhľad</h3>
        <Toggle
          label="Tmavý režim"
          hint="Predvolený je tmavý."
          checked={settings.theme === 'dark'}
          onChange={(v) => patchSettings({ theme: v ? 'dark' : 'light' })}
        />
        <Toggle
          label="🧒 Detský režim"
          hint="Väčšie písmo, väčšie tlačidlá, konfety pri góle nášho tímu."
          checked={settings.kidMode}
          onChange={(kidMode) => patchSettings({ kidMode })}
        />
        <Toggle
          label="🔊 Zvuky"
          hint="Zvuk pri góle obľúbeného tímu."
          checked={settings.soundOn}
          onChange={(soundOn) => patchSettings({ soundOn })}
        />
      </section>

      <section className="card space-y-2">
        <h3 className="font-black">Profily</h3>
        <ul className="space-y-2">
          {profiles.map((p) => (
            <li key={p.id} className="surface-2 rounded-xl p-2">
              <div className="flex items-center gap-2">
                <select
                  className="input w-16 px-1 text-center text-xl"
                  aria-label={`Avatar pre ${p.name}`}
                  value={p.avatarEmoji}
                  onChange={(e) => updateProfile(p.id, { avatarEmoji: e.target.value })}
                >
                  {[...new Set([p.avatarEmoji, ...AVATARS])].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <input
                  className="input flex-1"
                  aria-label={`Meno profilu ${p.name}`}
                  value={p.name}
                  onChange={(e) => updateProfile(p.id, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="btn text-sm"
                  aria-pressed={settings.activeProfileId === p.id}
                  style={
                    settings.activeProfileId === p.id
                      ? { borderColor: 'var(--app-accent)', color: 'var(--app-accent)' }
                      : undefined
                  }
                  onClick={() => patchSettings({ activeProfileId: p.id })}
                >
                  Aktívny
                </button>
              </div>
              <label className="mt-2 block text-xs font-bold">
                Obľúbený tím
                <select
                  className="input mt-1"
                  value={p.favouriteTeamId ?? ''}
                  onChange={(e) => updateProfile(p.id, { favouriteTeamId: e.target.value || undefined })}
                >
                  <option value="">— žiadny —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              {profiles.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-ghost mt-2 text-xs"
                  onClick={() => {
                    if (confirm(`Zmazať profil ${p.name} aj so všetkými tipmi?`)) removeProfile(p.id);
                  }}
                >
                  Zmazať profil
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <select
            className="input w-16 px-1 text-center text-xl"
            aria-label="Avatar nového profilu"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
          >
            {AVATARS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <input
            className="input flex-1"
            placeholder="Meno nového profilu"
            aria-label="Meno nového profilu"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="button"
            className="btn"
            disabled={!newName.trim()}
            onClick={() => {
              addProfile(newName.trim(), avatar);
              setNewName('');
            }}
          >
            Pridať
          </button>
        </div>
      </section>

      <section className="card space-y-2">
        <h3 className="font-black">Rozpis zápasov</h3>
        <p className="text-sm muted">Načítaných {fixtures.length} zápasov.</p>
        <button type="button" className="btn" onClick={() => onNavigate({ name: 'import' })}>
          📥 Import rozpisu
        </button>
      </section>

      <section className="card space-y-2">
        <h3 className="font-black">📅 Kalendár a upozornenia</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn text-sm"
            onClick={() => downloadText('lm-2627-kola.ics', calendarSkeletonIcs(), 'text/calendar')}
          >
            Termíny kôl (.ics)
          </button>
          <button
            type="button"
            className="btn text-sm"
            disabled={!profile?.favouriteTeamId || !fixtures.length}
            onClick={() =>
              downloadText(
                `lm-2627-${profile!.favouriteTeamId}.ics`,
                fixturesToIcs(fixtures, teams, profile!.favouriteTeamId),
                'text/calendar',
              )
            }
          >
            Zápasy môjho tímu (.ics)
          </button>
        </div>
        <Toggle
          label="🔔 Upozornenie pred zápasom"
          hint={`${NOTIFY_MINUTES_BEFORE} minút pred výkopom zápasu obľúbeného tímu, kým je appka otvorená.`}
          checked={settings.notificationsEnabled}
          onChange={async (v) => {
            if (!v) return patchSettings({ notificationsEnabled: false });
            const granted = await requestPermission();
            patchSettings({ notificationsEnabled: granted });
            if (!granted) alert('Prehliadač upozornenia nepovolil.');
          }}
        />
      </section>

      <section className="card space-y-2">
        <h3 className="font-black">🛟 Bezpečnosť dát</h3>
        <p className="text-sm muted">
          Všetko je uložené len v tomto zariadení. Zálohu si občas urob — je to jediná poistka.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            onClick={() =>
              downloadText(backupFilename(), JSON.stringify(buildBackup(state), null, 2))
            }
          >
            ⬇️ Exportovať sezónu
          </button>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            ⬆️ Importovať zálohu
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const parsed = parseBackup(await file.text());
              if (!parsed.ok) return setImportError(parsed.error);
              if (confirm('Nahradiť súčasné dáta obsahom zálohy?')) {
                importState(parsed.state);
                setImportError(null);
                onNavigate({ name: 'matchdays' });
              }
            }}
          />
        </div>
        {importError ? (
          <p className="text-sm" style={{ color: '#fca5a5' }}>
            {importError}
          </p>
        ) : null}

        <details>
          <summary className="cursor-pointer text-sm font-bold">
            História posledných {history.length} zmien
          </summary>
          <ul className="mt-2 space-y-1 text-sm">
            {history.map((h) => (
              <li key={h.savedAt} className="surface-2 flex items-center gap-2 rounded-xl p-2">
                <span className="min-w-0 flex-1 truncate">
                  {h.label}
                  <span className="ml-2 text-xs muted">
                    {new Date(h.savedAt).toLocaleString('sk-SK')}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost h-8 min-h-0 px-2 text-xs"
                  onClick={() => {
                    if (confirm('Vrátiť sa k tomuto stavu?')) restore(h.savedAt);
                  }}
                >
                  Vrátiť
                </button>
              </li>
            ))}
            {!history.length ? <li className="muted">Zatiaľ žiadne zmeny.</li> : null}
          </ul>
        </details>
      </section>

      <section className="card text-xs muted">
        <p>
          Pavúk LM 26/27 — všetko beží lokálne, bez prihlasovania a bez servera. Rozpis
          zápasov a klubové erby nie sú súčasťou appky; farby tímov sú približné a dajú sa
          zmeniť v <code>src/data/teams.json</code>.
        </p>
      </section>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        className="mt-1 h-6 w-6 shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-bold">{label}</span>
        {hint ? <span className="block text-xs muted">{hint}</span> : null}
      </span>
    </label>
  );
}
