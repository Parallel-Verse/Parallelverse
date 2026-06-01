import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { japaneseClassics } from './japaneseClassicsConfig.js';
import { alignByPosition, normalizeText, splitEnglishUnits } from './japaneseClassicsTextUtils.js';

const rawDir = path.join(process.cwd(), 'input', 'raw', 'japanese-classics');
const outRoot = path.join(process.cwd(), 'src', 'data', 'books');
const reportsDir = path.join(process.cwd(), 'reports');

await mkdir(reportsDir, { recursive: true });

const report = { books: [] };

for (const book of japaneseClassics) {
  const outDir = path.join(outRoot, book.bookId);
  const ja = JSON.parse(await readFile(path.join(outDir, `${book.bookId}.ja.json`), 'utf8'));
  const source = JSON.parse(await readFile(path.join(rawDir, `${book.bookId}.en.source.json`), 'utf8'));
  const englishText = cleanEnglish(book.bookId, await readFile(path.join(rawDir, `${book.bookId}.en.txt`), 'utf8'));
  const englishChapters = splitEnglishChapters(book, englishText, ja.chapters.length);
  const bookReport = { bookId: book.bookId, chapters: [], needsReview: 0 };

  const en = {
    bookId: book.bookId,
    title: book.title,
    originalTitle: book.originalTitle,
    author: book.author,
    language: 'en',
    source: {
      name: source.name,
      url: source.url,
      licenseNote: source.licenseNote,
    },
    chapters: ja.chapters.map((jaChapter, chapterIndex) => {
      const masterUnits = jaChapter.units.map((unit) => unit.text);
      const aligned = alignByPosition(masterUnits, splitEnglishUnits(englishChapters[chapterIndex]?.text ?? ''), book.bookId, chapterIndex + 1, {
        needsReviewAll: source.type === 'provisional',
      });
      const needsReview = aligned.filter((unit) => unit.needsReview).length;
      bookReport.needsReview += needsReview;
      bookReport.chapters.push({
        chapter: chapterIndex + 1,
        title: jaChapter.title,
        units: aligned.length,
        needsReview,
        englishSourceTitle: englishChapters[chapterIndex]?.title ?? null,
      });
      return {
        chapter: chapterIndex + 1,
        title: englishChapters[chapterIndex]?.title ?? jaChapter.title,
        units: aligned,
      };
    }),
  };

  await writeFile(path.join(outDir, `${book.bookId}.en.json`), `${JSON.stringify(en, null, 2)}\n`, 'utf8');
  await writeFile(path.join(reportsDir, `${book.bookId}-japanese-alignment-report.json`), `${JSON.stringify(bookReport, null, 2)}\n`);
  report.books.push(bookReport);
  console.log(`Wrote ${book.bookId}.en.json; needs review ${bookReport.needsReview}`);
}

await writeFile(path.join(reportsDir, 'japanese-classics-alignment-report.json'), `${JSON.stringify(report, null, 2)}\n`);

