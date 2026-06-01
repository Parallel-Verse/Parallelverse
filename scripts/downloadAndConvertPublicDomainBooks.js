import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const rawDir = path.join(root, 'input', 'raw');
const outDir = path.join(root, 'src', 'data', 'books');

const sources = [
  {
    bookId: 'alice',
    author: 'Lewis Carroll',
    items: [
      { language: 'en', title: "Alice's Adventures in Wonderland", source: 'Project Gutenberg #11', url: 'https://www.gutenberg.org/ebooks/11.txt.utf-8' },
      { language: 'fr', title: "Aventures d'Alice au pays des merveilles", source: 'Project Gutenberg #55456', url: 'https://www.gutenberg.org/ebooks/55456.txt.utf-8' },
      { language: 'de', title: "Alice's Abenteuer im Wunderland", source: 'Project Gutenberg #19778', url: 'https://www.gutenberg.org/ebooks/19778.txt.utf-8' },
    ],
  },
  {
    bookId: 'christmas-carol',
    author: 'Charles Dickens',
    items: [
      { language: 'en', title: 'A Christmas Carol', source: 'Project Gutenberg #46', url: 'https://www.gutenberg.org/ebooks/46.txt.utf-8' },
      { language: 'fr', title: 'Cantique de Noel', source: 'Project Gutenberg #16021', url: 'https://www.gutenberg.org/ebooks/16021.txt.utf-8' },
      { language: 'de', title: 'Der Weihnachtsabend', source: 'Project Gutenberg #22465', url: 'https://www.gutenberg.org/ebooks/22465.txt.utf-8' },
      {
        language: 'es',
        title: 'El cantico de Navidad',
        source: 'Wikisource ES: El cantico de Navidad',
        wikisource: {
          site: 'https://es.wikisource.org',
          pages: [
            'El cántico de Navidad: Primera estrofa',
            'El cántico de Navidad: Segunda estrofa',
            'El cántico de Navidad: Tercera estrofa',
            'El cántico de Navidad: Cuarta estrofa',
            'El cántico de Navidad: Quinta estrofa',
          ],
        },
      },
    ],
  },
  {
    bookId: 'sherlock-holmes',
    author: 'Arthur Conan Doyle',
    items: [
      { language: 'en', title: 'The Adventures of Sherlock Holmes', source: 'Project Gutenberg #1661', url: 'https://www.gutenberg.org/ebooks/1661.txt.utf-8' },
    ],
  },
  {
    bookId: 'grimm',
    author: 'Brothers Grimm',
    splitUppercaseTitles: true,
    items: [
      { language: 'en', title: "Grimm's Fairy Tales", source: 'Project Gutenberg #2591', url: 'https://www.gutenberg.org/ebooks/2591.txt.utf-8' },
    ],
  },
  {
    bookId: 'eighty-days',
    author: 'Jules Verne',
    items: [
      { language: 'en', title: 'Around the World in Eighty Days', source: 'Project Gutenberg #103', url: 'https://www.gutenberg.org/ebooks/103.txt.utf-8' },
      { language: 'fr', title: 'Le tour du monde en quatre-vingts jours', source: 'Project Gutenberg #800', url: 'https://www.gutenberg.org/ebooks/800.txt.utf-8' },
      {
        language: 'es',
        title: 'La vuelta al mundo en ochenta dias',
        source: 'Wikisource ES: La vuelta al mundo en ochenta dias',
        wikisource: {
          site: 'https://es.wikisource.org',
          pages: Array.from({ length: 37 }, (_, index) => {
            const roman = [
              'I',
              'II',
              'III',
              'IV',
              'V',
              'VI',
              'VII',
              'VIII',
              'IX',
              'X',
              'XI',
              'XII',
              'XIII',
              'XIV',
              'XV',
              'XVI',
              'XVII',
              'XVIII',
              'XIX',
              'XX',
              'XXI',
              'XXII',
              'XXIII',
              'XXIV',
              'XXV',
              'XXVI',
              'XXVII',
              'XXVIII',
              'XXIX',
              'XXX',
              'XXXI',
              'XXXII',
              'XXXIII',
              'XXXIV',
              'XXXV',
              'XXXVI',
              'XXXVII',
            ][index];
            return `La vuelta al mundo en ochenta días/Capítulo ${roman}`;
          }),
        },
      },
    ],
  },
];

