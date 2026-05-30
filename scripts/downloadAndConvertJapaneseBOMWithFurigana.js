import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import englishReference from '../src/data/book-of-mormon-reference.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const kuromoji = require('kuromoji');
const wanakana = require('wanakana');

const SOURCE_PAGE =
  'https://www.churchofjesuschrist.org/study/manual/translations-and-downloads/languages/japanese?lang=eng';
const EPUB_URL =
  'https://assets.churchofjesuschrist.org/szmcpa812351zvkabgc3bg3d7emz72prqh973sfb.epub';

const BOOK_IDS = [
  '1-nephi',
  '2-nephi',
  'jacob',
  'enos',
  'jarom',
  'omni',
  'words-of-mormon',
  'mosiah',
  'alma',
  'helaman',
  '3-nephi',
  '4-nephi',
  'mormon',
  'ether',
  'moroni',
];

const ENGLISH_BOOK_TITLES = [
  '1 Nephi',
  '2 Nephi',
  'Jacob',
  'Enos',
  'Jarom',
  'Omni',
  'Words of Mormon',
  'Mosiah',
  'Alma',
  'Helaman',
  '3 Nephi',
  '4 Nephi',
  'Mormon',
  'Ether',
  'Moroni',
];

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT_DIR = path.join(ROOT_DIR, 'input');
const EPUB_PATH = path.join(INPUT_DIR, 'japanese-book-of-mormon.epub');
const OUTPUT_PATH = path.join(ROOT_DIR, 'src', 'data', 'bookOfMormon.ja.furigana.json');
const EXTRACT_DIR = path.join(INPUT_DIR, '.japanese-book-of-mormon-furigana-epub');

