import { useCallback, useEffect, useRef, useState } from 'react';
import ScripturePane from './ScripturePane.jsx';

const snapDelayMs = 90;
const syncEase = 0.38;
const swipeThreshold = 72;
const swipeVerticalTolerance = 54;
const transitionMs = 280;

export default function ReaderLayout({
  chapter,
  pane1Language,
  pane2Language,
  languageOptions,
  japaneseFurigana,
  onNextChapter,
  onPreviousChapter,
  onOpenSettings,
}) {
  const [visibleChapter, setVisibleChapter] = useState(chapter);
  const [previousChapter, setPreviousChapter] = useState(null);
  const [transitionDirection, setTransitionDirection] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const paneRefs = useRef({});
  const syncLock = useRef(null);
  const releaseTimer = useRef(null);
  const alignFrame = useRef(null);
  const syncFrame = useRef(null);
  const desiredSyncTop = useRef(0);
  const touchStart = useRef(null);
  const pendingDirection = useRef(0);
  const transitionTimer = useRef(null);
  const visibleChapterRef = useRef(chapter);

  useEffect(() => {
    const currentVisibleChapter = visibleChapterRef.current;
    if (
      chapter.book === currentVisibleChapter.book &&
      chapter.chapter === currentVisibleChapter.chapter
    ) {
      return;
    }

    const direction = pendingDirection.current || 1;
    pendingDirection.current = 0;
    visibleChapterRef.current = chapter;
    setPreviousChapter(currentVisibleChapter);
    setVisibleChapter(chapter);
    setTransitionDirection(direction);
    setIsTransitioning(true);

    window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => {
      setPreviousChapter(null);
      setIsTransitioning(false);
      setTransitionDirection(0);
    }, transitionMs);
  }, [chapter]);

  useEffect(() => {
    return () => {
      window.clearTimeout(transitionTimer.current);
      window.clearTimeout(releaseTimer.current);
      window.cancelAnimationFrame(syncFrame.current);
    };
  }, []);

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
  }, [visibleChapter.book, visibleChapter.chapter, pane1Language, pane2Language, scheduleAlignment]);

  const handlePaneScroll = (activePane) => {
    if (syncLock.current && syncLock.current !== activePane) return;

    const source = paneRefs.current[activePane];
    const targetPane = activePane === 'pane1' ? 'pane2' : 'pane1';
    const target = paneRefs.current[targetPane];
    if (!source || !target) return;

    syncLock.current = activePane;
    desiredSyncTop.current = source.scrollTop;

    const syncTarget = () => {
      if (syncLock.current !== activePane) {
        syncFrame.current = null;
        return;
      }

      target.style.scrollBehavior = 'auto';
      const distance = desiredSyncTop.current - target.scrollTop;
      if (Math.abs(distance) < 1) {
        target.scrollTop = desiredSyncTop.current;
      } else {
        target.scrollTop += distance * syncEase;
      }

      syncFrame.current = window.requestAnimationFrame(syncTarget);
    };

    if (!syncFrame.current) {
      syncFrame.current = window.requestAnimationFrame(syncTarget);
    }

    window.clearTimeout(releaseTimer.current);
    releaseTimer.current = window.setTimeout(() => {
      window.cancelAnimationFrame(syncFrame.current);
      syncFrame.current = null;
      target.style.scrollBehavior = 'auto';
      target.scrollTop = source.scrollTop;
      syncLock.current = null;
    }, snapDelayMs);
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
      pendingDirection.current = 1;
      onNextChapter?.();
    } else {
      pendingDirection.current = -1;
      onPreviousChapter?.();
    }
  };

  const renderPaneSet = (chapterToRender, className, register = false) => (
    <div className={`pane-set ${className}`}>
      <ScripturePane
        paneId={register ? 'pane1' : 'previous-pane1'}
        chapter={chapterToRender}
        language={pane1Language}
        label="Language 1"
        languageOptions={languageOptions}
        japaneseFurigana={japaneseFurigana}
        onPaneReady={register ? registerPane : undefined}
        onScroll={register ? handlePaneScroll : undefined}
        onOpenSettings={onOpenSettings}
      />
      <ScripturePane
        paneId={register ? 'pane2' : 'previous-pane2'}
        chapter={chapterToRender}
        language={pane2Language}
        label="Language 2"
        languageOptions={languageOptions}
        japaneseFurigana={japaneseFurigana}
        onPaneReady={register ? registerPane : undefined}
        onScroll={register ? handlePaneScroll : undefined}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );

  return (
    <section
      className={`reader-layout ${isTransitioning ? 'is-transitioning' : ''}`}
      data-transition-direction={transitionDirection}
      aria-label="Parallel scripture reader"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {previousChapter && renderPaneSet(previousChapter, 'pane-set-previous')}
      {renderPaneSet(visibleChapter, 'pane-set-current', true)}
    </section>
  );
}
