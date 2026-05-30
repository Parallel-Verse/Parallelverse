import { useEffect, useRef } from 'react';

const chapterLabels = {
  eng: 'Chapter',
  spa: 'Capítulo',
  jpn: '章',
  jpn_furigana: '章',
  fra: 'Chapitre',
  deu: 'Kapitel',
  tgl: 'Kabanata',
};

export default function ScripturePane({
  paneId,
  chapter,
  language,
  label,
  languageOptions,
  japaneseFurigana,
  onPaneReady,
  onScroll,
}) {
  const paneRef = useRef(null);
  const activeLanguage = languageOptions.find((option) => option.code === language);
  const languageName = activeLanguage?.name ?? language;
  const titleLanguage = language === 'jpn_furigana' ? 'jpn' : language;
  const bookTitle = chapter.titles?.[titleLanguage] ?? chapter.book;
  const chapterLabel = chapterLabels[language] ?? 'Chapter';

  useEffect(() => {
    onPaneReady?.(paneId, paneRef.current);
  }, [onPaneReady, paneId]);

  useEffect(() => {
    paneRef.current?.scrollTo({ top: 0 });
  }, [chapter.book, chapter.chapter, language]);

  return (
    <article className="scripture-pane">
      <div className="pane-header">
        <span>{label}</span>
        <strong>{activeLanguage?.name ?? language}</strong>
      </div>
      <div
        className="pane-scroll"
        ref={paneRef}
        onScroll={onScroll ? () => onScroll(paneId) : undefined}
        tabIndex="0"
        aria-label={`${languageName} scripture text`}
      >
        <div className="chapter-heading">
          <p>{bookTitle}</p>
          <h1>{chapterLabel} {chapter.chapter}</h1>
        </div>

        <div className="verse-list">
          {chapter.verses.map((verse) => {
            const furiganaValue = verse.jpn_furigana;
            const shouldRenderFurigana =
              language === 'jpn_furigana' || (language === 'jpn' && japaneseFurigana);
            const plainText =
              shouldRenderFurigana && furiganaValue
                ? furiganaValue.text
                : verse[language] ?? verse[titleLanguage];
            const html =
              shouldRenderFurigana && japaneseFurigana && furiganaValue?.html
                ? furiganaValue.html
                : null;

            return (
              <p
                className={`verse ${plainText ? '' : 'verse-missing'}`}
                data-verse={verse.verse}
                id={`${paneId}-verse-${verse.verse}`}
                key={`${paneId}-${verse.verse}`}
              >
                <span className="verse-number">{verse.verse}</span>
                {html ? (
                  <span dangerouslySetInnerHTML={{ __html: html }} />
                ) : (
                  <span>
                    {plainText ??
                      `${languageName} text for ${chapter.book} ${chapter.chapter}:${verse.verse} has not been loaded yet.`}
                  </span>
                )}
              </p>
            );
          })}
        </div>
      </div>
    </article>
  );
}
