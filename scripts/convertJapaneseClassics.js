import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { japaneseClassics } from './japaneseClassicsConfig.js';
import { cleanAozoraText, splitJapaneseUnits, syncId } from './japaneseClassicsTextUtils.js';

const rawDir = path.join(process.cwd(), 'input', 'raw', 'japanese-classics');
const outRoot = path.join(process.cwd(), 'src', 'data', 'books');

await mkdir(outRoot, { recursive: true });

for (const book of japaneseClassics) {
  const outDir = path.join(outRoot, book.bookId);
  await mkdir(outDir, { recursive: true });
  const source = JSON.parse(await readFile(path.join(rawDir, `${book.bookId}.ja.source.json`), 'utf8'));
  const text = cleanAozoraText(await readFile(path.join(rawDir, `${book.bookId}.ja.txt`), 'utf8'));
  const chapters = splitJapaneseChapters(book, text);

  const json = {
    bookId: book.bookId,
    title: book.title,
    originalTitle: book.originalTitle,
    author: book.author,
    language: 'ja',
    source: {
      name: source.name,
      url: source.url ?? source.cardUrl,
      licenseNote: source.licenseNote,
      ...(source.maxChapters ? { coverageNote: `Limited to first ${source.maxChapters} chapters to match available public-domain English translation.` } : {}),
    },
    chapters: chapters.map((chapter, chapterIndex) => ({
      chapter: chapterIndex + 1,
      title: chapter.title,
      units: splitJapaneseUnits(chapter.text).map((unitText, unitIndex) => ({
        unit: unitIndex + 1,
        syncId: syncId(book.bookId, chapterIndex + 1, unitIndex),
        text: unitText,
      })),
    })),
  };

  await writeFile(path.join(outDir, `${book.bookId}.ja.json`), `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${book.bookId}.ja.json`);
}

function splitJapaneseChapters(book, text) {
  if (book.bookId === 'ten-nights-dreams') {
    const labels = ['第一夜', '第二夜', '第三夜', '第四夜', '第五夜', '第六夜', '第七夜', '第八夜', '第九夜', '第十夜'];
    return splitByLabels(text, labels);
  }

  if (book.bookId === 'kokoro') {
    return splitByLabels(text, ['上　先生と私', '中　両親と私', '下　先生と遺書']);
  }

  if (book.bookId === 'i-am-a-cat') {
    const chapters = splitBySimpleNumberLines(text).slice(0, book.ja.maxChapters ?? Number.POSITIVE_INFINITY);
    return chapters.length ? chapters : [{ title: 'Chapter 1', text }];
  }

  return [{ title: book.originalTitle, text }];
}

function splitByLabels(text, labels) {
  const chapters = [];
  for (let index = 0; index < labels.length; index += 1) {
    const start = text.indexOf(labels[index]);
    if (start < 0) continue;
    const nextStarts = labels.slice(index + 1).map((label) => text.indexOf(label)).filter((value) => value > start);
    const end = nextStarts.length ? Math.min(...nextStarts) : text.length;
    chapters.push({ title: labels[index], text: text.slice(start + labels[index].length, end).trim() });
  }
  return chapters.length ? chapters : [{ title: labels[0] ?? 'Text', text }];
}

function splitBySimpleNumberLines(text) {
  const matches = [...text.matchAll(/\n([一二三四五六七八九十]+)\n/g)];
  if (!matches.length) return [];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    return { title: match[1], text: text.slice(start, end).trim() };
  });
}
