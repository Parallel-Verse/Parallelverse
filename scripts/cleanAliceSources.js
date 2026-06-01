import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  aliceSources,
  cleanDir,
  ensureAliceDirs,
  rawDir,
  splitGutenbergChapters,
  splitTextosInfoChapters,
  writeJson,
} from './aliceAlignmentUtils.js';

await ensureAliceDirs();

for (const source of Object.values(aliceSources)) {
  const raw = await readFile(path.join(rawDir, `alice.${source.language}.raw`), 'utf8');
  const chapters =
    source.language === 'es' ? splitTextosInfoChapters(raw) : splitGutenbergChapters(raw, source.language);

  const cleanBook = {
    bookId: 'alice',
    title: source.title,
    author: source.author,
    language: source.language,
    source: {
      name: source.source.name,
      url: source.source.url,
      licenseNote: source.source.licenseNote,
    },
    chapters,
  };

  await writeJson(path.join(cleanDir, `alice.${source.language}.clean.json`), cleanBook);
  console.log(`Cleaned Alice ${source.language}: ${chapters.length} chapters`);
}