async function downloadText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'Parallel Classics public-domain converter' },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWikisourcePage(site, page) {
  const rawUrl = `${site}/wiki/${encodeURIComponent(page).replace(/%2F/g, '/')}?action=raw`;
  return fetchWithRetry(rawUrl);
}

async function fetchWikisourceRenderedPage(site, page) {
  const apiUrl = `${site}/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json`;
  const text = await fetchWithRetry(apiUrl);
  const data = JSON.parse(text);
  if (data.error) throw new Error(`${data.error.code}: ${data.error.info}`);
  return data.parse.text['*'];
}

async function fetchWithRetry(url) {
  let response;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    response = await fetch(url, {
      headers: { 'user-agent': 'Parallel Classics public-domain converter' },
    });
    if (response.ok) break;
    if (response.status !== 429 || attempt === 4) {
      throw new Error(`${response.status} ${response.statusText} for ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)));
  }
  return response.text();
}

function cleanWikisourceMarkup(text) {
  return text
    .replace(/\{\{Encabezado[\s\S]*?\}\}/gi, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/^<pages[\s\S]*?\/>\s*/gim, '')
    .replace(/<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\[https?:\/\/[^\s\]]+\s*([^\]]*)\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/__\w+__/g, '')
    .split('\n')
    .filter((line) => !/^\s*(\[\[)?(Categor[ií]a|Category|[a-z]{2,3}):/i.test(line))
    .join('\n')
    .trim();
}

async function normalizeWikisourceBook(source, item) {
  const { load } = await import('cheerio');
  const chapters = [];

  for (let index = 0; index < item.wikisource.pages.length; index += 1) {
    const page = item.wikisource.pages[index];
    console.log(`Fetching ${source.bookId}.${item.language} ${page}`);
    const raw = await fetchWikisourcePage(item.wikisource.site, page);
    let paragraphs;
    if (/<pages\b/i.test(raw)) {
      const html = await fetchWikisourceRenderedPage(item.wikisource.site, page);
      const $ = load(html);
      $('.noprint, .mw-editsection, sup.reference, style, script, table, .ws-noexport').remove();
      paragraphs = [];
      $('.mw-parser-output p').each((_, element) => {
        const text = normalizeText($(element).text());
        if (text && !/^(Categor[ií]a|Category|[a-z]{2,3}:)/i.test(text)) paragraphs.push(text);
      });
    } else {
      paragraphs = cleanWikisourceMarkup(raw)
        .split(/\n\s*\n/g)
        .map(normalizeText)
        .filter(Boolean);
    }

    chapters.push({
      chapterId: `chapter-${index + 1}`,
      title: page.split('/').pop()?.split(': ').pop() ?? `Chapter ${index + 1}`,
      sections: paragraphs.map((text, paragraphIndex) => ({
        sectionId: `chapter-${index + 1}-p${paragraphIndex + 1}`,
        text,
      })),
    });

    await new Promise((resolve) => setTimeout(resolve, 900));
  }

  return {
    bookId: source.bookId,
    title: item.title,
    author: source.author,
    language: item.language,
    source: item.source,
    chapters,
  };
}

function stripGutenbergMatter(text) {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^[\s\S]*?\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n/i, '')
    .replace(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*$/i, '')
    .replace(/\nEnd of (?:the )?Project Gutenberg['’]s?[\s\S]*$/i, '')
    .trim();
}

function normalizeText(text) {
  return text.replace(/[#*_]/g, '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
}

function looksLikeChapter(line) {
  const clean = normalizeText(line);
  return (
    /^(chapter|stave)\s+([ivxlcdm]+|\d+)\b/i.test(clean) ||
    /^(chapitre|kapitel)\s+([ivxlcdm]+|\d+)\b/i.test(clean) ||
    /^(premier|deuxième|deuxieme|troisième|troisieme|quatrième|quatrieme|cinquième|cinquieme)\s+couplet\b/i.test(clean) ||
    /^(erstes|zweites|drittes|viertes|fünftes|funftes|sechstes|siebentes|achtes|neuntes|zehntes|elftes|zwölftes|zwolftes)\s+kapitel\b/i.test(clean) ||
    /^[IVXL]+$/.test(clean) ||
    /^[IVXL]+\s*[.—.-]\s+.{8,}$/.test(clean)
  );
}

function chapterTitle(lines, start) {
  const current = normalizeText(lines[start]);
  if (/^[IVXL]+$/.test(current)) {
    const next = lines.slice(start + 1).find((line) => normalizeText(line));
    return normalizeText(`${current} ${next ?? ''}`);
  }
  return current;
}

function splitChapters(text, splitUppercaseTitles = false) {
  const clean = stripGutenbergMatter(text);
  const lines = clean.split('\n');
  let starts = [];

  lines.forEach((line, index) => {
    const clean = normalizeText(line);
    const surroundedBySpace = !normalizeText(lines[index - 1] ?? '') && !normalizeText(lines[index + 1] ?? '');
    const uppercaseStoryTitle =
      splitUppercaseTitles &&
      surroundedBySpace &&
      /^[A-Z][A-Z0-9' -]{5,}$/.test(clean) &&
      clean !== 'THE BROTHERS GRIMM FAIRY TALES';
    if (looksLikeChapter(line) || uppercaseStoryTitle) starts.push(index);
  });

  // Tables of contents often list chapter headings a few lines apart. Keep the
  // later real heading and drop the dense front-matter entries.
  starts = starts.filter((start, index) => start > 300 || (starts[index + 1] ?? Number.POSITIVE_INFINITY) - start > 20);

  if (!starts.length) return [{ title: 'Text', body: clean }];

  return starts
    .map((start, index) => ({
      title: chapterTitle(lines, start),
      body: lines.slice(start + 1, starts[index + 1] ?? lines.length).join('\n').trim(),
    }))
    .filter((chapter) => chapter.body.length > 200);
}

function splitParagraphs(body) {
  return body
    .split(/\n\s*\n/g)
    .map(normalizeText)
    .filter((paragraph) => paragraph.length > 0)
    .filter((paragraph) => !/^(contents|table|table of contents)$/i.test(paragraph));
}

function normalizeBook(source, item, rawText) {
  return {
    bookId: source.bookId,
    title: item.title,
    author: source.author,
    language: item.language,
    source: item.source,
    chapters: splitChapters(rawText, source.splitUppercaseTitles).map((chapter, chapterIndex) => {
      const chapterId = `chapter-${chapterIndex + 1}`;
      return {
        chapterId,
        title: chapter.title || `Chapter ${chapterIndex + 1}`,
        sections: splitParagraphs(chapter.body).map((text, paragraphIndex) => ({
          sectionId: `${chapterId}-p${paragraphIndex + 1}`,
          text,
        })),
      };
    }),
  };
}

function warnOnAlignment(bookId, language, reference, current) {
  if (!reference || language === reference.language) return;
  if (reference.chapters.length !== current.chapters.length) {
    console.warn(`${bookId}.${language}: chapter count ${current.chapters.length} differs from English ${reference.chapters.length}`);
  }
  current.chapters.forEach((chapter, index) => {
    const refChapter = reference.chapters[index];
    if (refChapter && refChapter.sections.length !== chapter.sections.length) {
      console.warn(
        `${bookId}.${language}:${chapter.chapterId}: paragraph count ${chapter.sections.length} differs from English ${refChapter.sections.length}`,
      );
    }
  });
}

await mkdir(rawDir, { recursive: true });
await mkdir(outDir, { recursive: true });

for (const source of sources) {
  let englishReference = null;
  const generated = [];

  for (const item of source.items) {
    let normalized;
    if (item.wikisource) {
      normalized = await normalizeWikisourceBook(source, item);
      await writeFile(path.join(rawDir, `${source.bookId}.${item.language}.source.txt`), item.source, 'utf8');
    } else {
      console.log(`Downloading ${source.bookId}.${item.language} from ${item.source}`);
      const raw = await downloadText(item.url);
      await writeFile(path.join(rawDir, `${source.bookId}.${item.language}.txt`), raw, 'utf8');
      normalized = normalizeBook(source, item, raw);
    }
    if (item.language === 'en') englishReference = normalized;
    generated.push(normalized);
  }

  for (const normalized of generated) {
    warnOnAlignment(source.bookId, normalized.language, englishReference, normalized);
    await writeFile(
      path.join(outDir, `${source.bookId}.${normalized.language}.json`),
      `${JSON.stringify(normalized, null, 2)}\n`,
      'utf8',
    );
    console.log(`Wrote ${source.bookId}.${normalized.language}.json with ${normalized.chapters.length} chapters`);
  }
}
