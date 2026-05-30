import { useCallback, useEffect, useRef } from 'react';
import ScripturePane from './ScripturePane.jsx';

const lockMs = 420;
const swipeThreshold = 72;
const swipeVerticalTolerance = 54;

export default function ReaderLayout({
  chapter,
  pane1Language,
  pane2Language,
  languageOptions,
  japaneseFurigana,
  onNextChapter,
  onPreviousChapter,
}) {
  const paneRefs = useRef({});
  const syncLock = useRef(null);
  const releaseTimer = useRef(null);
  const alignFrame = useRef(null);
  const touchStart = useRef(null);

  const alignVerseRows = useCallback(() => {
    const panes = [paneRefs.current.pane1, paneRefs.current.pane2];
    if (panes.some((pane) => !pane)) return;

    const headings = panes
      .map((pane) => pane.querySelector('.chapter-heading'))
      .filter(Boolean);
    const verses = panes.flatMap((pane) => [...pane.querySelectorAll('[data-verse]')]);

    headings.forEach((heading) => {
      heading.style.minHeight = '';
    });
    verses.forEach((verse) => {
      verse.style.minHeight = '';
    });

    if (headings.length) {
      const headingHeight = Math.ceil(
        Math.max(...headings.map((heading) => heading.getBoundingClientRect().height)),
      );
      headings.forEach((heading) => {
        heading.style.minHeight = `${headingHeight}px`;
      });
    }

    const verseNumbers = new Set(verses.map((verse) => verse.dataset.verse));
    verseNumbers.forEach((verseNumber) => {
      const matchingVerses = panes
        .map((pane) => pane.querySelector(`[data-verse="${verseNumber}"]`))
        .filter(Boolean);
      if (!matchingVerses.length) return;

      const rowHeight = Math.ceil(
        Math.max(...matchingVerses.map((verse) => verse.getBoundingClientRect().height)),
      );
      matchingVerses.forEach((verse) => {
        verse.style.minHeight = `${rowHeight}px`;
      });
    });
  }, []);

  const scheduleAlignment = useCallback(() => {
    window.cancelAnimationFrame(alignFrame.current);
    alignFrame.current = window.requestAnimationFrame(() => {
      alignFrame.current = window.requestAnimationFrame(alignVerseRows);
    });
  }, [alignVerseRows]);

  const registerPane = (pane, node) => {
    paneRefs.current[pane] = node;
    scheduleAlignment();
  };

  useEffect(() => {
    scheduleAlignment();

    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleAlignment);
    const panes = [paneRefs.current.pane1, paneRefs.current.pane2].filter(Boolean);
    panes.forEach((pane) => observer?.observe(pane));
    window.addEventListener('resize', scheduleAlignment);

    return () => {
      window.cancelAnimationFrame(alignFrame.current);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleAlignment);
    };
  }, [chapter.book, chapter.chapter, pane1Language, pane2Language, scheduleAlignment]);

  const handlePaneScroll = (activePane) => {
    if (syncLock.current && syncLock.current !== activePane) return;

    const source = paneRefs.current[activePane];
    const targetPane = activePane === 'pane1' ? 'pane2' : 'pane1';
    const target = paneRefs.current[targetPane];
    if (!source || !target) return;

    syncLock.current = activePane;
    target.scrollTo({
      top: source.scrollTop,
      behavior: 'auto',
    });

    window.clearTimeout(releaseTimer.current);
    releaseTimer.current = window.setTimeout(() => {
      syncLock.current = null;
    }, lockMs);
  };

  const handleTouchStart = (event) => {
    if (event.touches.length !== 1) return;
    const [touch] = event.touches;
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchEnd = (event) => {
    if (!touchStart.current || event.changedTouches.length !== 1) return;

    const [touch] = event.changedTouches;
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaY) > swipeVerticalTolerance) return;

    if (deltaX < 0) {
      onNextChapter?.();
    } else {
      onPreviousChapter?.();
    }
  };

  return (
    <section
      className="reader-layout"
      aria-label="Parallel scripture reader"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <ScripturePane
        paneId="pane1"
        chapter={chapter}
        language={pane1Language}
        label="Language 1"
        languageOptions={languageOptions}
        japaneseFurigana={japaneseFurigana}
        onPaneReady={registerPane}
        onScroll={handlePaneScroll}
      />
      <ScripturePane
        paneId="pane2"
        chapter={chapter}
        language={pane2Language}
        label="Language 2"
        languageOptions={languageOptions}
        japaneseFurigana={japaneseFurigana}
        onPaneReady={registerPane}
        onScroll={handlePaneScroll}
      />
    </section>
  );
}
