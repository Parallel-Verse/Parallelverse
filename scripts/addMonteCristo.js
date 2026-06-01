import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'src', 'data', 'books');
const rawDir = path.join(root, 'input', 'raw', 'monte-cristo');
const reportsDir = path.join(root, 'reports');
const bookId = 'monte-cristo';
const targetUnitChars = 190;

await mkdir(outDir, { recursive: true });
await mkdir(rawDir, { recursive: true });
await mkdir(reportsDir, { recursive: true });

const englishRaw = await fetchText('https://www.gutenberg.org/ebooks/1184.txt.utf-8');
const spanishRaw = await downloadSpanishWikisource();

await writeFile(path.join(rawDir, 'monte-cristo.en.txt'), englishRaw, 'utf8');
await writeFile(path.join(rawDir, 'monte-cristo.es.txt'), spanishRaw, 'utf8');

const englishChapters = splitEnglishChapters(stripGutenberg(englishRaw));
const spanishChapters = splitSpanishChapters(spanishRaw, englishChapters.length);

const report = {
  bookId,
  title: 'The Count of Monte Cristo',
  englishChapters: englishChapters.length,
  spanishChapters: spanishChapters.length,
  chapters: [],
  needsReview: 0,
};

const en = makeBook('en', 'The Count of Monte Cristo', {
  name: 'Project Gutenberg',
  url: 'https://www.gutenberg.org/ebooks/1184',
  licenseNote: 'Public domain in the USA',
});

const es = makeBook('es', 'El conde de Monte-Cristo', {
  name: 'Internet Archive / Imprenta Nacional de Costa Rica Editorial Digital',
  url: 'https://archive.org/details/el_conde_de_montecristo_edincr',
  licenseNote: 'Freely distributed OCR text with Creative Commons BY-NC-ND 3.0 Costa Rica notice; use as a provisional Spanish source until a clean public-domain transcription is available',
});

for (let chapterIndex = 0; chapterIndex < englishChapters.length; chapterIndex += 1) {
  const chapterNumber = chapterIndex + 1;
  const english = englishChapters[chapterIndex];
  const spanish = spanishChapters[chapterIndex] ?? { title: `Capítulo ${chapterNumber}`, body: '' };
  const masterUnits = splitSemanticUnits(english.body, targetUnitChars);
  const spanishUnits = alignTranslationUnits(masterUnits, splitSemanticUnits(spanish.body, targetUnitChars), chapterNumber);
  const needsReview = spanishUnits.filter((unit) => unit.needsReview).length;

  report.needsReview += needsReview;
  report.chapters.push({
    chapter: chapterNumber,
    title: english.title,
    units: masterUnits.length,
    needsReview,
  });

  en.chapters.push({
    chapter: chapterNumber,
    chapterId: `chapter-${chapterNumber}`,
    title: english.title,
    sections: masterUnits.map((text, index) => ({
      sectionId: syncId(chapterNumber, index),
      unit: index + 1,
      text,
    })),
  });

  es.chapters.push({
    chapter: chapterNumber,
    chapterId: `chapter-${chapterNumber}`,
    title: spanish.title || english.title,
    sections: spanishUnits,
  });
}

await writeFile(path.join(outDir, 'monte-cristo.en.json'), `${JSON.stringify(en, null, 2)}\n`, 'utf8');
await writeFile(path.join(outDir, 'monte-cristo.es.json'), `${JSON.stringify(es, null, 2)}\n`, 'utf8');
await writeFile(path.join(reportsDir, 'monte-cristo-alignment-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(path.join(reportsDir, 'monte-cristo-alignment-report.md'), markdownReport(report), 'utf8');

console.log(`Wrote Monte Cristo English/Spanish with ${report.chapters.length} chapters and ${report.needsReview} needs-review Spanish units`);

function makeBook(language, title, source) {
  return {
    bookId,
    title,
    author: 'Alexandre Dumas',
    language,
    source,
    chapters: [],
  };
}

async function downloadSpanishWikisource() {
  return fetchText('https://archive.org/download/el_conde_de_montecristo_edincr/el_conde_de_montecristo_edincr_djvu.txt');
}

async function fetchText(url, options = {}) {
  let response;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      response = await fetch(url, {
        headers: { 'user-agent': 'Parallel Classics Monte Cristo public-domain importer' },
      });
    } catch (error) {
      if (attempt === 7) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2500 * (attempt + 1)));
      continue;
    }
    if (response.ok || (options.optional && response.status === 404)) break;
    if (response.status !== 429 || attempt === 7) break;
    await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)));
  }
  if (options.optional && response.status === 404) return '';
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

function cleanWikisourcePage(raw) {
  return String(raw ?? '')
    .replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, ' ')
    .replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\bDigitized by Google\b/gi, ' ')
    .replace(/^[\s\S]*?(?=CAP[IÍ]TULO|EL CONDE|I\.)/i, (match) => (match.length > 1200 ? '' : match))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripGutenberg(text) {
  return String(text ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '\n')
    .replace(/^[\s\S]*?\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n/i, '')
    .replace(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*$/i, '')
    .trim();
}

