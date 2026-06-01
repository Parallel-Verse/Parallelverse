import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const booksDir = path.join(root, 'src', 'data', 'books');
const reportsDir = path.join(root, 'reports');
const multilingualBookIds = new Set(['alice', 'christmas-carol', 'eighty-days', 'grimm', 'sherlock-holmes']);
const targetUnitChars = 185;

const files = await listJsonFiles(booksDir);
const entries = [];

for (const file of files) {
  const book = JSON.parse(await readFile(file, 'utf8'));
  if (multilingualBookIds.has(book.bookId)) entries.push({ file, book: normalizeBook(book) });
}

const grouped = entries.reduce((acc, entry) => {
  acc[entry.book.bookId] = acc[entry.book.bookId] ?? [];
  acc[entry.book.bookId].push(entry);
  return acc;
}, {});

await mkdir(reportsDir, { recursive: true });

const fullReport = {
  generatedAt: new Date().toISOString(),
  books: [],
};

for (const [bookId, bookEntries] of Object.entries(grouped)) {
  const reference = bookEntries.find((entry) => entry.book.language === 'en');
  if (!reference) {
    console.warn(`${bookId}: skipped, no English reference`);
    continue;
  }

  const report = {
    bookId,
    title: reference.book.title,
    languages: bookEntries.map((entry) => entry.book.language).sort(),
    chapters: [],
    needsReview: 0,
  };

  for (const refChapter of reference.book.chapters) {
    const refText = chapterText(refChapter);
    const masterUnits = splitSemanticUnits(refText, targetUnitChars);
    const chapterReport = {
      chapterId: refChapter.chapterId,
      title: refChapter.title,
      units: masterUnits.length,
      languages: {},
      questionable: [],
    };

    for (const entry of bookEntries) {
      const chapter = entry.book.chapters.find((candidate) => candidate.chapterId === refChapter.chapterId);
      if (!chapter) continue;

      const units =
        entry === reference
          ? masterUnits.map((text, index) => ({
              unit: index + 1,
              sectionId: syncId(bookId, refChapter.chapterId, index),
              text,
            }))
          : alignTranslationUnits({
              bookId,
              chapterId: refChapter.chapterId,
              masterUnits,
              translationText: chapterText(chapter),
            });

      chapter.sections = units;

      const needsReview = units.filter((unit) => unit.needsReview).length;
      report.needsReview += needsReview;
      chapterReport.languages[entry.book.language] = {
        units: units.length,
        needsReview,
      };

      for (const unit of units.filter((candidate) => candidate.needsReview).slice(0, 4)) {
        const master = masterUnits[unit.unit - 1] ?? '';
        chapterReport.questionable.push({
          language: entry.book.language,
          syncId: unit.sectionId,
          english: snippet(master),
          translation: snippet(unit.text),
        });
      }
    }

    report.chapters.push(chapterReport);
  }

  for (const entry of bookEntries) {
    await writeFile(entry.file, `${JSON.stringify(toOutputBook(entry.book), null, 2)}\n`, 'utf8');
  }

  await writeFile(path.join(reportsDir, `${bookId}-semantic-alignment-report.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(reportsDir, `${bookId}-semantic-alignment-report.md`), markdownReport(report), 'utf8');
  fullReport.books.push(report);
  console.log(`${bookId}: ${report.languages.join(', ')} aligned; needs review ${report.needsReview}`);
}

await writeFile(path.join(reportsDir, 'semantic-alignment-report.json'), `${JSON.stringify(fullReport, null, 2)}\n`, 'utf8');
await writeFile(path.join(reportsDir, 'semantic-alignment-report.md'), markdownFullReport(fullReport), 'utf8');

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
      ...chapter,
      chapterId: chapter.chapterId ?? `chapter-${chapter.chapter ?? index + 1}`,
      chapter: chapter.chapter ?? index + 1,
      sections:
        chapter.sections ??
        chapter.units?.map((unit) => ({
          unit: unit.unit,
          sectionId: unit.syncId,
          text: unit.text,
          needsReview: unit.needsReview,
        })) ??
        [],
    })),
  };
}

function toOutputBook(book) {
  return {
    bookId: book.bookId,
    title: book.title,
    author: book.author,
    language: book.language,
    source: book.source,
    chapters: book.chapters.map((chapter) => ({
      chapter: chapter.chapter,
      chapterId: chapter.chapterId,
      title: chapter.title,
      sections: chapter.sections.map((section) => ({
        sectionId: section.sectionId,
        unit: section.unit,
        text: section.text,
        ...(section.needsReview ? { needsReview: true } : {}),
      })),
    })),
  };
}

function chapterText(chapter) {
  const titlePattern = escapeRegExp(chapter.title ?? '');
  const sections = [...chapter.sections];
  const first = sections[0];
  if (first?.needsReview && first.text.length < 90 && sections.length > 1) {
    sections.shift();
  }

  return normalizeText(
    sections
      .map((section) => section.text)
      .join(' ')
      .replace(new RegExp(`^${titlePattern}\\s+`, 'i'), ''),
  );
}

function normalizeText(text) {
  return String(text ?? '')
    .replace(/\r/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?»])/g, '$1')
    .replace(/([¿¡«])\s+/g, '$1')
    .trim();
}

function splitSemanticUnits(text, maxChars) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const sentenceParts = normalized
    .split(/(?<=[.!?;:。！？»)"'”’])\s+(?=[A-ZÁÉÍÓÚÜÑÄÖÜÀÂÇÈÉÊËÎÏÔÙÛÜÆŒ¿¡«"“])/u)
    .map((part) => part.trim())
    .filter(Boolean);

  const units = [];
  for (const sentence of sentenceParts.length ? sentenceParts : [normalized]) {
    units.push(...splitLongUnit(sentence, maxChars));
  }
  return units.map((unit) => unit.trim()).filter(Boolean);
}

function splitLongUnit(text, maxChars) {
  if (text.length <= maxChars) return [text];

  const parts = text
    .split(/(?<=[,;:—-])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) return splitByWords(text, maxChars);

  const chunks = [];
  let current = '';
  for (const part of parts) {
    const next = current ? `${current} ${part}` : part;
    if (current && next.length > maxChars) {
      chunks.push(...splitByWords(current, maxChars));
      current = part;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(...splitByWords(current, maxChars));
  return chunks;
}

function splitByWords(text, maxChars) {
  if (text.length <= maxChars) return [text];

  const words = text.split(/\s+/);
  const chunks = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maxChars) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function alignTranslationUnits({ bookId, chapterId, masterUnits, translationText }) {
  const translationUnits = ensureAtLeastCount(splitSemanticUnits(translationText, targetUnitChars), masterUnits.length);
  const masterTotal = textLength(masterUnits);
  const translationCumulative = cumulativeLengths(translationUnits);
  const translationTotal = translationCumulative.at(-1) ?? 0;
  const boundaries = [0];

  for (let index = 1; index < masterUnits.length; index += 1) {
    const remainingUnits = masterUnits.length - index;
    const minBoundary = boundaries.at(-1) + 1;
    const maxBoundary = translationUnits.length - remainingUnits;
    const proportion = textLength(masterUnits.slice(0, index)) / Math.max(1, masterTotal);
    const targetChar = proportion * translationTotal;
    const nearest = nearestBoundary(translationCumulative, targetChar, minBoundary, maxBoundary);
    boundaries.push(nearest);
  }
  boundaries.push(translationUnits.length);

  return masterUnits.map((masterText, index) => {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    const text = normalizeText(translationUnits.slice(start, end).join(' '));
    const ratio = text.length / Math.max(1, masterText.length);
    const needsReview = !text || ratio < 0.35 || ratio > 2.9 || end - start > 3;

    return {
      unit: index + 1,
      sectionId: syncId(bookId, chapterId, index),
      text: text || translationUnits[start] || '[alignment missing]',
      ...(needsReview ? { needsReview: true } : {}),
    };
  });
}

function ensureAtLeastCount(units, count) {
  const expanded = [...units];
  while (expanded.length < count) {
    let longestIndex = -1;
    let longestLength = 0;
    for (let index = 0; index < expanded.length; index += 1) {
      if (expanded[index].length > longestLength) {
        longestIndex = index;
        longestLength = expanded[index].length;
      }
    }
    if (longestIndex < 0 || longestLength < 24) break;
    const split = splitNearMiddle(expanded[longestIndex]);
    if (split.length < 2) break;
    expanded.splice(longestIndex, 1, ...split);
  }
  return expanded;
}

function splitNearMiddle(text) {
  const middle = Math.floor(text.length / 2);
  const punctuation = [...text.matchAll(/[,;:—-]\s+/g)].map((match) => match.index + match[0].length);
  const candidates = punctuation.length ? punctuation : [...text.matchAll(/\s+/g)].map((match) => match.index + match[0].length);
  const boundary = candidates.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))[0];
  if (!boundary || boundary < 8 || text.length - boundary < 8) return [text];
  return [text.slice(0, boundary).trim(), text.slice(boundary).trim()].filter(Boolean);
}

function nearestBoundary(cumulative, target, min, max) {
  let best = min;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = min; index <= max; index += 1) {
    const distance = Math.abs((cumulative[index - 1] ?? 0) - target);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}

function cumulativeLengths(units) {
  const cumulative = [];
  let total = 0;
  for (const unit of units) {
    total += unit.length;
    cumulative.push(total);
  }
  return cumulative;
}

function textLength(units) {
  return units.reduce((sum, unit) => sum + unit.length, 0);
}

function syncId(bookId, chapterId, index) {
  const chapterNumber = chapterId.match(/\d+/)?.[0]?.padStart(2, '0') ?? chapterId.replace(/\W+/g, '-');
  return `${bookId}-ch${chapterNumber}-u${String(index + 1).padStart(4, '0')}`;
}

function snippet(text) {
  return normalizeText(text).slice(0, 180);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function markdownFullReport(report) {
  return [`# Semantic Alignment Report`, '', ...report.books.flatMap((book) => [`- ${book.bookId}: ${book.needsReview} needs-review units`]), ''].join('\n');
}

function markdownReport(report) {
  const lines = [
    `# ${report.title} Semantic Alignment Report`,
    '',
    `Book ID: ${report.bookId}`,
    `Languages: ${report.languages.join(', ')}`,
    `Needs review units: ${report.needsReview}`,
    '',
    '## Chapter Counts',
    '',
    '| Chapter | Units | Needs review |',
    '| --- | ---: | ---: |',
  ];

  for (const chapter of report.chapters) {
    const needsReview = Object.values(chapter.languages).reduce((sum, language) => sum + language.needsReview, 0);
    lines.push(`| ${chapter.title} | ${chapter.units} | ${needsReview} |`);
  }

  lines.push('', '## Questionable Samples', '');
  for (const chapter of report.chapters) {
    for (const item of chapter.questionable.slice(0, 6)) {
      lines.push(`### ${item.language} ${item.syncId}`, '', `English: ${item.english}`, '', `Translation: ${item.translation}`, '');
    }
  }

  return `${lines.join('\n')}\n`;
}
