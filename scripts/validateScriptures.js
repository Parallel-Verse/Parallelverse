import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import englishReference from '../src/data/book-of-mormon-reference.json' with { type: 'json' };

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT_DIR, 'src', 'data');

const BOOKS = [
  { id: '1-nephi', englishTitle: '1 Nephi' },
  { id: '2-nephi', englishTitle: '2 Nephi' },
  { id: 'jacob', englishTitle: 'Jacob' },
  { id: 'enos', englishTitle: 'Enos' },
  { id: 'jarom', englishTitle: 'Jarom' },
  { id: 'omni', englishTitle: 'Omni' },
  { id: 'words-of-mormon', englishTitle: 'Words of Mormon' },
  { id: 'mosiah', englishTitle: 'Mosiah' },
  { id: 'alma', englishTitle: 'Alma' },
  { id: 'helaman', englishTitle: 'Helaman' },
  { id: '3-nephi', englishTitle: '3 Nephi' },
  { id: '4-nephi', englishTitle: '4 Nephi' },
  { id: 'mormon', englishTitle: 'Mormon' },
  { id: 'ether', englishTitle: 'Ether' },
  { id: 'moroni', englishTitle: 'Moroni' },
];

const languageFiles = [
  ['es', 'bookOfMormon.es.json'],
  ['zho', 'bookOfMormon.zho.json'],
  ['ceb', 'bookOfMormon.ceb.json'],
  ['pt', 'bookOfMormon.pt.json'],
  ['fr', 'bookOfMormon.fr.json'],
  ['de', 'bookOfMormon.de.json'],
  ['ja', 'bookOfMormon.ja.json'],
  ['ja-furigana', 'bookOfMormon.ja.furigana.json'],
  ['ko', 'bookOfMormon.ko.json'],
  ['smo', 'bookOfMormon.smo.json'],
  ['ton', 'bookOfMormon.ton.json'],
  ['tl', 'bookOfMormon.tl.json'],
];

const englishVerseCount = countEnglishVerses();
console.log(`English reference verses: ${englishVerseCount}`);

let hasErrors = false;
for (const [language, fileName] of languageFiles) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    hasErrors = true;
    console.log(`\n${language}: missing file ${fileName}`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const result = validateLanguage(data);
  hasErrors = hasErrors || !result.valid;

  console.log(`\n${language} (${fileName})`);
  console.log(`Total verses: ${result.totalVerses}`);
  console.log(`Missing books: ${result.missingBooks.length}`);
  console.log(`Missing chapters: ${result.missingChapters.length}`);
  console.log(`Missing verses: ${result.missingVerses.length}`);
  console.log(`Duplicate verses: ${result.duplicateVerses.length}`);
  console.log(`Empty verses: ${result.emptyVerses.length}`);

  for (const [name, values] of Object.entries(result)) {
    if (Array.isArray(values) && values.length) {
      console.log(`${name}: ${values.slice(0, 30).join(', ')}${values.length > 30 ? ' ...' : ''}`);
    }
  }
}

if (hasErrors && process.argv.includes('--strict')) {
  process.exitCode = 1;
}

function validateLanguage(data) {
  const missingBooks = [];
  const missingChapters = [];
  const missingVerses = [];
  const duplicateVerses = [];
  const emptyVerses = [];
  let totalVerses = 0;

  const bookMap = new Map((data.books ?? []).map((book) => [book.id, book]));

  for (const book of BOOKS) {
    const expectedBook = englishReference[book.englishTitle];
    const actualBook = bookMap.get(book.id);
    if (!actualBook) {
      missingBooks.push(book.id);
      continue;
    }

    for (const chapterNumber of Object.keys(expectedBook).filter((key) => /^\d+$/.test(key))) {
      const actualChapter = actualBook.chapters?.find(
        (chapter) => Number(chapter.chapter) === Number(chapterNumber),
      );
      if (!actualChapter) {
        missingChapters.push(`${book.id} ${chapterNumber}`);
        continue;
      }

      const seen = new Set();
      for (const verse of actualChapter.verses ?? []) {
        const verseNumber = Number(verse.verse);
        totalVerses += 1;
        if (seen.has(verseNumber)) duplicateVerses.push(`${book.id} ${chapterNumber}:${verseNumber}`);
        seen.add(verseNumber);
        const text = verse.text ?? stripHtml(verse.html ?? '');
        if (!String(text).trim()) emptyVerses.push(`${book.id} ${chapterNumber}:${verseNumber}`);
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
    totalVerses,
    missingBooks,
    missingChapters,
    missingVerses,
    duplicateVerses,
    emptyVerses,
  };
}

function countEnglishVerses() {
  return BOOKS.reduce((bookSum, book) => {
    const expectedBook = englishReference[book.englishTitle];
    return (
      bookSum +
      Object.keys(expectedBook)
        .filter((key) => /^\d+$/.test(key))
        .reduce(
          (chapterSum, chapterNumber) =>
            chapterSum +
            Object.keys(expectedBook[chapterNumber]).filter((key) => /^\d+$/.test(key)).length,
          0,
        )
    );
  }, 0);
}

function stripHtml(value) {
  return String(value).replace(/<[^>]+>/g, '');
}
