import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

export const root = process.cwd();
export const rawDir = path.join(root, 'input', 'raw', 'alice');
export const cleanDir = path.join(root, 'input', 'clean', 'alice');
export const outDir = path.join(root, 'src', 'data', 'books', 'alice');
export const reportsDir = path.join(root, 'reports');

export const aliceSources = {
  en: {
    language: 'en',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    source: {
      name: 'Project Gutenberg',
      url: 'https://www.gutenberg.org/ebooks/11',
      textUrl: 'https://www.gutenberg.org/ebooks/11.txt.utf-8',
      licenseNote: 'Public domain in the USA',
    },
  },
  fr: {
    language: 'fr',
    title: "Aventures d'Alice au pays des merveilles",
    author: 'Lewis Carroll',
    source: {
      name: 'Project Gutenberg',
      url: 'https://www.gutenberg.org/ebooks/55456',
      textUrl: 'https://www.gutenberg.org/ebooks/55456.txt.utf-8',
      licenseNote: 'Public domain in the USA',
    },
  },
  de: {
    language: 'de',
    title: "Alice's Abenteuer im Wunderland",
    author: 'Lewis Carroll',
    source: {
      name: 'Project Gutenberg',
      url: 'https://www.gutenberg.org/ebooks/19778',
      textUrl: 'https://www.gutenberg.org/ebooks/19778.txt.utf-8',
      licenseNote: 'Public domain in the USA',
    },
  },
  es: {
    language: 'es',
    title: 'Alicia en el Pais de las Maravillas',
    author: 'Lewis Carroll',
    source: {
      name: 'textos.info',
      url: 'https://www.textos.info/lewis-carroll/alicia-en-el-pais-de-las-maravillas',
      textUrl: 'https://www.textos.info/lewis-carroll/alicia-en-el-pais-de-las-maravillas/ebook',
      licenseNote:
        'Freely available digital text. Translation by Juan Gutierrez Gili (1894-1939), first published in 1927.',
    },
  },
};

export const canonicalChapterTitles = [
  'Down the Rabbit-Hole',
  'The Pool of Tears',
  'A Caucus-Race and a Long Tale',
  'The Rabbit Sends in a Little Bill',
  'Advice from a Caterpillar',
  'Pig and Pepper',
  'A Mad Tea-Party',
  "The Queen's Croquet-Ground",
  "The Mock Turtle's Story",
  'The Lobster Quadrille',
  'Who Stole the Tarts?',
  "Alice's Evidence",
];

