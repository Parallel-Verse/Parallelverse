import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const booksDir = path.join(process.cwd(), 'src', 'data', 'books');
const files = await listJsonFiles(booksDir);
const books = [];

for (const file of files) {
  const json = normalizeBook(JSON.parse(await readFile(file, 'utf8')));
  books.push({ file, ...json });
}

async function listJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listJsonFiles(fullPath)));
    else if (entry.name.endsWith('.json')) files.push(fullPath);
  }
  return files.sort();
}

function normalizeBook(book) {
  return {
    ...book,
    chapters: book.chapters.map((chapter, index) => ({
      chapterId: chapter.chapterId ?? `chapter-${chapter.chapter ?? index + 1}`,
      ...chapter,
      sections:
        chapter.sections ??
        chapter.units?.map((unit) => ({
          sectionId: unit.syncId,
          text: unit.text,
        })) ??
        [],
    })),
  };
}

const grouped = books.reduce((acc, book) => {
  acc[book.bookId] = acc[book.bookId] ?? [];
  acc[book.bookId].push(book);
  return acc;
}, {});

console.log('Available books');
for (const [bookId, translations] of Object.entries(grouped)) {
  console.log(`- ${bookId}: ${translations.map((book) => book.language).join(', ')}`);
}

const warnings = [];
const errors = [];

function endsLikeSentence(text) {
  return /([.!?;:。！？»«”’)"'\]]|THE END|FIN)$/.test(text.trim());
}

for (const [bookId, translations] of Object.entries(grouped)) {
  const reference = translations.find((book) => book.language === 'en') ?? translations[0];
  const referenceChapterIds = new Set(reference.chapters.map((chapter) => chapter.chapterId));

  for (const book of translations) {
    const chapterIds = new Set(book.chapters.map((chapter) => chapter.chapterId));
    for (const chapterId of referenceChapterIds) {
      if (!chapterIds.has(chapterId)) errors.push(`${bookId}.${book.language}: missing ${chapterId}`);
    }

    for (const chapter of book.chapters) {
      const ids = new Set();
      if (!chapter.sections.length) errors.push(`${bookId}.${book.language}:${chapter.chapterId}: empty chapter`);

      for (const section of chapter.sections) {
        if (!section.text?.trim()) errors.push(`${bookId}.${book.language}:${section.sectionId}: empty section`);
        if (ids.has(section.sectionId)) errors.push(`${bookId}.${book.language}:${section.sectionId}: duplicate section ID`);
        if (!section.unit && bookId !== 'alice' && !endsLikeSentence(section.text)) {
          warnings.push(`${bookId}.${book.language}:${section.sectionId}: section does not end on sentence punctuation`);
        }
        ids.add(section.sectionId);
      }

      const refChapter = reference.chapters.find((candidate) => candidate.chapterId === chapter.chapterId);
      if (refChapter && refChapter.sections.length !== chapter.sections.length) {
        warnings.push(
          `${bookId}.${book.language}:${chapter.chapterId}: paragraph count ${chapter.sections.length} differs from reference ${refChapter.sections.length}`,
        );
      }
    }
  }
}

if (warnings.length) {
  console.log('\nValidation warnings');
  for (const warning of warnings) console.log(`- ${warning}`);
} else {
  console.log('\nNo validation warnings.');
}

if (errors.length) {
  console.log('\nValidation errors');
  for (const error of errors) console.log(`- ${error}`);
  process.exitCode = 1;
}
