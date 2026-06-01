import path from 'node:path';
import {
  cleanDir,
  ensureAliceDirs,
  outDir,
  readJson,
  reportsDir,
  scoreAlignment,
  semanticUnitsFromText,
  writeJson,
} from './aliceAlignmentUtils.js';

await ensureAliceDirs();

const master = await readJson(path.join(outDir, 'alice.en.json'));
const report = {
  bookId: 'alice',
  strategy:
    'English semantic units are the master. Translations are split into candidate sentence/dialogue units and aligned in order using relative position, dialogue punctuation, question/exclamation markers, and named-entity hints. Uncertain units are marked needsReview.',
  languages: {},
  questionable: [],
};

for (const language of ['fr', 'de', 'es']) {
  const clean = await readJson(path.join(cleanDir, `alice.${language}.clean.json`));
  const aligned = {
    bookId: 'alice',
    title: clean.title,
    author: clean.author,
    language,
    source: clean.source,
    chapters: [],
  };

  const languageStats = {
    chapters: [],
    exactAlignedUnits: 0,
    needsReviewUnits: 0,
  };

  for (const masterChapter of master.chapters) {
    const translatedChapter = clean.chapters.find((chapter) => chapter.chapter === masterChapter.chapter);
    if (!translatedChapter) throw new Error(`${language}: missing chapter ${masterChapter.chapter}`);

    const candidates = semanticUnitsFromText(translatedChapter.text);
    const unitCount = masterChapter.units.length;
    const candidateCount = candidates.length;
    const units = [];

    for (let index = 0; index < unitCount; index += 1) {
      const start = Math.floor((index * candidateCount) / unitCount);
      const end = index === unitCount - 1 ? candidateCount : Math.floor(((index + 1) * candidateCount) / unitCount);
      const safeStart = Math.min(start, Math.max(candidateCount - 1, 0));
      const safeEnd = Math.max(safeStart + 1, end);
      const text = candidates.slice(safeStart, safeEnd).join(' ').trim() || candidates[safeStart] || '';
      const masterUnit = masterChapter.units[index];
      const score = scoreAlignment(masterUnit.text, text, index / Math.max(1, unitCount - 1), safeStart / Math.max(1, candidateCount - 1));
      const groupedCount = Math.max(0, safeEnd - safeStart);
      const needsReview =
        !text ||
        groupedCount === 0 ||
        groupedCount > 2 ||
        score < 0.28 ||
        Math.abs(candidateCount - unitCount) / Math.max(unitCount, 1) > 0.22;

      if (needsReview) {
        languageStats.needsReviewUnits += 1;
        if (report.questionable.length < 160) {
          report.questionable.push({
            language,
            chapter: masterChapter.chapter,
            syncId: masterUnit.syncId,
            score: Number(score.toFixed(3)),
            english: masterUnit.text.slice(0, 220),
            translation: text.slice(0, 220),
            reason: groupedCount > 2 ? 'multiple translated candidates grouped' : 'low heuristic confidence',
          });
        }
      } else {
        languageStats.exactAlignedUnits += 1;
      }

      units.push({
        unit: masterUnit.unit,
        syncId: masterUnit.syncId,
        text,
        ...(needsReview ? { needsReview: true } : {}),
      });
    }

    aligned.chapters.push({
      chapter: masterChapter.chapter,
      title: translatedChapter.rawTitle || masterChapter.title,
      units,
    });

    languageStats.chapters.push({
      chapter: masterChapter.chapter,
      masterUnits: unitCount,
      candidateUnits: candidateCount,
      needsReview: units.filter((unit) => unit.needsReview).length,
    });
  }

  report.languages[language] = languageStats;
  await writeJson(path.join(outDir, `alice.${language}.json`), aligned);
  console.log(`Aligned Alice ${language}: ${languageStats.needsReviewUnits} units need review`);
}

report.languages.en = {
  chapters: master.chapters.map((chapter) => ({
    chapter: chapter.chapter,
    masterUnits: chapter.units.length,
    candidateUnits: chapter.units.length,
    needsReview: 0,
  })),
  exactAlignedUnits: master.chapters.reduce((sum, chapter) => sum + chapter.units.length, 0),
  needsReviewUnits: 0,
};

await writeJson(path.join(reportsDir, 'alice-alignment-report.json'), report);
