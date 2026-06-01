import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureAliceDirs, outDir, readJson, reportsDir, writeJson } from './aliceAlignmentUtils.js';

await ensureAliceDirs();

const languages = ['en', 'es', 'fr', 'de'];
const books = Object.fromEntries(
  await Promise.all(languages.map(async (language) => [language, await readJson(path.join(outDir, `alice.${language}.json`))])),
);
const errors = [];
const warnings = [];
const chapterSummaries = [];
const questionable = [];

const english = books.en;

for (const language of languages) {
  const book = books[language];
  if (!book.source?.name || !book.source?.url || !book.source?.licenseNote) {
    errors.push(`${language}: missing source metadata`);
  }
  if (book.chapters.length !== english.chapters.length) {
    errors.push(`${language}: chapter count ${book.chapters.length} differs from English ${english.chapters.length}`);
  }
}

for (const englishChapter of english.chapters) {
  const englishUnits = getUnits(englishChapter);
  const expectedIds = englishUnits.map((unit) => unit.syncId);
  const seen = new Set();
  for (const syncId of expectedIds) {
    if (seen.has(syncId)) errors.push(`duplicate English syncId ${syncId}`);
    seen.add(syncId);
  }

  const summary = {
    chapter: englishChapter.chapter,
    title: englishChapter.title,
    unitCounts: { en: expectedIds.length },
    needsReview: {},
  };

  for (const language of languages.filter((candidate) => candidate !== 'en')) {
    const chapter = books[language].chapters.find((candidate) => candidate.chapter === englishChapter.chapter);
    if (!chapter) {
      errors.push(`${language}: missing chapter ${englishChapter.chapter}`);
      continue;
    }

    const units = getUnits(chapter);
    const ids = units.map((unit) => unit.syncId);
    summary.unitCounts[language] = ids.length;
    summary.needsReview[language] = units.filter((unit) => unit.needsReview).length;

    if (ids.length !== expectedIds.length) {
      errors.push(`${language} chapter ${englishChapter.chapter}: unit count ${ids.length} differs from English ${expectedIds.length}`);
    }

    for (let index = 0; index < expectedIds.length; index += 1) {
      if (ids[index] !== expectedIds[index]) {
        errors.push(`${language} chapter ${englishChapter.chapter}: syncId mismatch at unit ${index + 1}`);
      }
    }

    for (const unit of units) {
      if (!unit.text?.trim()) errors.push(`${language} ${unit.syncId}: empty text`);
      if (unit.needsReview && questionable.length < 120) {
        const englishUnit = englishUnits.find((candidate) => candidate.syncId === unit.syncId);
        questionable.push({
          language,
          chapter: englishChapter.chapter,
          syncId: unit.syncId,
          english: englishUnit?.text.slice(0, 180),
          translation: unit.text.slice(0, 180),
        });
      }
    }
  }

  chapterSummaries.push(summary);
}

function getUnits(chapter) {
  return (
    chapter.units ??
    chapter.sections?.map((section) => ({
      unit: section.unit,
      syncId: section.syncId ?? section.sectionId,
      text: section.text,
      needsReview: section.needsReview,
    })) ??
    []
  );
}

const report = {
  bookId: 'alice',
  valid: errors.length === 0,
  errors,
  warnings,
  chapterSummaries,
  questionable,
  recommendedManualFixes:
    questionable.length > 0
      ? [
          'Review needsReview units in context, especially where one translated sentence covers multiple English units.',
          'Split or merge translated candidate text manually when the heuristic grouped too much text.',
          'Keep syncId values stable when editing reviewed units.',
        ]
      : [],
};

await writeJson(path.join(reportsDir, 'alice-alignment-validation.json'), report);

const totalNeedsReview = chapterSummaries.reduce(
  (sum, chapter) => sum + Object.values(chapter.needsReview).reduce((inner, value) => inner + value, 0),
  0,
);
const markdown = [
  '# Alice Alignment Report',
  '',
  `Valid: ${report.valid ? 'yes' : 'no'}`,
  `Needs review units: ${totalNeedsReview}`,
  '',
  '## Chapter Unit Counts',
  '',
  '| Chapter | English | Spanish | French | German | Needs review |',
  '| --- | ---: | ---: | ---: | ---: | ---: |',
  ...chapterSummaries.map((chapter) => {
    const needsReview = Object.values(chapter.needsReview).reduce((sum, value) => sum + value, 0);
    return `| ${chapter.chapter}. ${chapter.title} | ${chapter.unitCounts.en ?? 0} | ${chapter.unitCounts.es ?? 0} | ${chapter.unitCounts.fr ?? 0} | ${chapter.unitCounts.de ?? 0} | ${needsReview} |`;
  }),
  '',
  '## Questionable Alignment Snippets',
  '',
  ...questionable.slice(0, 40).flatMap((item) => [
    `### ${item.language} ${item.syncId}`,
    '',
    `English: ${item.english}`,
    '',
    `Translation: ${item.translation}`,
    '',
  ]),
  '## Recommended Manual Fixes',
  '',
  ...report.recommendedManualFixes.map((fix) => `- ${fix}`),
  '',
];

await writeFile(path.join(reportsDir, 'alice-alignment-report.md'), markdown.join('\n'), 'utf8');

if (errors.length) {
  console.log('Alice alignment validation errors');
  for (const error of errors) console.log(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Alice alignment validation passed. Needs review units: ${totalNeedsReview}`);
}
