import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { japaneseClassics } from './japaneseClassicsConfig.js';

const outRoot = path.join(process.cwd(), 'src', 'data', 'books');
const reportsDir = path.join(process.cwd(), 'reports');
await mkdir(reportsDir, { recursive: true });

const report = { valid: true, books: [], errors: [] };

for (const book of japaneseClassics) {
  const dir = path.join(outRoot, book.bookId);
  const ja = await readJson(path.join(dir, `${book.bookId}.ja.json`));
  const en = await readJson(path.join(dir, `${book.bookId}.en.json`));
  const furigana = await readJson(path.join(dir, `${book.bookId}.ja.furigana.json`));
  const summary = { bookId: book.bookId, chapters: ja.chapters.length, units: 0, needsReview: 0, furigana: furigana.furiganaStats };

  for (const candidate of [ja, en, furigana]) {
    if (!candidate.source?.name || !candidate.source?.url || !candidate.source?.licenseNote) {
      report.errors.push(`${candidate.bookId}.${candidate.language}: missing source metadata`);
    }
  }

  compareStructures(book.bookId, 'en', ja, en);
  compareStructures(book.bookId, 'ja.furigana', ja, furigana);

  const seen = new Set();
  for (const chapter of ja.chapters) {
    for (const unit of chapter.units) {
      summary.units += 1;
      if (!unit.text?.trim()) report.errors.push(`${book.bookId}.ja ${unit.syncId}: empty text`);
      if (seen.has(unit.syncId)) report.errors.push(`${book.bookId}.ja ${unit.syncId}: duplicate syncId`);
      seen.add(unit.syncId);
    }
  }

  for (const chapter of en.chapters) {
    for (const unit of chapter.units) {
      if (!unit.text?.trim()) report.errors.push(`${book.bookId}.en ${unit.syncId}: empty text`);
      if (unit.needsReview) summary.needsReview += 1;
    }
  }

  report.books.push(summary);
}

report.valid = report.errors.length === 0;
await writeFile(path.join(reportsDir, 'japanese-classics-validation.json'), `${JSON.stringify(report, null, 2)}\n`);

if (report.errors.length) {
  console.log('Japanese classics validation errors');
  for (const error of report.errors) console.log(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Japanese classics validation passed');
  for (const book of report.books) {
    console.log(`- ${book.bookId}: ${book.units} units, needsReview ${book.needsReview}, furigana ${book.furigana?.percentWithReadings ?? 0}%`);
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function compareStructures(bookId, language, reference, candidate) {
  if (reference.chapters.length !== candidate.chapters.length) {
    report.errors.push(`${bookId}.${language}: chapter count differs`);
    return;
  }
  for (let chapterIndex = 0; chapterIndex < reference.chapters.length; chapterIndex += 1) {
    const refUnits = reference.chapters[chapterIndex].units;
    const units = candidate.chapters[chapterIndex].units;
    if (refUnits.length !== units.length) report.errors.push(`${bookId}.${language}: chapter ${chapterIndex + 1} unit count differs`);
    for (let unitIndex = 0; unitIndex < Math.min(refUnits.length, units.length); unitIndex += 1) {
      if (refUnits[unitIndex].syncId !== units[unitIndex].syncId) {
        report.errors.push(`${bookId}.${language}: syncId mismatch at chapter ${chapterIndex + 1} unit ${unitIndex + 1}`);
      }
    }
  }
}
