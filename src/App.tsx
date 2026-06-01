import { type CSSProperties, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Library, Menu, Moon, Search, Sun, Type, X } from 'lucide-react';
import { catalog, languageNames, type BookCatalogItem, type LanguageCode } from './data/catalog';

type Theme = 'light' | 'dark' | 'sepia';
type ReaderMode = 'synced' | 'merged';
type PaneId = 'pane1' | 'pane2';
type TextLanguageCode = LanguageCode | 'ja-furigana';

const snapDelayMs = 90;

type Section = {
  sectionId: string;
  text: string;
  html?: string;
  unit?: number;
  needsReview?: boolean;
};

type Chapter = {
  chapterId: string;
  chapter?: number;
  title: string;
  sections: Section[];
};

type BookText = {
  bookId: string;
  title: string;
  author: string;
  language: TextLanguageCode;
  source: string | { name: string; url: string; licenseNote: string };
  chapters: Chapter[];
};

type RawBookText = {
  bookId: string;
  title: string;
  author: string;
  language: TextLanguageCode;
  source: BookText['source'];
  chapters: Array<{
    chapterId?: string;
    chapter?: number;
    title: string;
    sections?: Section[];
    units?: Array<{ unit: number; syncId: string; text: string; html?: string; needsReview?: boolean }>;
  }>;
};

type Preferences = {
  theme: Theme;
  readerMode: ReaderMode;
  fontSize: number;
  language1: LanguageCode;
  language2: LanguageCode;
  lastBook: string;
  lastChapter: string;
  showUnitNumbers: boolean;
  showJapaneseFurigana: boolean;
};

const bookTextModules = import.meta.glob(['./data/books/**/*.json', '!./data/books/alice.*.json'], {
  eager: true,
  import: 'default',
}) as Record<string, RawBookText>;

const bookTexts = Object.entries(bookTextModules)
  .sort(([pathA], [pathB]) => Number(pathA.includes('/alice/')) - Number(pathB.includes('/alice/')))
  .map(([, book]) => normalizeBookText(book));

const textByBook = bookTexts.reduce<Record<string, Record<string, BookText>>>((acc, book) => {
  acc[book.bookId] = acc[book.bookId] ?? {};
  acc[book.bookId][book.language] = book;
  return acc;
}, {});

const defaultPrefs: Preferences = {
  theme: 'sepia',
  readerMode: 'synced',
  fontSize: 18,
  language1: 'en',
  language2: 'fr',
  lastBook: catalog[0].bookId,
  lastChapter: 'chapter-1',
  showUnitNumbers: false,
  showJapaneseFurigana: false,
};

function readPreferences(): Preferences {
  try {
    return { ...defaultPrefs, ...JSON.parse(localStorage.getItem('parallel-classics-preferences') ?? '{}') };
  } catch {
    return defaultPrefs;
  }
}

function getBook(bookId: string) {
  return catalog.find((book) => book.bookId === bookId) ?? catalog[0];
}

function getText(bookId: string, language: LanguageCode, showJapaneseFurigana = false) {
  const translations = textByBook[bookId] ?? {};
  if (language === 'ja' && showJapaneseFurigana && translations['ja-furigana']) return translations['ja-furigana'];
  return translations[language] ?? translations.en ?? Object.values(translations)[0];
}

function getChapter(text: BookText | undefined, chapterId: string) {
  return text?.chapters.find((chapter) => chapter.chapterId === chapterId) ?? text?.chapters[0];
}

function galleryRows(books: BookCatalogItem[]) {
  const languageLearner = books.filter((book) => book.category === 'Language Learner Classics');
  const japanese = books.filter((book) => book.category === 'Japanese Classics');
  const french = books.filter((book) => book.languages.includes('fr'));
  const german = books.filter((book) => book.languages.includes('de'));

  return [
    ['Language Learner Classics', languageLearner],
    ['Japanese Classics', japanese],
    ['French Classics', french],
    ['German Classics', german],
  ].filter(([, items]) => items.length) as Array<[string, BookCatalogItem[]]>;
}

