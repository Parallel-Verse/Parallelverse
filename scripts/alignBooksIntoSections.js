import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const booksDir = path.join(process.cwd(), 'src', 'data', 'books');
const files = (await readdir(booksDir)).filter((file) => file.endsWith('.json')).sort();
const books = [];

for (const file of files) {
  books.push({ file, data: JSON.parse(await readFile(path.join(booksDir, file), 'utf8')) });
}

const byBook = books.reduce((acc, entry) => {
  acc[entry.data.bookId] = acc[entry.data.bookId] ?? [];
  acc[entry.data.bookId].push(entry);
  return acc;
}, {});

function sentencesFromText(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?;:。！？»”’])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function chunkReferenceText(text, targetChars = 360) {
  const sentences = sentencesFromText(text);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (current && next.length > targetChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : [text.trim()].filter(Boolean);
}

function distributeSentences(text, count) {
  const sentences = sentencesFromText(text);
  if (!sentences.length || count <= 1) return [text.trim()].filter(Boolean);
  if (sentences.length <= count) return sentences;

  const chunks = [];
  for (let index = 0; index < count; index += 1) {
    const start = Math.floor((index * sentences.length) / count);
    const end = index === count - 1 ? sentences.length : Math.floor(((index + 1) * sentences.length) / count);
    const textChunk = sentences.slice(start, Math.max(start + 1, end)).join(' ').trim();
    if (textChunk) chunks.push(textChunk);
  }

  return chunks;
}

function chapterText(chapter) {
  return chapter.sections.map((section) => section.text).join('\n\n');
}

for (const [bookId, entries] of Object.entries(byBook)) {
  const reference = entries.find((entry) => entry.data.language === 'en') ?? entries[0];

  for (const refChapter of reference.data.chapters) {
    const refText = chapterText(refChapter);
    const refChunks = chunkReferenceText(refText);

    for (const entry of entries) {
      const chapter = entry.data.chapters.find((candidate) => candidate.chapterId === refChapter.chapterId);
      if (!chapter) continue;

      const chunks = entry === reference ? refChunks : distributeSentences(chapterText(chapter), refChunks.length);

      chapter.sections = chunks.map((text, index) => ({
        sectionId: `${refChapter.chapterId}-s${index + 1}`,
        text,
      }));
    }
  }

  console.log(
    `${bookId}: aligned ${entries.map((entry) => entry.data.language).join(', ')} to ${reference.data.chapters.length} reference chapters`,
  );
}

for (const entry of books) {
  await writeFile(path.join(booksDir, entry.file), `${JSON.stringify(entry.data, null, 2)}\n`, 'utf8');
}
