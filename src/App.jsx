import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Menu } from 'lucide-react';
import ReaderLayout from './components/ReaderLayout.jsx';
import SettingsMenu from './components/SettingsMenu.jsx';
import ChapterSelector from './components/ChapterSelector.jsx';
import { chapters, languageOptions } from './data/scriptureData.js';

const preferenceKey = 'bilingual-bom-reader-preferences';

const defaultPreferences = {
  theme: 'light',
  pane1Language: 'eng',
  pane2Language: 'spa',
  japaneseFurigana: false,
  book: '1 Nephi',
  chapter: 1,
};

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey));
    const preferences = { ...defaultPreferences, ...saved };
    if (preferences.pane1Language === 'jpn_furigana') {
      preferences.pane1Language = 'jpn';
      preferences.japaneseFurigana = true;
    }
    if (preferences.pane2Language === 'jpn_furigana') {
      preferences.pane2Language = 'jpn';
      preferences.japaneseFurigana = true;
    }
    return preferences;
  } catch {
    return defaultPreferences;
  }
}

export default function App() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookMenuOpen, setBookMenuOpen] = useState(false);

  const currentChapter = useMemo(() => {
    return (
      chapters.find(
        (chapter) =>
          chapter.book === preferences.book && chapter.chapter === Number(preferences.chapter),
      ) ?? chapters[0]
    );
  }, [preferences.book, preferences.chapter]);

  const currentChapterIndex = useMemo(() => {
    return chapters.findIndex(
      (chapter) =>
        chapter.book === currentChapter.book && chapter.chapter === Number(currentChapter.chapter),
    );
  }, [currentChapter]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    localStorage.setItem(preferenceKey, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const navigateToChapter = (direction) => {
    const nextIndex = currentChapterIndex + direction;
    if (nextIndex < 0 || nextIndex >= chapters.length) return;

    const nextChapter = chapters[nextIndex];
    setPreferences((current) => ({
      ...current,
      book: nextChapter.book,
      chapter: nextChapter.chapter,
    }));
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="book-menu-wrap">
          <button
            className="brand-icon"
            type="button"
            aria-label="Open book navigation"
            aria-expanded={bookMenuOpen}
            onClick={() => setBookMenuOpen((open) => !open)}
          >
            <BookOpen aria-hidden="true" />
          </button>
          <div className={`book-menu ${bookMenuOpen ? 'is-open' : ''}`}>
            <div className="book-menu-title">
              <strong>Bilingual Book of Mormon Reader</strong>
              <span>{currentChapter.book} {currentChapter.chapter}</span>
            </div>
            <ChapterSelector
              chapters={chapters}
              selectedBook={preferences.book}
              selectedChapter={preferences.chapter}
              onBookChange={(book) => {
                updatePreference('book', book);
                updatePreference('chapter', 1);
                setBookMenuOpen(false);
              }}
              onChapterChange={(chapter) => {
                updatePreference('chapter', Number(chapter));
                setBookMenuOpen(false);
              }}
            />
          </div>
        </div>

        <div className="current-reference" aria-label="Current chapter">
          {currentChapter.book} {currentChapter.chapter}
        </div>

        <button
          className="icon-button"
          type="button"
          aria-label="Open settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Menu aria-hidden="true" />
        </button>
      </header>

      <main className="reader-main">
        <ReaderLayout
          chapter={currentChapter}
          pane1Language={preferences.pane1Language}
          pane2Language={preferences.pane2Language}
          languageOptions={languageOptions}
          japaneseFurigana={preferences.japaneseFurigana}
          onNextChapter={() => navigateToChapter(1)}
          onPreviousChapter={() => navigateToChapter(-1)}
        />
      </main>

      <footer className="reader-footer">
        Unofficial study tool. Not affiliated with The Church of Jesus Christ of Latter-day Saints.
      </footer>

      <SettingsMenu
        open={settingsOpen}
        preferences={preferences}
        languageOptions={languageOptions}
        onChange={updatePreference}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