function normalizeBookText(book: RawBookText): BookText {
  return {
    bookId: book.bookId,
    title: book.title,
    author: book.author,
    language: book.language,
    source: book.source,
    chapters: book.chapters.map((chapter, index) => {
      const chapterNumber = chapter.chapter ?? index + 1;
      return {
        chapterId: chapter.chapterId ?? `chapter-${chapterNumber}`,
        chapter: chapterNumber,
        title: chapter.title,
        sections:
          chapter.units?.map((unit) => ({
            sectionId: unit.syncId,
            unit: unit.unit,
            text: unit.text,
            html: unit.html,
            needsReview: unit.needsReview,
          })) ??
          chapter.sections?.map((section, sectionIndex) => ({
            ...section,
            unit: section.unit ?? sectionIndex + 1,
          })) ??
          [],
      };
    }),
  };
}

export default function App() {
  const [view, setView] = useState<'gallery' | 'reader'>(() => (readPreferences().lastBook ? 'gallery' : 'gallery'));
  const [prefs, setPrefs] = useState<Preferences>(readPreferences);
  const [activeBookId, setActiveBookId] = useState(prefs.lastBook);
  const [query, setQuery] = useState('');
  const [galleryMenuOpen, setGalleryMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const syncLock = useRef<PaneId | null>(null);
  const releaseTimer = useRef<number | null>(null);
  const paneOneRef = useRef<HTMLDivElement | null>(null);
  const paneTwoRef = useRef<HTMLDivElement | null>(null);

  const activeBook = getBook(activeBookId);
  const availableLanguages = activeBook.languages;
  const language1 = availableLanguages.includes(prefs.language1) ? prefs.language1 : availableLanguages[0];
  const language2 = availableLanguages.includes(prefs.language2) ? prefs.language2 : availableLanguages[1] ?? availableLanguages[0];
  const textOne = getText(activeBookId, language1, prefs.showJapaneseFurigana);
  const textTwo = getText(activeBookId, language2, prefs.showJapaneseFurigana);
  const chapterId = textOne?.chapters.some((chapter) => chapter.chapterId === prefs.lastChapter)
    ? prefs.lastChapter
    : textOne?.chapters[0]?.chapterId ?? 'chapter-1';
  const chapterOne = getChapter(textOne, chapterId);
  const chapterTwo = getChapter(textTwo, chapterId);
  const filteredCatalog = useMemo(
    () =>
      catalog.filter((book) => {
        const haystack = `${book.category} ${book.title} ${book.originalTitle ?? ''} ${book.author} ${book.languages.map((language) => languageNames[language]).join(' ')}`;
        return haystack.toLowerCase().includes(query.toLowerCase());
      }),
    [query],
  );
  const catalogGroups = useMemo(() => galleryRows(filteredCatalog), [filteredCatalog]);

  useEffect(() => {
    localStorage.setItem(
      'parallel-classics-preferences',
      JSON.stringify({ ...prefs, language1, language2, lastBook: activeBookId, lastChapter: chapterId }),
    );
  }, [activeBookId, chapterId, language1, language2, prefs]);

  const openBook = (book: BookCatalogItem) => {
    setActiveBookId(book.bookId);
    setPrefs((current) => ({
      ...current,
      lastBook: book.bookId,
      lastChapter: getText(book.bookId, book.languages[0])?.chapters[0]?.chapterId ?? 'chapter-1',
      language1: book.languages[0],
      language2: book.languages[1] ?? book.languages[0],
    }));
    setView('reader');
    setGalleryMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    return () => {
      if (releaseTimer.current) window.clearTimeout(releaseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (prefs.readerMode !== 'synced') return undefined;

    let frame = window.requestAnimationFrame(() => {
      alignSyncedRows(paneOneRef.current, paneTwoRef.current);
    });

    const handleResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        alignSyncedRows(paneOneRef.current, paneTwoRef.current);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      resetSyncedRows(paneOneRef.current, paneTwoRef.current);
    };
  }, [chapterId, language1, language2, prefs.fontSize, prefs.readerMode, prefs.showJapaneseFurigana, prefs.showUnitNumbers]);

  const handlePaneScroll = (activePane: PaneId) => {
    if (syncLock.current && syncLock.current !== activePane) return;

    const source = activePane === 'pane1' ? paneOneRef.current : paneTwoRef.current;
    const target = activePane === 'pane1' ? paneTwoRef.current : paneOneRef.current;
    if (!source || !target) return;

    syncLock.current = activePane;
    syncPaneToSource(source, target);

    if (releaseTimer.current) window.clearTimeout(releaseTimer.current);
    releaseTimer.current = window.setTimeout(() => {
      target.style.scrollBehavior = 'auto';
      syncPaneToSource(source, target);
      syncLock.current = null;
    }, snapDelayMs);
  };

  return (
    <div className={`app theme-${prefs.theme}`}>
      {view === 'gallery' ? (
        <main className="gallery-shell">
          <header className="library-header">
            <button className="icon-button gallery-menu-button" type="button" onClick={() => setGalleryMenuOpen(true)} aria-label="Gallery menu">
              <Menu aria-hidden="true" />
            </button>
            <div className="library-title-block">
              <h1>PARALLEL CLASSICS</h1>
              <p>Timeless stories. Side by side.</p>
            </div>
            <div className="gallery-actions">
              <label className="search-box">
                <Search aria-hidden="true" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search library" />
              </label>
            </div>
          </header>

          <GalleryMenu
            open={galleryMenuOpen}
            theme={prefs.theme}
            onClose={() => setGalleryMenuOpen(false)}
            onThemeChange={(value) => setPrefs((current) => ({ ...current, theme: value }))}
          />

          <section className="gallery-sections" aria-label="Classic books">
            {catalogGroups.map(([category, books]) => (
              <section className="gallery-section" key={category} aria-label={category}>
                <h2>{category}</h2>
                <div className="book-grid" role="list">
                  {books.map((book) => (
                    <button key={`${category}-${book.bookId}`} className="book-card" onClick={() => openBook(book)} role="listitem">
                      <img src={book.cover} alt={`${book.title} cover`} />
                      <span className="book-card-copy">
                        <strong>{book.title}</strong>
                        {book.originalTitle && <span className="original-title">{book.originalTitle}</span>}
                        <small>{book.author}</small>
                        <span className="language-row" aria-label="Available languages">
                          {book.languages.map((language) => (
                            <span key={language}>{languageNames[language]}</span>
                          ))}
                        </span>
                        {book.hasFurigana && <span className="furigana-badge">Furigana available</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </section>

          <footer className="site-footer">
            Parallel Classics uses public-domain texts from public-domain sources such as Project Gutenberg.
          </footer>
        </main>
      ) : (
        <main className="reader-shell" style={{ '--reader-font-size': `${prefs.fontSize}px` } as CSSProperties}>
          <header className="reader-bar">
            <button className="icon-button" type="button" onClick={() => setView('gallery')} aria-label="Back to gallery">
              <ArrowLeft aria-hidden="true" />
            </button>
            <div className="reader-title">
              <strong>{activeBook.title}</strong>
              <small>{activeBook.author}</small>
            </div>
            <button className="icon-button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Reader settings">
              <Menu aria-hidden="true" />
            </button>
          </header>

          <ReaderSettings
            open={settingsOpen}
            chapterId={chapterId}
            chapters={textOne?.chapters ?? []}
            language1={language1}
            language2={language2}
            languages={availableLanguages}
            theme={prefs.theme}
            readerMode={prefs.readerMode}
            fontSize={prefs.fontSize}
            hasJapanese={availableLanguages.includes('ja')}
            onClose={() => setSettingsOpen(false)}
            onLibrary={() => {
              setSettingsOpen(false);
              setView('gallery');
            }}
            onChapterChange={(value) => setPrefs((current) => ({ ...current, lastChapter: value }))}
            onLanguage1Change={(value) => setPrefs((current) => ({ ...current, language1: value }))}
            onLanguage2Change={(value) => setPrefs((current) => ({ ...current, language2: value }))}
            onThemeChange={(value) => setPrefs((current) => ({ ...current, theme: value }))}
            onReaderModeChange={(value) => setPrefs((current) => ({ ...current, readerMode: value }))}
            onFontSizeChange={(value) => setPrefs((current) => ({ ...current, fontSize: value }))}
            showUnitNumbers={prefs.showUnitNumbers}
            onShowUnitNumbersChange={(value) => setPrefs((current) => ({ ...current, showUnitNumbers: value }))}
            showJapaneseFurigana={prefs.showJapaneseFurigana}
            onShowJapaneseFuriganaChange={(value) => setPrefs((current) => ({ ...current, showJapaneseFurigana: value }))}
          />

          {prefs.readerMode === 'merged' ? (
            <MergedReader
              chapterOne={chapterOne}
              chapterTwo={chapterTwo}
              languageOne={languageNames[language1]}
              languageTwo={languageNames[language2]}
              showUnitNumbers={prefs.showUnitNumbers}
            />
          ) : (
            <section className="reading-panes" aria-label="Parallel reading panes">
              <ReadingPane
                paneRef={paneOneRef}
                chapter={chapterOne}
                title={languageNames[language1]}
                showUnitNumbers={prefs.showUnitNumbers}
                renderHtml={language1 === 'ja' && prefs.showJapaneseFurigana}
                onOpenSettings={() => setSettingsOpen(true)}
                onScroll={() => handlePaneScroll('pane1')}
              />
              <ReadingPane
                paneRef={paneTwoRef}
                chapter={chapterTwo}
                title={languageNames[language2]}
                showUnitNumbers={prefs.showUnitNumbers}
                renderHtml={language2 === 'ja' && prefs.showJapaneseFurigana}
                onOpenSettings={() => setSettingsOpen(true)}
                onScroll={() => handlePaneScroll('pane2')}
              />
            </section>
          )}
        </main>
      )}
    </div>
  );
}

function GalleryMenu({
  open,
  theme,
  onClose,
  onThemeChange,
}: {
  open: boolean;
  theme: Theme;
  onClose: () => void;
  onThemeChange: (theme: Theme) => void;
}) {
  return (
    <section className={`gallery-menu-layer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <button
        className="gallery-menu-scrim"
        type="button"
        aria-label="Close gallery menu"
        onClick={onClose}
        style={{ opacity: open ? 1 : 0 }}
      />
      <aside
        className="gallery-menu-panel"
        aria-label="Gallery menu"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(-0.4rem)',
          transition: 'none',
        }}
      >
        <div className="settings-header">
          <div>
            <span>Library</span>
            <h2>Menu</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close menu">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="setting-group theme-setting">
          <h3>Theme</h3>
          <ThemeOptions theme={theme} onThemeChange={onThemeChange} />
        </div>

        <div className="setting-group about-section">
          <h3>About</h3>
          <p>
            Parallel Classics is a small reading project for studying public-domain literature in two languages at once.
            The reader aligns each chapter into short matching sections so translated texts can stay visually paired.
          </p>
        </div>

        <SupportProject />
      </aside>
    </section>
  );
}

function ThemeOptions({ theme, onThemeChange }: { theme: Theme; onThemeChange: (theme: Theme) => void }) {
  return (
    <div className="theme-options">
      <button type="button" className={theme === 'light' ? 'is-selected' : ''} onClick={() => onThemeChange('light')}>
        <Sun aria-hidden="true" />
        Light
      </button>
      <button type="button" className={theme === 'dark' ? 'is-selected' : ''} onClick={() => onThemeChange('dark')}>
        <Moon aria-hidden="true" />
        Dark
      </button>
      <button type="button" className={theme === 'sepia' ? 'is-selected' : ''} onClick={() => onThemeChange('sepia')}>
        <Library aria-hidden="true" />
        Sepia
      </button>
    </div>
  );
}

function SupportProject() {
  const venmoUrl = 'https://venmo.com/u/Gary-Morris22';
  const qrSrc = `${import.meta.env.BASE_URL}venmo-gary-morris22-qr.svg`;

  return (
    <section className="support-project" aria-label="Support the project">
      <div className="support-copy">
        <span>Support the project</span>
        <h2>Request another public-domain classic</h2>
        <p>
          Tips help make room for adding new books, especially when a request needs multiple language editions aligned by
          hand. Please request titles that are legally available in public-domain or otherwise openly accessible formats.
        </p>
      </div>
      <div className="venmo-card">
        <img src={qrSrc} alt="Venmo QR code for Gary-Morris22" />
        <div>
          <strong>Gary-Morris22</strong>
          <a href={venmoUrl} target="_blank" rel="noreferrer">
            Open Venmo
          </a>
          <small>Add the book title and languages in the note.</small>
        </div>
      </div>
    </section>
  );
}

function ReaderSettings({
  open,
  chapterId,
  chapters,
  language1,
  language2,
  languages,
  theme,
  readerMode,
  fontSize,
  hasJapanese,
  onClose,
  onLibrary,
  onChapterChange,
  onLanguage1Change,
  onLanguage2Change,
  onThemeChange,
  onReaderModeChange,
  onFontSizeChange,
  showUnitNumbers,
  onShowUnitNumbersChange,
  showJapaneseFurigana,
  onShowJapaneseFuriganaChange,
}: {
  open: boolean;
  chapterId: string;
  chapters: Chapter[];
  language1: LanguageCode;
  language2: LanguageCode;
  languages: LanguageCode[];
  theme: Theme;
  readerMode: ReaderMode;
  fontSize: number;
  hasJapanese: boolean;
  onClose: () => void;
  onLibrary: () => void;
  onChapterChange: (chapterId: string) => void;
  onLanguage1Change: (language: LanguageCode) => void;
  onLanguage2Change: (language: LanguageCode) => void;
  onThemeChange: (theme: Theme) => void;
  onReaderModeChange: (mode: ReaderMode) => void;
  onFontSizeChange: (fontSize: number) => void;
  showUnitNumbers: boolean;
  onShowUnitNumbersChange: (show: boolean) => void;
  showJapaneseFurigana: boolean;
  onShowJapaneseFuriganaChange: (show: boolean) => void;
}) {
  return (
    <section className={`settings-layer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <button className="settings-scrim" type="button" aria-label="Close reader settings" onClick={onClose} />
      <aside className="settings-panel" aria-label="Reader settings">
        <div className="settings-header">
          <div>
            <span>Reader</span>
            <h2>Settings</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close settings">
            <X aria-hidden="true" />
          </button>
        </div>

        <button className="library-command" type="button" onClick={onLibrary}>
          <Library aria-hidden="true" />
          Library
        </button>

        <div className="setting-group theme-setting">
          <h3>Theme</h3>
          <ThemeOptions theme={theme} onThemeChange={onThemeChange} />
        </div>

        <div className="setting-group">
          <h3>Languages</h3>
          <LanguageSelect label="Pane 1" value={language1} languages={languages} onChange={onLanguage1Change} />
          <LanguageSelect label="Pane 2" value={language2} languages={languages} onChange={onLanguage2Change} />
          {hasJapanese && (
            <label className="toggle-control">
              <span>Show Japanese furigana</span>
              <input type="checkbox" checked={showJapaneseFurigana} onChange={(event) => onShowJapaneseFuriganaChange(event.target.checked)} />
            </label>
          )}
        </div>

        <div className="setting-group">
          <h3>Layout</h3>
          <div className="mode-options">
            <button type="button" className={readerMode === 'synced' ? 'is-selected' : ''} onClick={() => onReaderModeChange('synced')}>
              Synced
              <small>Two panes</small>
            </button>
            <button type="button" className={readerMode === 'merged' ? 'is-selected' : ''} onClick={() => onReaderModeChange('merged')}>
              Merged
              <small>Matched rows</small>
            </button>
          </div>
        </div>

        <div className="setting-group">
          <h3>Chapter</h3>
          <select value={chapterId} onChange={(event) => onChapterChange(event.target.value)}>
            {chapters.map((chapter) => (
              <option key={chapter.chapterId} value={chapter.chapterId}>
                {chapter.title}
              </option>
            ))}
          </select>
        </div>

        <div className="setting-group">
          <h3>Text Size</h3>
          <label className="font-control">
            <Type aria-hidden="true" />
            <input
              type="range"
              min="15"
              max="24"
              value={fontSize}
              onChange={(event) => onFontSizeChange(Number(event.target.value))}
            />
            <span>{fontSize}px</span>
          </label>
        </div>

        <div className="setting-group debug-setting">
          <h3>Debug</h3>
          <label className="toggle-control">
            <span>Show hidden sync IDs</span>
            <input type="checkbox" checked={showUnitNumbers} onChange={(event) => onShowUnitNumbersChange(event.target.checked)} />
          </label>
        </div>
      </aside>
    </section>
  );
}

function LanguageSelect({
  label,
  value,
  languages,
  onChange,
}: {
  label: string;
  value: LanguageCode;
  languages: LanguageCode[];
  onChange: (language: LanguageCode) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as LanguageCode)}>
        {languages.map((language) => (
          <option key={language} value={language}>
            {languageNames[language]}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadingPane({
  paneRef,
  chapter,
  title,
  showUnitNumbers,
  renderHtml,
  onOpenSettings,
  onScroll,
}: {
  paneRef: RefObject<HTMLDivElement | null>;
  chapter: Chapter | undefined;
  title: string;
  showUnitNumbers: boolean;
  renderHtml: boolean;
  onOpenSettings: () => void;
  onScroll: () => void;
}) {
  return (
    <article className="reading-pane">
      <div className="pane-heading">
        <button type="button" onClick={onOpenSettings} aria-label={`Change ${title} language`}>
          {title}
        </button>
      </div>
      <div className="pane-scroll" ref={paneRef} onScroll={onScroll}>
        <h2>{chapter?.title ?? 'Unavailable'}</h2>
        {(chapter?.sections ?? []).map((section) => (
          <p className="section-block" key={section.sectionId} data-section-id={section.sectionId}>
            <UnitMarker section={section} showSyncId={showUnitNumbers} />
            {renderHtml && section.html ? <span dangerouslySetInnerHTML={{ __html: section.html }} /> : section.text}
          </p>
        ))}
        {!chapter && <p>This translation has not been added yet. Run the converter script to add more public-domain text.</p>}
      </div>
    </article>
  );
}

function MergedReader({
  chapterOne,
  chapterTwo,
  languageOne,
  languageTwo,
  showUnitNumbers,
}: {
  chapterOne: Chapter | undefined;
  chapterTwo: Chapter | undefined;
  languageOne: string;
  languageTwo: string;
  showUnitNumbers: boolean;
}) {
  const sectionsOne = chapterOne?.sections ?? [];
  const sectionsTwo = chapterTwo?.sections ?? [];
  const rows = sectionsOne.map((section, index) => ({
    sectionId: section.sectionId,
    one: section,
    two: sectionsTwo.find((candidate) => candidate.sectionId === section.sectionId) ?? sectionsTwo[index],
  }));

  return (
    <article className="merged-reader" aria-label="Merged parallel reading">
      <div className="merged-language-bar">
        <span>{languageOne}</span>
        <span>{languageTwo}</span>
      </div>
      <div className="merged-scroll">
        <div className="merged-heading-row">
          <h2>{chapterOne?.title ?? 'Unavailable'}</h2>
          <h2>{chapterTwo?.title ?? 'Unavailable'}</h2>
        </div>
        <div className="merged-section-list">
          {rows.map((row) => (
            <div className="merged-section-row" key={row.sectionId} data-section-id={row.sectionId}>
              <p>
                <UnitMarker section={row.one} showSyncId={showUnitNumbers} />
                {row.one.html ? <span dangerouslySetInnerHTML={{ __html: row.one.html }} /> : row.one.text}
              </p>
              <p>
                {row.two && <UnitMarker section={row.two} showSyncId={showUnitNumbers} />}
                {row.two?.html ? <span dangerouslySetInnerHTML={{ __html: row.two.html }} /> : row.two?.text ?? ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function UnitMarker({ section, showSyncId }: { section: Section; showSyncId: boolean }) {
  return (
    <span className="unit-marker" aria-label={`Matching section ${section.unit ?? section.sectionId}`}>
      <span className="unit-number">{section.unit ?? section.sectionId}</span>
      {showSyncId && <span className="debug-unit-number">{section.sectionId}</span>}
    </span>
  );
}

function resetSyncedRows(...panes: Array<HTMLDivElement | null>) {
  for (const pane of panes) {
    const heading = pane?.querySelector<HTMLElement>('h2');
    if (heading) heading.style.height = '';
    pane?.querySelectorAll<HTMLElement>('[data-section-id]').forEach((section) => {
      section.style.height = '';
    });
  }
}

function alignSyncedRows(paneOne: HTMLDivElement | null, paneTwo: HTMLDivElement | null) {
  if (!paneOne || !paneTwo) return;

  const panes = [paneOne, paneTwo];
  resetSyncedRows(...panes);

  const headings = panes
    .map((pane) => pane.querySelector<HTMLElement>('h2'))
    .filter((heading): heading is HTMLElement => Boolean(heading));
  if (headings.length === 2) {
    const headingHeight = Math.ceil(Math.max(...headings.map((heading) => heading.getBoundingClientRect().height)));
    headings.forEach((heading) => {
      heading.style.height = `${headingHeight}px`;
    });
  }

  const syncIds = new Set(
    panes.flatMap((pane) =>
      Array.from(pane.querySelectorAll<HTMLElement>('[data-section-id]'))
        .map((section) => section.dataset.sectionId)
        .filter((syncId): syncId is string => Boolean(syncId)),
    ),
  );

  for (const syncId of syncIds) {
    const matching = panes
      .map((pane) => pane.querySelector<HTMLElement>(`[data-section-id="${syncId}"]`))
      .filter((section): section is HTMLElement => Boolean(section));
    if (matching.length < 2) continue;

    const rowHeight = Math.ceil(Math.max(...matching.map((section) => section.getBoundingClientRect().height)));
    matching.forEach((section) => {
      section.style.height = `${rowHeight}px`;
    });
  }
}

function syncPaneToSource(source: HTMLDivElement, target: HTMLDivElement) {
  const position = getVisibleSyncPosition(source);
  const nextTop = position ? getScrollTopForSyncPosition(target, position) : source.scrollTop;
  const maxTop = Math.max(0, target.scrollHeight - target.clientHeight);

  target.style.scrollBehavior = 'auto';
  target.scrollTop = Math.min(Math.max(nextTop, 0), maxTop);
}

function getVisibleSyncPosition(pane: HTMLDivElement) {
  const sections = Array.from(pane.querySelectorAll<HTMLElement>('[data-section-id]'));
  let activeSection: HTMLElement | undefined;
  let activeTop = 0;

  for (const section of sections) {
    const top = getSectionScrollTop(pane, section);
    if (top <= pane.scrollTop + 2) {
      activeSection = section;
      activeTop = top;
    } else {
      break;
    }
  }

  if (!activeSection?.dataset.sectionId) return null;

  return {
    syncId: activeSection.dataset.sectionId,
    offset: Math.max(0, pane.scrollTop - activeTop),
  };
}

function getScrollTopForSyncPosition(pane: HTMLDivElement, position: { syncId: string; offset: number }) {
  const section = pane.querySelector<HTMLElement>(`[data-section-id="${position.syncId}"]`);
  if (!section) return pane.scrollTop;

  const sectionHeight = Math.max(1, section.getBoundingClientRect().height);
  return getSectionScrollTop(pane, section) + Math.min(position.offset, sectionHeight - 1);
}

function getSectionScrollTop(pane: HTMLDivElement, section: HTMLElement) {
  return section.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
}
