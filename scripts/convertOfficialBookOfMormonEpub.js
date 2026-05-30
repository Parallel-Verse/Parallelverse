import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import englishReference from '../src/data/book-of-mormon-reference.json' with { type: 'json' };

export const BOOKS = [
  { id: '1-nephi', englishTitle: '1 Nephi', slug: '1-ne' },
  { id: '2-nephi', englishTitle: '2 Nephi', slug: '2-ne' },
  { id: 'jacob', englishTitle: 'Jacob', slug: 'jacob' },
  { id: 'enos', englishTitle: 'Enos', slug: 'enos' },
  { id: 'jarom', englishTitle: 'Jarom', slug: 'jarom' },
  { id: 'omni', englishTitle: 'Omni', slug: 'omni' },
  { id: 'words-of-mormon', englishTitle: 'Words of Mormon', slug: 'w-of-m' },
  { id: 'mosiah', englishTitle: 'Mosiah', slug: 'mosiah' },
  { id: 'alma', englishTitle: 'Alma', slug: 'alma' },
  { id: 'helaman', englishTitle: 'Helaman', slug: 'hel' },
  { id: '3-nephi', englishTitle: '3 Nephi', slug: '3-ne' },
  { id: '4-nephi', englishTitle: '4 Nephi', slug: '4-ne' },
  { id: 'mormon', englishTitle: 'Mormon', slug: 'morm' },
  { id: 'ether', englishTitle: 'Ether', slug: 'ether' },
  { id: 'moroni', englishTitle: 'Moroni', slug: 'moro' },
];

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slugMap = new Map(BOOKS.map((book) => [book.slug, book]));

export async function convertOfficialBookOfMormonEpub(config) {
  const inputDir = path.join(ROOT_DIR, 'input');
  const epubPath = path.join(inputDir, config.epubFileName);
  const outputPath = path.join(ROOT_DIR, 'src', 'data', config.outputFileName);
  const extractDir = path.join(inputDir, `.${path.basename(config.epubFileName, '.epub')}-extract`);

  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await downloadEpub(config.epubUrl, epubPath);
  extractEpub(epubPath, extractDir);

  const htmlFiles = listFiles(extractDir).filter((filePath) => /\.(?:xhtml|html)$/i.test(filePath));
  const books = buildBooks(htmlFiles);
  const output = {
    language: config.language,
    sourcePage: config.sourcePage,
    books,
  };

  const validation = validateLanguage(output);
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  fs.rmSync(extractDir, { recursive: true, force: true });

  const summary = summarize(output);
  console.log(`Source page: ${config.sourcePage}`);
  console.log(`Downloaded EPUB: ${path.relative(ROOT_DIR, epubPath)}`);
  console.log(`Wrote: ${path.relative(ROOT_DIR, outputPath)}`);
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
    throw new Error(`${config.language} conversion failed validation.`);
  }
}

async function downloadEpub(url, destinationPath) {
  console.log(`Downloading official EPUB from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download EPUB: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) {
    throw new Error(`Downloaded file is unexpectedly small (${buffer.length} bytes).`);
  }

  fs.writeFileSync(destinationPath, buffer);
}

function extractEpub(epubPath, destinationDir) {
  fs.rmSync(destinationDir, { recursive: true, force: true });
  fs.mkdirSync(destinationDir, { recursive: true });

  try {
    execFileSync('tar', ['-xf', epubPath, '-C', destinationDir], { stdio: 'pipe' });
    if (fs.existsSync(path.join(destinationDir, 'META-INF', 'container.xml'))) return;
  } catch {
    // Fall back to platform-specific extraction below.
  }

  if (process.platform === 'win32') {
    const zipPath = path.join(os.tmpdir(), `${path.basename(epubPath)}-${Date.now()}.zip`);
    fs.copyFileSync(epubPath, zipPath);
    try {
      execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          '& { param($zipPath, $destinationDir) Expand-Archive -LiteralPath $zipPath -DestinationPath $destinationDir -Force }',
          zipPath,
          destinationDir,
        ],
        { stdio: 'pipe' },
      );
    } finally {
      fs.rmSync(zipPath, { force: true });
    }
    return;
  }

  execFileSync('unzip', ['-q', '-o', epubPath, '-d', destinationDir], { stdio: 'pipe' });
}

function buildBooks(htmlFiles) {
  const titleBySlug = new Map();
  const chapterBySlug = new Map();

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    const dataUri = html.match(/\bdata-uri="\/scriptures\/bofm\/([^"]+)"/i)?.[1];
    if (!dataUri) continue;

    const [slug, chapterText] = dataUri.split('/');
    const book = slugMap.get(slug);
    if (!book) continue;

    const $ = cheerio.load(html, { decodeEntities: false });
    if (!chapterText) {
      const title = normalizeWhitespace(
        $('h1 .dominant').first().text() ||
          $('h1').first().text() ||
          $('title').first().text(),
      );
      if (title) titleBySlug.set(slug, title);
      continue;
    }

    const chapter = Number(chapterText);
    if (!Number.isInteger(chapter)) continue;
    if (!titleBySlug.has(slug)) {
      const title = titleFromChapterHtml($, chapter);
      if (title) titleBySlug.set(slug, title);
    }
    if (!chapterBySlug.has(slug)) chapterBySlug.set(slug, new Map());
    chapterBySlug.get(slug).set(chapter, extractVerses($));
  }

  return BOOKS.map((book) => {
    const expectedChapters = getExpectedChapters(book.englishTitle);
    const chapterMap = chapterBySlug.get(book.slug) ?? new Map();
    return {
      id: book.id,
      title: titleBySlug.get(book.slug) ?? book.englishTitle,
      chapters: Array.from({ length: expectedChapters }, (_, index) => {
        const chapter = index + 1;
        return {
          chapter,
          verses: chapterMap.get(chapter) ?? [],
        };
      }),
    };
  });
}

function titleFromChapterHtml($, chapter) {
  return normalizeWhitespace(
    ($('title').first().text() || $('h1').first().text()).replace(
      new RegExp(`(?:\\s|\\u00a0)+${chapter}\\s*$`),
      '',
    ),
  );
}

function extractVerses($) {
  $('footer, nav, header, img, sup, span[role="doc-pagebreak"], span[data-page]').remove();

  return $('p[id]')
    .toArray()
    .map((node) => {
      const id = $(node).attr('id') ?? '';
      const match = id.match(/^p(\d+)$/);
      if (!match) return null;

      const clone = $(node).clone();
      clone.find('sup, span[role="doc-pagebreak"], span[data-page]').remove();
      clone.find('span.verse-number').remove();
      const firstChild = clone.children().first();
      if (firstChild.is('span') && /^\s*\d+\s*$/.test(firstChild.text())) {
        firstChild.remove();
      }

      const text = normalizeWhitespace(clone.text().replace(/^\d+\s+/, ''));
      return text ? { verse: Number(match[1]), text } : null;
    })
    .filter(Boolean);
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
        if (seen.has(Number(verse.verse))) {
          duplicateVerses.push(`${book.id} ${chapterNumber}:${verse.verse}`);
        }
        seen.add(Number(verse.verse));
        if (!verse.text?.trim()) emptyVerses.push(`${book.id} ${chapterNumber}:${verse.verse}`);
      }

      for (const verseNumber of Object.keys(expectedBook[chapterNumber]).filter((key) => /^\d+$/.test(key))) {
        if (!seen.has(Number(verseNumber))) {
          missingVerses.push(`${book.id} ${chapterNumber}:${verseNumber}`);
        }
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

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : entryPath;
  });
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
