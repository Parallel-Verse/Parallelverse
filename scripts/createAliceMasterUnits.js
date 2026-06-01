import path from 'node:path';
import {
  cleanDir,
  ensureAliceDirs,
  outDir,
  readJson,
  semanticUnitsFromText,
  writeJson,
} from './aliceAlignmentUtils.js';

await ensureAliceDirs();

const english = await readJson(path.join(cleanDir, 'alice.en.clean.json'));

const master = {
  ...english,
  chapters: english.chapters.map((chapter) => {
    const units = semanticUnitsFromText(chapter.text).map((text, index) => ({
      unit: index + 1,
      syncId: `alice-ch${String(chapter.chapter).padStart(2, '0')}-u${String(index + 1).padStart(3, '0')}`,
      text,
    }));
    return {
      chapter: chapter.chapter,
      title: chapter.title,
      units,
    };
  }),
};

await writeJson(path.join(outDir, 'alice.en.json'), master);
console.log(`Created English Alice master units: ${master.chapters.reduce((sum, chapter) => sum + chapter.units.length, 0)} units`);