export async function ensureAliceDirs() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(cleanDir, { recursive: true });
  await mkdir(outDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function normalizeWhitespace(text) {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function stripGutenbergMatter(text) {
  return normalizeWhitespace(text)
    .replace(/^[\s\S]*?\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n/i, '')
    .replace(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*$/i, '')
    .replace(/\nEnd of (?:the )?Project Gutenberg['’]s?[\s\S]*$/i, '')
    .trim();
}

export function cleanInlineText(text) {
  return text
    .replace(/[#*_]/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function chapterTitleLine(line) {
  return cleanInlineText(line).replace(/\.$/, '');
}

export function splitGutenbergChapters(text, language) {
  const clean = stripGutenbergMatter(text);
  const lines = clean.split('\n');
  const starts = [];

  lines.forEach((line, index) => {
    const value = chapterTitleLine(line);
    const romanHeading = /^[IVXL]+\.\s+.{4,}$/.test(value);
    const chapterHeading =
      /^(chapter|chapitre|kapitel)\s+([ivxlcdm]+|\d+)\b/i.test(value) ||
      /^(erstes|zweites|drittes|viertes|fuenftes|funftes|sechstes|siebentes|achtes|neuntes|zehntes|elftes|zwoelftes|zwolftes)\s+kapitel\b/i.test(
        value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      );
    if (romanHeading || chapterHeading) starts.push(index);
  });

  const realStarts = starts.filter((start, index) => start > 250 || (starts[index + 1] ?? Infinity) - start > 18);
  if (realStarts.length < 12) {
    throw new Error(`${language}: expected 12 chapter starts, found ${realStarts.length}`);
  }

  return realStarts.slice(0, 12).map((start, index) => {
    const next = realStarts[index + 1] ?? lines.length;
    const bodyLines = lines.slice(start + 1, next);
    while (
      bodyLines.length &&
      chapterTitleLine(bodyLines[0])
        .toLowerCase()
        .replace(/[^a-z]/g, '') === canonicalChapterTitles[index].toLowerCase().replace(/[^a-z]/g, '')
    ) {
      bodyLines.shift();
    }
    return {
      chapter: index + 1,
      title: canonicalChapterTitles[index],
      rawTitle: chapterTitleLine(lines[start]),
      text: normalizeWhitespace(bodyLines.join('\n')),
    };
  });
}

export function splitTextosInfoChapters(html) {
  const $ = cheerio.load(html);
  const headings = $('h2').toArray();
  const chapterHeadings = headings.filter((heading) => /^\d+\.\s+/.test($(heading).text().trim())).slice(0, 12);
  if (chapterHeadings.length !== 12) {
    throw new Error(`Spanish source: expected 12 chapter headings, found ${chapterHeadings.length}`);
  }

  return chapterHeadings.map((heading, index) => {
    const paragraphs = [];
    let node = $(heading).next();
    while (node.length && !/^h2$/i.test(node[0].tagName)) {
      if (/^p$/i.test(node[0].tagName)) {
        const text = cleanInlineText(node.text());
        if (text) paragraphs.push(text);
      }
      node = node.next();
    }

    return {
      chapter: index + 1,
      title: canonicalChapterTitles[index],
      rawTitle: cleanInlineText($(heading).text()),
      text: normalizeWhitespace(paragraphs.join('\n\n')),
    };
  });
}

export function semanticUnitsFromText(text) {
  const units = [];
  const paragraphs = normalizeWhitespace(text)
    .split(/\n\s*\n/g)
    .map(cleanInlineText)
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const dialogueMatches = paragraph.match(/(?:^| )[-—][^-—]+?(?=(?: [-—])|$)/g);
    if (dialogueMatches && dialogueMatches.length > 1) {
      for (const match of dialogueMatches) units.push(cleanInlineText(match));
      continue;
    }

    const sentenceParts = paragraph
      .split(/(?<=[.!?;:。！？»”’)"\]])\s+(?=[A-ZÀ-ÖØ-ÞÁÉÍÓÚÜÑÄÖÜÂÊÎÔÛÆŒ¡¿"“‘'—-])/u)
      .map(cleanInlineText)
      .filter(Boolean);

    for (const part of sentenceParts.length ? sentenceParts : [paragraph]) {
      if (part.length > 460) {
        units.push(...splitLongUnit(part));
      } else {
        units.push(part);
      }
    }
  }

  return units.filter(Boolean);
}

function splitLongUnit(text) {
  const pieces = text
    .split(/(?<=,)\s+(?=(?:and|but|or|for|so|when|while|as|that|which|who|y|pero|cuando|que|et|mais|quand|und|aber|als)\b)/i)
    .map(cleanInlineText)
    .filter(Boolean);
  if (pieces.length < 2) return [text];

  const units = [];
  let current = '';
  for (const piece of pieces) {
    const next = current ? `${current} ${piece}` : piece;
    if (current && next.length > 320) {
      units.push(current);
      current = piece;
    } else {
      current = next;
    }
  }
  if (current) units.push(current);
  return units;
}

export function namedHints(text) {
  const normalized = text.toLowerCase();
  const hints = [
    ['alice', ['alice', 'alicia']],
    ['rabbit', ['rabbit', 'lapin', 'kaninchen', 'conejo']],
    ['queen', ['queen', 'reine', 'koenigin', 'königin', 'reina']],
    ['king', ['king', 'roi', 'koenig', 'könig', 'rey']],
    ['duchess', ['duchess', 'duchesse', 'herzogin', 'duquesa']],
    ['hatter', ['hatter', 'chapelier', 'hutmacher', 'sombrerero']],
    ['gryphon', ['gryphon', 'griffon', 'greif', 'grifo']],
    ['turtle', ['turtle', 'tortue', 'schildkroete', 'schildkröte', 'tortuga']],
    ['caterpillar', ['caterpillar', 'chenille', 'raupe', 'gusano']],
    ['cheshire', ['cheshire', 'cheshirekatze']],
    ['dormouse', ['dormouse', 'loir', 'siebenschlaefer', 'siebenschläfer', 'lirón']],
  ];
  return hints.filter(([, words]) => words.some((word) => normalized.includes(word))).map(([hint]) => hint);
}

export function unitFeatures(text) {
  return {
    hints: namedHints(text),
    dialogue: /^[-—"“‘«]|[-—]\s*/.test(text.trim()),
    question: /[?¿]/.test(text),
    exclamation: /[!¡]/.test(text),
    length: text.length,
  };
}

export function scoreAlignment(masterText, translatedText, indexRatio, targetRatio) {
  const master = unitFeatures(masterText);
  const translated = unitFeatures(translatedText);
  const hintOverlap = master.hints.filter((hint) => translated.hints.includes(hint)).length;
  const hintPenalty = master.hints.length && !hintOverlap ? 0.18 : 0;
  const dialogueScore = master.dialogue === translated.dialogue ? 0.12 : -0.08;
  const punctuationScore = (master.question === translated.question ? 0.05 : 0) + (master.exclamation === translated.exclamation ? 0.05 : 0);
  const positionScore = Math.max(0, 0.5 - Math.abs(indexRatio - targetRatio));
  return positionScore + hintOverlap * 0.12 + dialogueScore + punctuationScore - hintPenalty;
}