function splitEnglishChapters(text) {
  const allMatches = [...text.matchAll(/^\s*Chapter\s+(\d+)\.\s*([^\n]+)?/gim)];
  const firstRealChapter = allMatches.findIndex((match, index) => index > 0 && match[1] === '1');
  const matches = firstRealChapter >= 0 ? allMatches.slice(firstRealChapter) : allMatches;
  return matches.map((match, index) => ({
    title: `Chapter ${match[1]}. ${normalizeText(match[2] ?? '')}`.trim(),
    body: text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length).trim(),
  }));
}

function splitSpanishChapters(text, desiredCount) {
  const matches = [...text.matchAll(/(?:^|\n)\s*(?:CAP[IÍ]TULO|CAPITULO)\s+([IVXLCDM]+|\d+)[\s.\n-]+([^\n]{0,90})/gim)];
  let chapters = matches
    .map((match, index) => ({
      title: normalizeText(`Capítulo ${match[1]}. ${match[2] ?? ''}`),
      body: text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length).trim(),
    }))
    .filter((chapter) => chapter.body.length > 200);

  if (chapters.length >= desiredCount) return chapters.slice(0, desiredCount);

  const clean = normalizeText(text);
  chapters = Array.from({ length: desiredCount }, (_, index) => {
    const start = Math.floor((index * clean.length) / desiredCount);
    const end = index === desiredCount - 1 ? clean.length : Math.floor(((index + 1) * clean.length) / desiredCount);
    return { title: `Capítulo ${index + 1}`, body: clean.slice(start, end) };
  });
  return chapters;
}

function splitSemanticUnits(text, maxChars) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const sentences = normalized
    .split(/(?<=[.!?;:»)"'”’])\s+(?=[A-ZÁÉÍÓÚÜÑ¿¡«"“])/u)
    .map((part) => part.trim())
    .filter(Boolean);
  return (sentences.length ? sentences : [normalized]).flatMap((sentence) => splitLongUnit(sentence, maxChars));
}

function splitLongUnit(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const parts = text.split(/(?<=[,;:—-])\s+/u).map((part) => part.trim()).filter(Boolean);
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

function alignTranslationUnits(masterUnits, translationUnits, chapterNumber) {
  const translation = ensureCount(translationUnits, masterUnits.length);
  const masterTotal = sumLength(masterUnits);
  const translatedCumulative = cumulative(translation);
  const translatedTotal = translatedCumulative.at(-1) ?? 1;
  const boundaries = [0];

  for (let index = 1; index < masterUnits.length; index += 1) {
    const remaining = masterUnits.length - index;
    const min = boundaries.at(-1) + 1;
    const max = translation.length - remaining;
    const proportion = sumLength(masterUnits.slice(0, index)) / Math.max(1, masterTotal);
    boundaries.push(nearestBoundary(translatedCumulative, proportion * translatedTotal, min, max));
  }
  boundaries.push(translation.length);

  return masterUnits.map((master, index) => {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    const text = normalizeText(translation.slice(start, end).join(' '));
    const ratio = text.length / Math.max(1, master.length);
    return {
      sectionId: syncId(chapterNumber, index),
      unit: index + 1,
      text: text || '[alignment missing]',
      ...(ratio < 0.25 || ratio > 4.5 || end - start > 4 ? { needsReview: true } : {}),
    };
  });
}

function ensureCount(units, count) {
  const result = [...units];
  while (result.length < count) {
    const index = result.reduce((best, unit, current) => (unit.length > result[best].length ? current : best), 0);
    if (!result[index] || result[index].length < 24) break;
    const split = splitLongUnit(result[index], Math.ceil(result[index].length / 2));
    if (split.length < 2) break;
    result.splice(index, 1, split[0], split.slice(1).join(' '));
  }
  return result;
}

function syncId(chapterNumber, index) {
  return `${bookId}-ch${String(chapterNumber).padStart(2, '0')}-u${String(index + 1).padStart(4, '0')}`;
}

function normalizeText(text) {
  return String(text ?? '')
    .replace(/\r/g, '\n')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[_#*]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?»])/g, '$1')
    .replace(/([¿¡«])\s+/g, '$1')
    .trim();
}

function cumulative(units) {
  let total = 0;
  return units.map((unit) => {
    total += unit.length;
    return total;
  });
}

function nearestBoundary(cumulativeLengths, target, min, max) {
  let best = Math.max(0, min);
  let distance = Number.POSITIVE_INFINITY;
  for (let index = Math.max(0, min); index <= Math.max(min, max); index += 1) {
    const candidate = Math.abs((cumulativeLengths[index - 1] ?? 0) - target);
    if (candidate < distance) {
      best = index;
      distance = candidate;
    }
  }
  return best;
}

function sumLength(units) {
  return units.reduce((sum, unit) => sum + unit.length, 0);
}

function markdownReport(report) {
  return [
    '# The Count of Monte Cristo Alignment Report',
    '',
    `English chapters: ${report.englishChapters}`,
    `Spanish chapters: ${report.spanishChapters}`,
    `Needs-review Spanish units: ${report.needsReview}`,
    '',
    '| Chapter | Units | Needs review |',
    '| --- | ---: | ---: |',
    ...report.chapters.map((chapter) => `| ${chapter.title} | ${chapter.units} | ${chapter.needsReview} |`),
    '',
  ].join('\n');
}