async function main() {
  fs.mkdirSync(INPUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  await downloadEpub(EPUB_URL, EPUB_PATH);
  extractEpub(EPUB_PATH, EXTRACT_DIR);

  const opfPath = findPackagePath(EXTRACT_DIR);
  const oebpsDir = path.dirname(opfPath);
  const opf = readUtf8(opfPath);
  const spineHrefs = parseSpineHrefs(opf);
  const bookNavPoints = parseBookNavPoints(readUtf8(path.join(oebpsDir, 'toc.ncx')));
  const allContentHtml = spineHrefs.map((href) => readUtf8(path.join(oebpsDir, href))).join('\n');
  const sourceHasRuby = hasRubyMarkup(allContentHtml);
  const tokenizer = sourceHasRuby ? null : await createTokenizer();
  const books = buildBooks(bookNavPoints, spineHrefs, oebpsDir, { sourceHasRuby, tokenizer });

  const output = {
    language: 'ja',
    hasFurigana: true,
    sourceHasRuby,
    sourcePage: SOURCE_PAGE,
    books,
  };

  const validation = validateOutput(output);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });

  const summary = summarize(output);
  console.log(`Source page: ${SOURCE_PAGE}`);
  console.log(`Downloaded EPUB: ${path.relative(ROOT_DIR, EPUB_PATH)}`);
  console.log(`Ruby markup found in source EPUB: ${sourceHasRuby ? 'yes' : 'no'}`);
  console.log(`Wrote: ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
  console.log(`Books: ${summary.books}`);
  console.log(`Chapters: ${summary.chapters}`);
  console.log(`Verses: ${summary.verses}`);
  console.log(`Missing books: ${validation.missingBooks.length}`);
  console.log(`Missing chapters: ${validation.missingChapters.length}`);
  console.log(`Missing verses: ${validation.missingVerses.length}`);
  console.log(`Empty text verses: ${validation.emptyTextVerses.length}`);
  console.log(`Empty html verses: ${validation.emptyHtmlVerses.length}`);
  console.log(
    `Kanji segment reading coverage: ${validation.kanjiReadingCoveragePercent.toFixed(2)}% ` +
      `(${validation.kanjiSegmentsWithReadings}/${validation.kanjiSegments})`,
  );

  if (
    validation.missingBooks.length ||
    validation.missingChapters.length ||
    validation.missingVerses.length ||
    validation.emptyTextVerses.length ||
    validation.emptyHtmlVerses.length
  ) {
    console.log('Validation details:');
    for (const [name, values] of Object.entries(validation)) {
      if (Array.isArray(values) && values.length) {
        console.log(`${name}: ${values.slice(0, 20).join(', ')}${values.length > 20 ? ' ...' : ''}`);
      }
    }
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
    if (fs.existsSync(path.join(destinationDir, 'META-INF', 'container.xml'))) {
      return;
    }
  } catch {
    // Fall back to platform-specific extraction below.
  }

  if (process.platform === 'win32') {
    const zipPath = path.join(os.tmpdir(), `japanese-book-of-mormon-${Date.now()}.zip`);
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

function findPackagePath(extractDir) {
  const containerXml = readUtf8(path.join(extractDir, 'META-INF', 'container.xml'));
  const match = containerXml.match(/full-path="([^"]+)"/);
  if (!match) {
    throw new Error('Could not find EPUB package path in META-INF/container.xml.');
  }
  return path.join(extractDir, match[1]);
}

function parseSpineHrefs(opf) {
  const manifest = new Map();
  for (const match of opf.matchAll(/<item\b([^>]+)>/g)) {
    const attributes = parseAttributes(match[1]);
    if (attributes.id && attributes.href) {
      manifest.set(attributes.id, decodeEntities(attributes.href));
    }
  }

  return [...opf.matchAll(/<itemref\b([^>]+)>/g)]
    .map((match) => parseAttributes(match[1]).idref)
    .filter((idref) => idref && manifest.has(idref))
    .map((idref) => manifest.get(idref));
}

function parseBookNavPoints(ncx) {
  const navPoints = [];
  const tokenPattern =
    /<navPoint\b[^>]*>|<\/navPoint>|<text>([\s\S]*?)<\/text>|<content\b([^>]*)\/>/g;
  let depth = 0;
  let current = null;

  for (const match of ncx.matchAll(tokenPattern)) {
    const token = match[0];
    if (token.startsWith('<navPoint')) {
      depth += 1;
      if (depth === 1) current = { title: '', src: '' };
    } else if (token === '</navPoint>') {
      if (depth === 1 && current) navPoints.push(current);
      current = depth === 1 ? null : current;
      depth -= 1;
    } else if (current && depth === 1 && match[1] !== undefined) {
      current.title = cleanPlainText(match[1]);
    } else if (current && depth === 1 && match[2] !== undefined) {
      current.src = decodeEntities(parseAttributes(match[2]).src || '');
    }
  }

  const firstBookIndex = navPoints.findIndex((point) => point.src.startsWith('13_Chapter01.xhtml'));
  const lastBookIndex = navPoints.findIndex((point) => point.src.startsWith('27_Chapter15.xhtml'));
  if (firstBookIndex === -1 || lastBookIndex === -1 || lastBookIndex < firstBookIndex) {
    throw new Error('Could not locate the Book of Mormon book range in toc.ncx.');
  }

  const books = navPoints.slice(firstBookIndex, lastBookIndex + 1);
  if (books.length !== BOOK_IDS.length) {
    throw new Error(`Expected ${BOOK_IDS.length} books, found ${books.length}.`);
  }
  return books;
}

function buildBooks(bookNavPoints, spineHrefs, oebpsDir, options) {
  return bookNavPoints.map((bookPoint, index) => {
    const startHref = bookPoint.src.split('#')[0];
    const nextHref = bookNavPoints[index + 1]?.src.split('#')[0];
    const startIndex = spineHrefs.indexOf(startHref);
    const endIndex = nextHref ? spineHrefs.indexOf(nextHref) : spineHrefs.indexOf('28_Bm01.xhtml');

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      throw new Error(`Could not map spine range for ${bookPoint.title}.`);
    }

    const html = spineHrefs
      .slice(startIndex, endIndex)
      .map((href) => readUtf8(path.join(oebpsDir, href)))
      .join('\n');

    return {
      id: BOOK_IDS[index],
      title: bookPoint.title,
      chapters: extractChapters(html, bookPoint.title, options),
    };
  });
}

function extractChapters(html, bookTitle, options) {
  const chapterHeadingPattern = /<h2\b[^>]*\bid="sec\d+-\d+"[^>]*>[\s\S]*?<\/h2>/g;
  const headings = [...html.matchAll(chapterHeadingPattern)];
  if (headings.length === 0) {
    throw new Error(`No chapter headings found for ${bookTitle}.`);
  }

  return headings.map((heading, index) => {
    const headingText = cleanPlainText(heading[0]);
    const chapterMatch = headingText.match(/第\s*(\d+)\s*章/);
    if (!chapterMatch) {
      throw new Error(`Could not parse chapter number from ${headingText}.`);
    }

    const start = heading.index + heading[0].length;
    const end =
      index + 1 < headings.length ? headings[index + 1].index : html.indexOf('<hr class="line"', start);
    const chapterHtml = html.slice(start, end === -1 ? undefined : end);

    return {
      chapter: Number(chapterMatch[1]),
      verses: extractVerses(chapterHtml, bookTitle, Number(chapterMatch[1]), options),
    };
  });
}

function extractVerses(chapterHtml, bookTitle, chapterNumber, options) {
  const verses = [];
  const paragraphPattern = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  let expectedVerse = 1;

  for (const match of chapterHtml.matchAll(paragraphPattern)) {
    const attributes = parseAttributes(match[1]);
    if (!/^(?:noindent(?:t1|d)?|indent)$/.test(attributes.class || '')) continue;
    if (/^\s*(?:\d+\s*)?<i>/.test(match[2])) continue;

    const paragraphHtml = match[2];
    const plain = cleanPlainText(paragraphHtml);
    const parsedVerses = parseVerseParagraph(plain, expectedVerse);
    if (parsedVerses.length === 0) continue;

    if (options.sourceHasRuby && parsedVerses.length === 1) {
      verses.push(createVerseFromSourceRuby(parsedVerses[0].verse, paragraphHtml));
    } else {
      for (const parsedVerse of parsedVerses) {
        verses.push(createVerse(parsedVerse.verse, parsedVerse.text, options));
      }
    }
    expectedVerse = parsedVerses.at(-1).verse + 1;
  }

  if (verses.length === 0) {
    throw new Error(`No verses found for ${bookTitle} ${chapterNumber}.`);
  }
  return verses;
}

function createVerse(verse, text, options) {
  const segments = generateSegments(text, options.tokenizer);
  return {
    verse,
    text,
    html: segmentsToHtml(segments),
    segments,
  };
}

function createVerseFromSourceRuby(verse, paragraphHtml) {
  const segments = removeLeadingVerseSegment(segmentsFromRubyHtml(stripLeadingVerseMarker(paragraphHtml)));
  return {
    verse,
    text: segments.map((segment) => segment.base).join('').replace(/\s+/g, ' ').trim(),
    html: segmentsToHtml(segments),
    segments,
  };
}

function removeLeadingVerseSegment(segments) {
  if (!segments.length) return segments;
  const nextSegments = segments.map((segment) => ({ ...segment }));
  nextSegments[0].base = nextSegments[0].base.replace(/^\s*\d+\s*/, '');
  return nextSegments.filter((segment) => segment.base);
}

function parseVerseParagraph(text, expectedVerse) {
  const leadingVerseMatch = text.match(/^(\d+(?:\s+\d+)*)\s+(.+)$/);
  if (!leadingVerseMatch) {
    if (expectedVerse === 1 && text) return [{ verse: 1, text }];
    return [];
  }

  const leadingNumbers = leadingVerseMatch[1].split(/\s+/);
  const joinedNumber = Number(leadingNumbers.join(''));
  const lastNumber = Number(leadingNumbers.at(-1));
  const verseNumber = joinedNumber === expectedVerse ? joinedNumber : lastNumber;
  if (verseNumber < expectedVerse) return [];

  const parsed = [];
  let verse = verseNumber;
  let verseText = leadingVerseMatch[2].trim();

  while (verseText) {
    const nextVerse = verse + 1;
    const nextVersePattern = new RegExp(`(^|\\s)${nextVerse}\\s+`);
    const nextVerseMatch = nextVersePattern.exec(verseText);

    if (!nextVerseMatch || nextVerseMatch.index === 0) {
      parsed.push({ verse, text: verseText.trim() });
      break;
    }

    const markerStart = nextVerseMatch.index + nextVerseMatch[1].length;
    const markerEnd = markerStart + String(nextVerse).length;
    parsed.push({ verse, text: verseText.slice(0, markerStart).trim() });
    verseText = verseText.slice(markerEnd).trim();
    verse = nextVerse;
  }

  return parsed;
}

function hasRubyMarkup(html) {
  return /<(?:ruby|rt|rp)\b/i.test(html) || /\b(?:ruby|rt|rp|furigana|annotation)\b/i.test(html);
}

function generateSegments(text, tokenizer) {
  const tokens = tokenizer.tokenize(text);
  return tokens.map((token) => {
    const base = token.surface_form;
    if (!containsKanji(base)) {
      return { base, reading: null };
    }

    const reading = token.reading && /^[ァ-ヴー]+$/.test(token.reading)
      ? wanakana.toHiragana(token.reading)
      : null;

    return { base, reading };
  });
}

function segmentsToHtml(segments) {
  return segments
    .map((segment) => {
      const base = escapeHtml(segment.base);
      if (!segment.reading || !containsKanji(segment.base)) return base;
      return `<ruby>${base}<rt>${escapeHtml(segment.reading)}</rt></ruby>`;
    })
    .join('');
}

function validateOutput(output) {
  const missingBooks = [];
  const missingChapters = [];
  const missingVerses = [];
  const emptyTextVerses = [];
  const emptyHtmlVerses = [];
  let kanjiSegments = 0;
  let kanjiSegmentsWithReadings = 0;

  const outputBookMap = new Map(output.books.map((book) => [book.id, book]));

  ENGLISH_BOOK_TITLES.forEach((englishTitle, index) => {
    const bookId = BOOK_IDS[index];
    const sourceBook = englishReference[englishTitle];
    const outputBook = outputBookMap.get(bookId);
    if (!outputBook) {
      missingBooks.push(`${bookId}`);
      return;
    }

    for (const chapterNumber of Object.keys(sourceBook).filter((key) => /^\d+$/.test(key))) {
      const outputChapter = outputBook.chapters.find((chapter) => Number(chapter.chapter) === Number(chapterNumber));
      if (!outputChapter) {
        missingChapters.push(`${bookId} ${chapterNumber}`);
        continue;
      }

      const outputVerseMap = new Map(outputChapter.verses.map((verse) => [Number(verse.verse), verse]));
      for (const verseNumber of Object.keys(sourceBook[chapterNumber]).filter((key) => /^\d+$/.test(key))) {
        const verse = outputVerseMap.get(Number(verseNumber));
        const location = `${bookId} ${chapterNumber}:${verseNumber}`;
        if (!verse) {
          missingVerses.push(location);
          continue;
        }
        if (!verse.text?.trim()) emptyTextVerses.push(location);
        if (!verse.html?.trim()) emptyHtmlVerses.push(location);

        for (const segment of verse.segments ?? []) {
          if (containsKanji(segment.base)) {
            kanjiSegments += 1;
            if (segment.reading) kanjiSegmentsWithReadings += 1;
          }
        }
      }
    }
  });

  return {
    missingBooks,
    missingChapters,
    missingVerses,
    emptyTextVerses,
    emptyHtmlVerses,
    kanjiSegments,
    kanjiSegmentsWithReadings,
    kanjiReadingCoveragePercent: kanjiSegments
      ? (kanjiSegmentsWithReadings / kanjiSegments) * 100
      : 0,
  };
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

function cleanPlainText(html) {
  return decodeEntities(
    html
      .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/g, '')
      .replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/g, '')
      .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/g, '')
      .replace(/<span\b[^>]*\brole="doc-pagebreak"[^>]*\/>/g, ' ')
      .replace(/<span\b[^>]*\brole="doc-pagebreak"[^>]*>\s*<\/span>/g, ' ')
      .replace(/<a\b[^>]*\brole="doc-noteref"[\s\S]*?<\/a>/g, '')
      .replace(/<img\b[^>]*>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/ {2,}/g, ' ')
      .trim(),
  );
}

function stripLeadingVerseMarker(html) {
  return html.replace(/^\s*(?:<[^>]+>\s*)*\d+(?:\s|&nbsp;)+/, '');
}

function segmentsFromRubyHtml(html) {
  const cleaned = sanitizeVerseHtml(html);
  const segments = [];
  const rubyPattern = /<ruby\b[^>]*>[\s\S]*?<\/ruby>/gi;
  let cursor = 0;

  for (const match of cleaned.matchAll(rubyPattern)) {
    appendPlainSegment(segments, cleaned.slice(cursor, match.index));
    segments.push(segmentFromRuby(match[0]));
    cursor = match.index + match[0].length;
  }

  appendPlainSegment(segments, cleaned.slice(cursor));
  return mergeAdjacentPlainSegments(segments).filter((segment) => segment.base);
}

function segmentFromRuby(rubyHtml) {
  const rtMatch = rubyHtml.match(/<rt\b[^>]*>([\s\S]*?)<\/rt>/i);
  const rbMatches = [...rubyHtml.matchAll(/<rb\b[^>]*>([\s\S]*?)<\/rb>/gi)];
  const baseHtml = rbMatches.length
    ? rbMatches.map((match) => match[1]).join('')
    : rubyHtml.replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, '').replace(/<\/?ruby\b[^>]*>/gi, '');
  const base = cleanSegmentText(baseHtml);
  const reading = rtMatch ? cleanSegmentText(rtMatch[1]) : null;

  return {
    base,
    reading: containsKanji(base) && reading ? reading : null,
  };
}

function appendPlainSegment(segments, html) {
  const text = cleanSegmentText(html);
  if (text) {
    segments.push({ base: text, reading: null });
  }
}

function mergeAdjacentPlainSegments(segments) {
  const merged = [];
  for (const segment of segments) {
    const previous = merged.at(-1);
    if (previous && !previous.reading && !segment.reading) {
      previous.base += segment.base;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

function sanitizeVerseHtml(html) {
  return html
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<span\b[^>]*\brole="doc-pagebreak"[^>]*\/>/gi, ' ')
    .replace(/<span\b[^>]*\brole="doc-pagebreak"[^>]*>\s*<\/span>/gi, ' ')
    .replace(/<a\b[^>]*\brole="doc-noteref"[\s\S]*?<\/a>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<\/?(?:span|strong|em|i|b)\b[^>]*>/gi, '')
    .replace(/<(?!\/?(?:ruby|rb|rt|rp)\b)[^>]+>/gi, '');
}

function cleanSegmentText(html) {
  return decodeEntities(
    html
      .replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/ {2,}/g, ' '),
  );
}

function parseAttributes(attributeText) {
  const attributes = {};
  for (const match of attributeText.matchAll(/([:\w-]+)\s*=\s*"([^"]*)"/g)) {
    attributes[match[1]] = decodeEntities(match[2]);
  }
  return attributes;
}

function createTokenizer() {
  const dicPath = path.dirname(require.resolve('kuromoji/dict/base.dat.gz'));
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((error, tokenizer) => {
      if (error) reject(error);
      else resolve(tokenizer);
    });
  });
}

function containsKanji(value) {
  return /\p{Script=Han}/u.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
