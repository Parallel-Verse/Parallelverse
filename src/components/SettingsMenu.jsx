import { Moon, PanelRightClose, Sun, Sunset } from 'lucide-react';

const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'sepia', label: 'Sepia', icon: Sunset },
];

const scrollModes = [
  { value: 'native', label: 'Native', detail: 'One shared scroll' },
  { value: 'synced', label: 'Synced', detail: 'Split panes' },
];

export default function SettingsMenu({
  open,
  preferences,
  languageOptions,
  visitCount,
  onChange,
  onClose,
}) {
  const showPane1FuriganaToggle = preferences.pane1Language === 'jpn';
  const showPane2FuriganaToggle = preferences.pane2Language === 'jpn';

  const furiganaToggle = (paneLabel, preferenceKey) => (
    <label className="toggle-setting">
      <span>{paneLabel} furigana</span>
      <input
        type="checkbox"
        checked={Boolean(preferences[preferenceKey])}
        onChange={(event) => onChange(preferenceKey, event.target.checked)}
      />
    </label>
  );

  return (
    <div className={`settings-layer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <button className="settings-scrim" type="button" aria-label="Close settings" onClick={onClose} />
      <aside className="settings-panel" aria-label="Reader settings" aria-modal="true" role="dialog">
        <div className="settings-header">
          <div>
            <span>Reader</span>
            <h2>Settings</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close settings" onClick={onClose}>
            <PanelRightClose aria-hidden="true" />
          </button>
        </div>

        <section className="setting-group theme-setting" aria-labelledby="theme-title">
          <h3 id="theme-title">Theme</h3>
          <div className="theme-options">
            {themes.map((theme) => {
              const Icon = theme.icon;
              return (
                <button
                  className={preferences.theme === theme.value ? 'is-selected' : ''}
                  type="button"
                  key={theme.value}
                  onClick={() => onChange('theme', theme.value)}
                >
                  <Icon aria-hidden="true" />
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="setting-group language-setting" aria-labelledby="language-title">
          <h3 id="language-title">Languages</h3>
          <label>
            <span>Pane 1</span>
            <select
              value={preferences.pane1Language}
              onChange={(event) => onChange('pane1Language', event.target.value)}
            >
              {languageOptions.map((language) => (
                <option key={language.code} value={language.code} disabled={language.disabled}>
                  {language.name}
                </option>
              ))}
            </select>
          </label>
          {showPane1FuriganaToggle && furiganaToggle('Pane 1', 'pane1JapaneseFurigana')}

          <label>
            <span>Pane 2</span>
            <select
              value={preferences.pane2Language}
              onChange={(event) => onChange('pane2Language', event.target.value)}
            >
              {languageOptions.map((language) => (
                <option key={language.code} value={language.code} disabled={language.disabled}>
                  {language.name}
                </option>
              ))}
            </select>
          </label>
          {showPane2FuriganaToggle && furiganaToggle('Pane 2', 'pane2JapaneseFurigana')}
        </section>

        <section className="setting-group scroll-setting" aria-labelledby="scroll-title">
          <h3 id="scroll-title">Scroll</h3>
          <div className="scroll-options">
            {scrollModes.map((mode) => (
              <button
                className={preferences.scrollMode === mode.value ? 'is-selected' : ''}
                type="button"
                key={mode.value}
                onClick={() => onChange('scrollMode', mode.value)}
              >
                <span>{mode.label}</span>
                <small>{mode.detail}</small>
              </button>
            ))}
          </div>
        </section>

        <p className="settings-disclaimer">
          Unofficial study tool. Not affiliated with The Church of Jesus Christ of Latter-day Saints.
        </p>

        <div className="visit-counter" aria-label="Total website visits">
          <span>Website visits</span>
          <strong>{visitCount === null ? 'Unavailable' : visitCount.toLocaleString()}</strong>
        </div>
      </aside>
    </div>
  );
}
