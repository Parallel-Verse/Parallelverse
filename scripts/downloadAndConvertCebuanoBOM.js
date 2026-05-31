import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import englishReference from '../src/data/book-of-mormon-reference.json' with { type: 'json' };
import { BOOKS } from './convertOfficialBookOfMormonEpub.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'src', 'data', 'bookOfMormon.ceb.json');
const SOURCE_PAGE =
  'https://www.churchofjesuschrist.org/study/manual/translations-and-downloads/languages/cebuano?lang=eng';
const CHAPTER_BASE = 'https://www.churchofjesuschrist.org/study/scriptures/bofm';

const bookTitleOverrides = {
  '1-ne': '1 Nephi',
  '2-ne': '2 Nephi',
};

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const books = [];
  for (const book of BOOKS) {
    const expectedChapters = getExpectedChapters(book.englishTitle);
    const chapters = [];
    let title = bookTitleOverrides[book.slug] ?? null;

    for (let chapter = 1; chapter <= expectedChapters; chapter += 1) {
      const url = `${CHAPTER_BASE}/${book.slug}/${chapter}?lang=ceb`;
      const html = await fetchChapter(url);
      const parsed = parseChapter(html, chapter);
      if (!title && parsed.title) title = parsed.title;
      chapters.push({
        chapter,
        verses: parsed.verses,
      });
      await delay(120);
    }

    books.push({
      id: book.id,
      title: title ?? book.englishTitle,
      chapters,
    });
  }

  const output = {
    language: 'ceb',
    sourcePage: SOURCE_PAGE,
    books,
  };

  const validation = validateLanguage(output);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const summary = summarize(output);
  console.log(`Source page: ${SOURCE_PAGE}`);
  console.log(`Source chapters: ${CHAPTER_BASE}/... ?lang=ceb`);
  console.log(`Wrote: ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
  console.log(`Books: ${summary.books}`);
  console.log(`Chapters: ${summary.chapters}`);
  console.log(`Verses: ${summary.verses}`);
  console.log(`Missing books: ${validation.missingBooks.length}`);
  console.log(`Missing chapters: ${validation.missingChapters.length}`);
  console.log(`Missing verses: ${validation.missingVerses.length}`);
  console.log(`Duplicate verses: ${validation.duplicateVerses.length}`);
  console.log(`Empty verses: ${validation.emptyVerses.length}`);

  if (!validation.valid) {
    for (const [name, values] of Object.entries(validation)) {
      if (Array.isArray(values) && values.length) {
        console.log(`${name}: ${values.slice(0, 25).join(', ')}${values.length > 25 ? ' ...' : ''}`);
      }
    }
    throw new Error('Cebuano conversion failed validation.');
  }
}

async function fetchChapter(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ParallelVerse/1.0 scripture conversion',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function parseChapter(html, chapter) {
  const $ = cheerio.load(html, { decodeEntities: false });
  $('footer, nav, header, img, sup, button, script, style, span[role="doc-pagebreak"], span[data-page]').remove();

  const title = normalizeWhitespace(
    ($('h1').first().text() || $('title').first().text()).replace(
      new RegExp(`[\\s\\u00a0]*${chapter}\\s*$`),
      '',
    ),
  );

  const verses = $('p[id^="p"]')
    .toArray()
    .map((node) => {
      const id = $(node).attr('id') ?? '';
      const match = id.match(/^p(\d+)$/);
      if (!match) return null;

      const clone = $(node).clone();
      clone.find('sup, span.verse-number, span[role="doc-pagebreak"], span[data-page]').remove();
      const text = normalizeWhitespace(clone.text().replace(/^\d+\s+/, ''));
      return text ? { verse: Number(match[1]), text } : null;
    })
    .filter(Boolean);

  return { title, verses };
}

function validateLanguage(output) {
  const missingBooks = [];
  const missingChapters = [];
  const missingVerses = [];
  const duplicateVerses = [];
  const emptyVerses = [];
  const bookMap = new Map(output.books.map((book) => [book.id, book]));

  for (const book of BOOKS) {
    const expectedBook = englishReference[book.englishTitle];
    const actualBook = bookMap.get(book.id);
    if (!actualBook) {
      missingBooks.push(book.id);
      continue;
    }

    for (const chapterNumber of Object.keys(expectedBook).filter((key) => /^\d+$/.test(key))) {
      const actualChapter = actualBook.chapters.find(
        (chapter) => Number(chapter.chapter) === Number(chapterNumber),
      );
      if (!actualChapter) {
        missingChapters.push(`${book.id} ${chapterNumber}`);
        continue;
      }

      const seen = new Set();
      for (const verse of actualChapter.verses) {
        const verseNumber = Number(verse.verse);
        if (seen.has(verseNumber)) duplicateVerses.push(`${book.id} ${chapterNumber}:${verseNumber}`);
        seen.add(verseNumber);
        if (!verse.text?.trim()) emptyVerses.push(`${book.id} ${chapterNumber}:${verseNumber}`);
      }

      for (const verseNumber of Object.keys(expectedBook[chapterNumber]).filter((key) => /^\d+$/.test(key))) {
        if (!seen.has(Number(verseNumber))) missingVerses.push(`${book.id} ${chapterNumber}:${verseNumber}`);
      }
    }
  }

  return {
    valid:
      !missingBooks.length &&
      !missingChapters.length &&
      !missingVerses.length &&
      !duplicateVerses.length &&
      !emptyVerses.length,
    missingBooks,
    missingChapters,
    missingVerses,
    duplicateVerses,
    emptyVerses,
  };
}

function getExpectedChapters(englishTitle) {
  return Object.keys(englishReference[englishTitle]).filter((key) => /^\d+$/.test(key)).length;
}

function summarize(data) {
  return {
    books: data.books.length,
    chapters: data.books.reduce((sum, book) => sum + book.chapters.length, 0),
    verses: data.books.reduce(
      (sum, book) =>
        sum + book.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.verses.length, 0),
      0,
    ),
  };
}

function normalizeWhitespace(value) {
  return decodeEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function decodeEntities(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