function cleanEnglish(bookId, text) {
  let clean = normalizeText(text)
    .replace(/\bPage \d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (bookId === 'botchan') clean = clean.replace(/BOTCHAN \(MASTER DARLING\)[\s\S]*?CHAPTER I\./i, 'CHAPTER I.');
  if (bookId === 'botchan') {
    const chapterStarts = [...clean.matchAll(/CHAPTER\s+I\b/gi)].map((match) => match.index);
    const start = chapterStarts.at(-1) ?? 0;
    const end = clean.search(/—?\(THE END\)—?/i);
    clean = clean.slice(start, end > start ? end : clean.length);
  }
  if (bookId === 'i-am-a-cat') clean = clean.replace(/I AM A CAT[\s\S]*?CHAPTER I/i, 'CHAPTER I');
  if (bookId === 'ten-nights-dreams') clean = clean.replace(/Ten Nights' Dreams[\s\S]*?The First Night/i, 'The First Night');
  if (bookId === 'kokoro') clean = clean.replace(/Start \| Next>[\s\S]*?(Part 1: Sensei and I)/i, '$1');
  if (bookId === 'kokoro') {
    const footer = clean.lastIndexOf('Next> | <Prev | Contents');
    if (footer > 0) clean = clean.slice(0, footer);
    const citation = clean.lastIndexOf('Soseki, Natsume. Kokoro');
    if (citation > 0) clean = clean.slice(0, citation);
    const anchorCitation = clean.lastIndexOf('(<a href=');
    if (anchorCitation > 0) clean = clean.slice(0, anchorCitation);
    const regnery = clean.lastIndexOf('Regnery Gateway, 1957');
    if (regnery > 0) clean = clean.slice(0, regnery);
  }
  if (bookId === 'bamboo-cutter') {
    const start = clean.search(/Forme?r[ly]!?\s+there lived an old man/i);
    const noteAfterStart = clean.slice(Math.max(0, start)).search(/\d+\s+THE OLD BAMBOO-HEWER:\s+JAPANESE ROMANCE/i);
    const end = noteAfterStart >= 0 ? Math.max(0, start) + noteAfterStart : -1;
    clean = clean.slice(start >= 0 ? start : 0, end > start ? end : clean.length);
  }
  return clean;
}

function splitEnglishChapters(book, text, desiredCount) {
  if (book.bookId === 'ten-nights-dreams') {
    return splitByEnglishLabels(text, [
      'The First Night',
      'The Second Night',
      'The Third Night',
      'The Fourth Night',
      'The Fifth Night',
      'The Sixth Night',
      'The Seventh Night',
      'The Eighth Night',
      'The Ninth Night',
      'The Tenth Night',
    ]);
  }
  if (book.bookId === 'kokoro') {
    return splitByEnglishLabels(text, ['Part 1: Sensei and I', 'Part 2: My Parents and I', 'Part 3: Sensei and His Testament']).map((chapter) => ({
      ...chapter,
      text: chapter.text
        .replace(/Soseki, Natsume[\s\S]*$/i, '')
        .replace(/See bibliographic details[\s\S]*$/i, '')
        .replace(/Use as in \?Help[\s\S]*$/i, '')
        .replace(/Suggested MLA citations[\s\S]*$/i, '')
        .trim(),
    }));
  }
  if (book.bookId === 'i-am-a-cat') return splitByEnglishLabels(text, ['CHAPTER I', 'CHAPTER II']);
  if (desiredCount === 1) return [{ title: book.title, text }];
  if (book.bookId === 'botchan') return splitByRegex(text, /CHAPTER\s+[IVXLCDM]+\./gi, desiredCount);
  return [{ title: book.title, text }];
}

function splitByEnglishLabels(text, labels) {
  const chapters = [];
  for (let index = 0; index < labels.length; index += 1) {
    const start = text.search(new RegExp(escapeRegExp(labels[index]), 'i'));
    if (start < 0) continue;
    const next = labels.slice(index + 1).map((label) => text.search(new RegExp(escapeRegExp(label), 'i'))).filter((value) => value > start);
    const end = next.length ? Math.min(...next) : text.length;
    chapters.push({ title: labels[index], text: text.slice(start + labels[index].length, end).trim() });
  }
  return chapters;
}

function splitByRegex(text, regex, desiredCount) {
  const matches = [...text.matchAll(regex)];
  if (!matches.length) return splitEvenly(text, desiredCount);
  return matches.map((match, index) => ({
    title: match[0],
    text: text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length).trim(),
  }));
}

function splitEvenly(text, count, titles = []) {
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index * text.length) / count);
    const end = index === count - 1 ? text.length : Math.floor(((index + 1) * text.length) / count);
    return { title: titles[index] ?? `Chapter ${index + 1}`, text: text.slice(start, end).trim() };
  });
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
