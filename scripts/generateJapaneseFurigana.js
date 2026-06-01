import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import kuromoji from 'kuromoji';
import wanakana from 'wanakana';
import { japaneseClassics } from './japaneseClassicsConfig.js';

const outRoot = path.join(process.cwd(), 'src', 'data', 'books');
const dictPath = path.join(process.cwd(), 'node_modules', 'kuromoji', 'dict');
const tokenizer = await new Promise((resolve, reject) => {
  kuromoji.builder({ dicPath: dictPath }).build((error, built) => (error ? reject(error) : resolve(built)));
});

for (const book of japaneseClassics) {
  const dir = path.join(outRoot, book.bookId);
  const plain = JSON.parse(await readFile(path.join(dir, `${book.bookId}.ja.json`), 'utf8'));
  let kanjiSegments = 0;
  let readings = 0;

  const furigana = {
    ...plain,
    language: 'ja-furigana',
    chapters: plain.chapters.map((chapter) => ({
      ...chapter,
      sections: (chapter.sections ?? chapter.units).map((unit) => {
        const segments = segmentWithFurigana(unit.text);
        kanjiSegments += segments.filter((segment) => hasKanji(segment.base)).length;
        readings += segments.filter((segment) => hasKanji(segment.base) && segment.reading).length;
        return {
          ...unit,
          html: segmentsToHtml(segments),
          segments,
        };
      }),
      units: undefined,
    })),
    furiganaStats: { kanjiSegments, readings, percentWithReadings: kanjiSegments ? Math.round((readings / kanjiSegments) * 1000) / 10 : 0 },
  };

  await writeFile(path.join(dir, `${book.bookId}.ja.furigana.json`), `${JSON.stringify(furigana, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${book.bookId}.ja.furigana.json (${furigana.furiganaStats.percentWithReadings}% readings)`);
}

function segmentWithFurigana(text) {
  return tokenizer.tokenize(text).map((token) => {
    const base = token.surface_form;
    const reading = hasKanji(base) && token.reading && token.reading !== '*' ? wanakana.toHiragana(token.reading) : null;
    return { base, reading };
  });
}

function segmentsToHtml(segments) {
  return segments
    .map((segment) =>
      segment.reading ? `<ruby>${escapeHtml(segment.base)}<rt>${escapeHtml(segment.reading)}</rt></ruby>` : escapeHtml(segment.base),
    )
    .join('');
}

function hasKanji(text) {
  return /[\u3400-\u9fff]/u.test(text);
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
