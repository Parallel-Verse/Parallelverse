import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Flag, Menu } from 'lucide-react';
import ReaderLayout from './components/ReaderLayout.jsx';
import SettingsMenu from './components/SettingsMenu.jsx';
import ChapterSelector from './components/ChapterSelector.jsx';
import { chapters, languageOptions } from './data/scriptureData.js';

const preferenceKey = 'bilingual-bom-reader-preferences';
const bookmarkKey = 'parallel-verse-bookmark';
const visitCounterUrl =
  'https://countapi.mileshilliard.com/api/v1/hit/parallelverse_github_io_total_visits';

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

function readBookmark() {
  try {
    const saved = JSON.parse(localStorage.getItem(bookmarkKey));
    if (!saved?.book || !saved?.chapter) return null;
    return {
      book: saved.book,
      chapter: Number(saved.chapter),
      verse: Number(saved.verse) || 1,
    };
  } catch {
    return null;
  }
}

export default function App() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookMenuOpen, setBookMenuOpen] = useState(false);
  const [visitCount, setVisitCount] = useState(null);
  const [bookmark, setBookmark] = useState(readBookmark);
  const [currentVerse, setCurrentVerse] = useState(1);
  const [scrollToVerseRequest, setScrollToVerseRequest] = useState(null);

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

  useEffect(() => {
    setCurrentVerse(1);
  }, [currentChapter.book, currentChapter.chapter]);

  useEffect(() => {
    let ignore = false;

    fetch(visitCounterUrl)
      .then((response) => {
        if (!response.ok) throw new Error('Visit counter request failed.');
        return response.json();
      })
      .then((data) => {
        const count = Number(data.value);
        if (!ignore && Number.isFinite(count)) setVisitCount(count);
      })
      .catch(() => {
        if (!ignore) setVisitCount(null);
      });

    return () => {
      ignore = true;
    };
  }, []);

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
    setScrollToVerseRequest(null);
  };

  const saveBookmark = () => {
    const nextBookmark = {
      book: currentChapter.book,
      chapter: currentChapter.chapter,
      verse: currentVerse,
    };
    localStorage.setItem(bookmarkKey, JSON.stringify(nextBookmark));
    setBookmark(nextBookmark);
  };

  const goToBookmark = () => {
    if (!bookmark) return;
    setPreferences((current) => ({
      ...current,
      book: bookmark.book,
      chapter: bookmark.chapter,
    }));
    setScrollToVerseRequest({
      book: bookmark.book,
      chapter: bookmark.chapter,
      verse: bookmark.verse,
      id: Date.now(),
    });
    setBookMenuOpen(false);
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
            <div className="bookmark-row">
              <button
                className="bookmark-save"
                type="button"
                aria-label={`Bookmark ${currentChapter.book} ${currentChapter.chapter}:${currentVerse}`}
                onClick={saveBookmark}
              >
                <Flag aria-hidden="true" />
              </button>
              <button
                className="bookmark-jump"
                type="button"
                disabled={!bookmark}
                onClick={goToBookmark}
              >
                {bookmark ? `${bookmark.book} ${bookmark.chapter}:${bookmark.verse}` : 'No bookmark set'}
              </button>
            </div>
            <ChapterSelector
              chapters={chapters}
              selectedBook={preferences.book}
              selectedChapter={preferences.chapter}
              onBookChange={(book) => {
                updatePreference('book', book);
                updatePreference('chapter', 1);
                setScrollToVerseRequest(null);
                setBookMenuOpen(false);
              }}
              onChapterChange={(chapter) => {
                updatePreference('chapter', Number(chapter));
                setScrollToVerseRequest(null);
                setBookMenuOpen(false);
              }}
            />
          </div>
        </div>

        <button
          className="current-reference"
          type="button"
          aria-label="Open book and chapter navigation"
          aria-expanded={bookMenuOpen}
          onClick={() => setBookMenuOpen((open) => !open)}
        >
          {currentChapter.book} {currentChapter.chapter}
        </button>

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
          onOpenSettings={() => setSettingsOpen(true)}
          onActiveVerseChange={setCurrentVerse}
          scrollToVerseRequest={scrollToVerseRequest}
        />
      </main>

      <SettingsMenu
        open={settingsOpen}
        preferences={preferences}
        languageOptions={languageOptions}
        visitCount={visitCount}
        onChange={updatePreference}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
