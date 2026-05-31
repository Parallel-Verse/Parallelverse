import { useEffect, useRef } from 'react';

const chapterLabels = {
  eng: 'Chapter',
  spa: 'Capitulo',
  jpn: '\u7ae0',
  jpn_furigana: '\u7ae0',
  zho: '\u7ae0',
  pt: 'Capitulo',
  ko: '\uc7a5',
  ceb: 'Kapitulo',
  smo: 'Mataupu',
  ton: 'Vahe',
  fra: 'Chapitre',
  deu: 'Kapitel',
  tgl: 'Kabanata',
};

function getVerseContent(verse, language, japaneseFurigana) {
  const titleLanguage = language === 'jpn_furigana' ? 'jpn' : language;
  const furiganaValue = verse.jpn_furigana;
  const shouldRenderFurigana =
    language === 'jpn_furigana' || (language === 'jpn' && japaneseFurigana);
  const plainText =
    shouldRenderFurigana && furiganaValue
      ? furiganaValue.text
      : verse[language] ?? verse[titleLanguage];
  const html =
    shouldRenderFurigana && japaneseFurigana && furiganaValue?.html ? furiganaValue.html : null;

  return { html, plainText, titleLanguage };
}

export default function SharedScripturePane({
  paneId,
  chapter,
  pane1Language,
  pane2Language,
  languageOptions,
  pane1JapaneseFurigana,
  pane2JapaneseFurigana,
  onPaneReady,
  onScroll,
  onOpenSettings,
}) {
  const scrollRef = useRef(null);
  const pane1Option = languageOptions.find((option) => option.code === pane1Language);
  const pane2Option = languageOptions.find((option) => option.code === pane2Language);
  const pane1Name = pane1Option?.name ?? pane1Language;
  const pane2Name = pane2Option?.name ?? pane2Language;
  const pane1TitleLanguage = pane1Language === 'jpn_furigana' ? 'jpn' : pane1Language;
  const pane2TitleLanguage = pane2Language === 'jpn_furigana' ? 'jpn' : pane2Language;
  const pane1BookTitle = chapter.titles?.[pane1TitleLanguage] ?? chapter.book;
  const pane2BookTitle = chapter.titles?.[pane2TitleLanguage] ?? chapter.book;
  const pane1ChapterLabel = chapterLabels[pane1Language] ?? 'Chapter';
  const pane2ChapterLabel = chapterLabels[pane2Language] ?? 'Chapter';

  useEffect(() => {
    onPaneReady?.(paneId, scrollRef.current);
  }, [onPaneReady, paneId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [chapter.book, chapter.chapter, pane1Language, pane2Language]);

  return (
    <article className="shared-reader-shell">
      <button
        className="shared-language-bar"
        type="button"
        onClick={onOpenSettings}
        aria-label={`Change ${pane1Name} and ${pane2Name} languages`}
      >
        {pane1Name} / {pane2Name}
      </button>

      <div
        className="shared-scroll"
        ref={scrollRef}
        onScroll={onScroll}
        tabIndex="0"
        aria-label={`${pane1Name} and ${pane2Name} scripture text`}
      >
        <div className="shared-heading-row">
          <div className="chapter-heading">
            <p>{pane1BookTitle}</p>
            <h1>
              {pane1ChapterLabel} {chapter.chapter}
            </h1>
          </div>
          <div className="chapter-heading">
            <p>{pane2BookTitle}</p>
            <h1>
              {pane2ChapterLabel} {chapter.chapter}
            </h1>
          </div>
        </div>

        <div className="shared-verse-list">
          {chapter.verses.map((verse) => {
            const pane1 = getVerseContent(verse, pane1Language, pane1JapaneseFurigana);
            const pane2 = getVerseContent(verse, pane2Language, pane2JapaneseFurigana);

            return (
              <div className="shared-verse-row" data-verse={verse.verse} key={verse.verse}>
                <p className={`verse ${pane1.plainText ? '' : 'verse-missing'}`}>
                  <span className="verse-number">{verse.verse}</span>
                  {pane1.html ? (
                    <span dangerouslySetInnerHTML={{ __html: pane1.html }} />
                  ) : (
                    <span>
                      {pane1.plainText ??
                        `${pane1Name} text for ${chapter.book} ${chapter.chapter}:${verse.verse} has not been loaded yet.`}
                    </span>
                  )}
                </p>
                <p className={`verse ${pane2.plainText ? '' : 'verse-missing'}`}>
                  <span className="verse-number">{verse.verse}</span>
                  {pane2.html ? (
                    <span dangerouslySetInnerHTML={{ __html: pane2.html }} />
                  ) : (
                    <span>
                      {pane2.plainText ??
                        `${pane2Name} text for ${chapter.book} ${chapter.chapter}:${verse.verse} has not been loaded yet.`}
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}
