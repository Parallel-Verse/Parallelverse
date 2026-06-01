import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import iconv from 'iconv-lite';
import { load } from 'cheerio';
import { PDFParse } from 'pdf-parse';
import { japaneseClassics } from './japaneseClassicsConfig.js';

const rawDir = path.join(process.cwd(), 'input', 'raw', 'japanese-classics');

await mkdir(rawDir, { recursive: true });

for (const book of japaneseClassics) {
  console.log(`Downloading ${book.bookId}.ja`);
  const japanese = await downloadAozoraText(book.ja.cardUrl);
  await writeFile(path.join(rawDir, `${book.bookId}.ja.txt`), japanese.text, 'utf8');
  await writeFile(path.join(rawDir, `${book.bookId}.ja.source.json`), `${JSON.stringify({ ...book.ja, url: japanese.sourceUrl }, null, 2)}\n`);

  console.log(`Downloading ${book.bookId}.en`);
  const english = await downloadEnglishText(book.en);
  await writeFile(path.join(rawDir, `${book.bookId}.en.txt`), english, 'utf8');
  await writeFile(path.join(rawDir, `${book.bookId}.en.source.json`), `${JSON.stringify(book.en, null, 2)}\n`);
}

async function downloadAozoraText(cardUrl) {
  const html = await fetchText(cardUrl);
  const zipMatch = html.match(/href="([^"]+?\.zip)"/i);
  if (!zipMatch) throw new Error(`No Aozora zip link found on ${cardUrl}`);
  const sourceUrl = new URL(zipMatch[1], cardUrl).href;
  const zipBuffer = Buffer.from(await (await fetch(sourceUrl)).arrayBuffer());
  const zip = await JSZip.loadAsync(zipBuffer);
  const textFile = Object.values(zip.files).find((file) => /\.txt$/i.test(file.name));
  if (!textFile) throw new Error(`No text file in ${sourceUrl}`);
  const bytes = Buffer.from(await textFile.async('uint8array'));
  return { sourceUrl, text: iconv.decode(bytes, 'Shift_JIS') };
}

async function downloadEnglishText(source) {
  if (source.type === 'text') return stripGutenberg(await fetchText(source.url));
  if (source.type === 'html') return htmlToText(await fetchText(source.url));
  if (source.type === 'html-pages') return (await Promise.all(source.urls.map((url) => fetchText(url).then(htmlToText).then(cleanHtmlPageText)))).join('\n\n');
  if (source.type === 'wikisource') return htmlToText(await fetchText(source.url));
  if (source.type === 'wikisource-pages') return downloadWikisourcePages(source);
  if (source.type === 'plain-text') return fetchText(source.textUrl ?? source.url);
  if (source.type === 'provisional') return provisionalEnglishSource();
  if (source.type === 'pdf') {
    const buffer = Buffer.from(await (await fetch(source.url)).arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text;
  }
  throw new Error(`Unknown English source type ${source.type}`);
}

function provisionalEnglishSource() {
  return [
    'The First Night. Public-domain English OCR is pending manual transcription from the documented source.',
    'The Second Night. Public-domain English OCR is pending manual transcription from the documented source.',
    'The Third Night. Public-domain English OCR is pending manual transcription from the documented source.',
    'The Fourth Night. Public-domain English OCR is pending manual transcription from the documented source.',
    'The Fifth Night. Public-domain English OCR is pending manual transcription from the documented source.',
    'The Sixth Night. Public-domain English OCR is pending manual transcription from the documented source.',
    'The Seventh Night. Public-domain English OCR is pending manual transcription from the documented source.',
    'The Eighth Night. Public-domain English OCR is pending manual transcription from the documented source.',
    'The Ninth Night. Public-domain English OCR is pending manual transcription from the documented source.',
    'The Tenth Night. Public-domain English OCR is pending manual transcription from the documented source.',
  ].join('\n\n');
}

async function downloadWikisourcePages(source) {
  const parts = [];
  for (let page = source.pageStart; page <= source.pageEnd; page += 1) {
    const url = `https://en.wikisource.org/w/index.php?title=${encodeURIComponent(`${source.pageTitle}/${page}`)}&action=raw`;
    const raw = await fetchText(url, { optional: true });
    if (!raw) continue;
    const text = cleanWikisourceRaw(raw);
    if (text) parts.push(text);
    await new Promise((resolve) => setTimeout(resolve, 650));
  }
  return parts.join('\n\n');
}

async function fetchText(url, options = {}) {
  let response;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    response = await fetch(url, { headers: { 'user-agent': 'Parallel Classics Japanese classics importer (source preservation script)' } });
    if (response.status !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  if (!response.ok) {
    if (options.optional && response.status === 404) return '';
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.text();
}

function stripGutenberg(text) {
  return text
    .replace(/^[\s\S]*?\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n/i, '')
    .replace(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*$/i, '')
    .trim();
}

function htmlToText(html) {
  const $ = load(html);
  $('script, style, nav, header, footer, .noprint, .mw-editsection, sup.reference, table').remove();
  const blocks = [];
  $('h1, h2, h3, p, li').each((_, element) => {
    const text = normalizeText($(element).text());
    if (text && !/^(contents|navigation|download|references)$/i.test(text)) blocks.push(text);
  });
  return blocks.join('\n\n');
}

function cleanHtmlPageText(text) {
  return String(text ?? '')
    .replace(/Cite To cite this page[\s\S]*$/i, '')
    .replace(/This etext was prepared by[\s\S]*$/i, '')
    .replace(/online license From Eldritch Press:[\s\S]*$/i, '')
    .trim();
}

function cleanWikisourceRaw(raw) {
  return String(raw ?? '')
    .replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, ' ')
    .replace(/<includeonly>[\s\S]*?<\/includeonly>/gi, ' ')
    .replace(/\{\{hws\|([^|{}]+)\|[^{}]*\}\}/gi, '$1')
    .replace(/\{\{hwe\|([^|{}]+)\|[^{}]*\}\}/gi, '$1')
    .replace(/\{\{di\|([^|{}]+)\}\}/gi, '$1')
    .replace(/\{\{sc\|([^{}]+)\}\}/gi, '$1')
    .replace(/\{\{uc\|([^{}]+)\}\}/gi, (_, value) => value.toUpperCase())
    .replace(/\{\{[cC]\/[se]\}\}/g, '\n')
    .replace(/\{\{rule\|[^{}]*\}\}/gi, '\n')
    .replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/\[\[File:[^\]]+\]\]/gi, ' ')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/^=+\s*(.*?)\s*=+$/gm, '$1')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}
