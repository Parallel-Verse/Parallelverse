import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const booksDir = path.join(root, 'src', 'data', 'books');
const reportsDir = path.join(root, 'reports');
const requestedBooks = new Set(
  String(process.env.BOOK_FILTER ?? '')
    .split(',')
    .map((bookId) => bookId.trim())
    .filter(Boolean),
);

const japaneseMasterBooks = new Set(['i-am-a-cat', 'botchan', 'kokoro', 'bamboo-cutter']);
const maxUnitChars = {
  en: 320,
  es: 340,
  fr: 340,
  de: 340,
  ja: 120,
};

const stopwords = {
  en: words('the a an and or but of to in on at by for from with without into over under is are was were be been being i you he she it we they that this these those his her their my your our not as if then than there here all any had have has do did done said says one two'),
  es: words('el la los las un una unos unas y o pero de del a en por para con sin sobre bajo es son fue eran ser sido yo tu usted el ella nosotros ellos que este esta estos estas mi su sus no como si entonces hay aqui todo dijo dice'),
  fr: words('le la les un une des et ou mais de du a dans en par pour avec sans sur sous est sont fut etaient etre ete je tu vous il elle nous ils que ce cette ces mon son ses ne pas comme si alors tout dit'),
  de: words('der die das den dem des ein eine einer eines und oder aber von zu in auf an bei fur mit ohne uber unter ist sind war waren sein gewesen ich du er sie es wir ihr dass diese dieser mein sein nicht wie wenn dann alles sagte'),
};

const dictionary = {
  es: {
    alice: ['alicia'], rabbit: ['conejo'], hole: ['madriguera', 'agujero'], queen: ['reina'], king: ['rey'], cat: ['gato'], mouse: ['raton'],
    door: ['puerta'], key: ['llave'], garden: ['jardin'], time: ['tiempo'], late: ['tarde'], little: ['pequeno', 'pequena'], crazy: ['loco', 'locos', 'loca'],
    night: ['noche'], christmas: ['navidad'], ghost: ['fantasma'], count: ['conde'], prison: ['prision', 'carcel'], sea: ['mar'], ship: ['barco', 'buque'],
  },
  fr: {
    alice: ['alice'], rabbit: ['lapin'], hole: ['terrier', 'trou'], queen: ['reine'], king: ['roi'], cat: ['chat'], mouse: ['souris'],
    door: ['porte'], key: ['cle'], garden: ['jardin'], time: ['temps'], late: ['retard'], little: ['petit', 'petite'], crazy: ['fou', 'folle'],
    night: ['nuit'], christmas: ['noel'], ghost: ['fantome'], count: ['comte'], prison: ['prison'], sea: ['mer'], ship: ['navire', 'vaisseau'],
  },
  de: {
    alice: ['alice'], rabbit: ['kaninchen'], hole: ['loch'], queen: ['konigin'], king: ['konig'], cat: ['katze'], mouse: ['maus'],
    door: ['tur'], key: ['schlussel'], garden: ['garten'], time: ['zeit'], late: ['spat'], little: ['klein'], crazy: ['verruckt'],
    night: ['nacht'], christmas: ['weihnacht'], ghost: ['geist'], count: ['graf'], prison: ['gefangnis'], sea: ['meer', 'see'], ship: ['schiff'],
  },
};

await mkdir(reportsDir, { recursive: true });

const files = await listJsonFiles(booksDir);
const entries = [];
for (const file of files) {
  if (/src[\\/]data[\\/]books[\\/]alice\.(en|es|fr|de)\.json$/i.test(file)) continue;
  const book = normalizeBook(JSON.parse(await readFile(file, 'utf8')));
  if (book.language === 'ja-furigana') continue;
  if (requestedBooks.size && !requestedBooks.has(book.bookId)) continue;
  entries.push({ file, book });
}

const grouped = groupBy(entries, (entry) => entry.book.bookId);
const fullReport = { generatedAt: new Date().toISOString(), books: [] };

for (const [bookId, bookEntries] of Object.entries(grouped)) {
  const masterLanguage = japaneseMasterBooks.has(bookId) ? 'ja' : 'en';
  const master =
    bookEntries.find((entry) => entry.book.language === masterLanguage) ??
    bookEntries.find((entry) => entry.book.language === 'en') ??
    bookEntries[0];

  if (!master) continue;

  const bookReport = {
    bookId,
    title: master.book.title,
    masterLanguage: master.book.language,
    languages: bookEntries.map((entry) => entry.book.language).sort(),
    chapters: [],
    needsReview: 0,
  };

  for (const masterChapter of master.book.chapters) {
    const peerChapters = new Map();
    for (const entry of bookEntries) {
      const chapter = findMatchingChapter(entry.book, masterChapter);
      if (chapter) peerChapters.set(entry, chapter);
    }

    const masterUnits = splitSemanticUnits(chapterText(masterChapter, master.book.language), master.book.language);
    const chapterReport = {
      chapterId: masterChapter.chapterId,
      title: masterChapter.title,
      units: masterUnits.length,
      languages: {},
      samples: [],
    };

    masterChapter.sections = masterUnits.map((text, index) => makeSection(bookId, masterChapter.chapterId, index, text));
    chapterReport.languages[master.book.language] = {
      units: masterUnits.length,
      candidates: masterUnits.length,
      needsReview: 0,
      averageScore: 1,
    };

    for (const entry of bookEntries) {
      if (entry === master) continue;
      const chapter = peerChapters.get(entry);
      if (!chapter) continue;

      const rawCandidates = splitSemanticUnits(chapterText(chapter, entry.book.language), entry.book.language);
      const candidates = expandCandidatesToAtLeast(rawCandidates, masterUnits.length, entry.book.language);
      const aligned = alignCandidatesToMaster({
        bookId,
        chapterId: masterChapter.chapterId,
        masterUnits,
        masterLanguage: master.book.language,
        candidates,
        targetLanguage: entry.book.language,
      });

      chapter.sections = aligned.sections;
      bookReport.needsReview += aligned.needsReview;
      chapterReport.languages[entry.book.language] = {
        units: aligned.sections.length,
        candidates: candidates.length,
        needsReview: aligned.needsReview,
        averageScore: Number(aligned.averageScore.toFixed(3)),
      };
      chapterReport.samples.push(...aligned.samples);
    }

    bookReport.chapters.push(chapterReport);
  }

  for (const entry of bookEntries) {
    await writeFile(entry.file, `${JSON.stringify(toOutputBook(entry.book), null, 2)}\n`, 'utf8');
  }

  fullReport.books.push(bookReport);
  await writeFile(path.join(reportsDir, `${bookId}-content-alignment-report.json`), `${JSON.stringify(bookReport, null, 2)}\n`, 'utf8');
  console.log(`${bookId}: realigned ${bookReport.languages.join(', ')}; needs review ${bookReport.needsReview}`);
}

await writeFile(path.join(reportsDir, 'content-alignment-report.json'), `${JSON.stringify(fullReport, null, 2)}\n`, 'utf8');
await writeFile(path.join(reportsDir, 'content-alignment-report.md'), markdownReport(fullReport), 'utf8');

async function listJsonFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const found = [];
  for (const dirent of dirents) {
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) found.push(...(await listJsonFiles(full)));
    else if (dirent.name.endsWith('.json')) found.push(full);
  }
  return found.sort();
}

function normalizeBook(book) {
  return {
    ...book,
    chapters: (book.chapters ?? []).map((chapter, index) => {
      const chapterNumber = chapter.chapter ?? index + 1;
      return {
        ...chapter,
        chapter: chapterNumber,
        chapterId: chapter.chapterId ?? `chapter-${chapterNumber}`,
        sections:
          chapter.sections?.map((section, sectionIndex) => ({
            sectionId: section.sectionId ?? section.syncId,
            unit: section.unit ?? sectionIndex + 1,
            text: section.text ?? '',
            needsReview: section.needsReview,
          })) ??
          chapter.units?.map((unit) => ({
            sectionId: unit.syncId,
            unit: unit.unit,
            text: unit.text ?? '',
            needsReview: unit.needsReview,
          })) ??
          [],
      };
    }),
  };
}

function toOutputBook(book) {
  return {
    bookId: book.bookId,
    title: book.title,
    ...(book.originalTitle ? { originalTitle: book.originalTitle } : {}),
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

function findMatchingChapter(book, masterChapter) {
  return book.chapters.find((chapter) => chapter.chapterId === masterChapter.chapterId) ??
    book.chapters.find((chapter) => chapter.chapter === masterChapter.chapter);
}

function chapterText(chapter, language) {
  return stripLeadingChapterHeading(
    cleanText((chapter.sections ?? chapter.units ?? []).map((section) => section.text ?? '').join(' ')),
    chapter,
    language,
  );
}

function stripLeadingChapterHeading(text, chapter, language) {
  let cleaned = cleanText(text);
  cleaned = cleanText(
    cleaned
      .replace(/^【テキスト中に現れる記号について】[\s\S]*?-{5,}\s*/u, '')
      .replace(/^EL CÁNTICO DE NAVIDAD POR CÁRLOS DICKENS\s+/iu, ''),
  );
  const title = cleanText(chapter.title ?? '');
  if (title && normalizeForCompare(cleaned).startsWith(normalizeForCompare(title))) {
    cleaned = cleanText(cleaned.slice(title.length));
  }

  for (let pass = 0; pass < 3; pass += 1) {
    const match = cleaned.match(/^(.{1,90}?[.!?。！？])\s*/u);
    if (!match) break;
    const first = match[1].trim();
    const normalized = normalizeForCompare(first);
    const after = cleanText(cleaned.slice(match[0].length));
    const titleLike =
      /^(chapter|chapitre|capitulo|capítulo|kapitel|stave|book|livre|part|parte)\b/u.test(normalized) ||
      /\b(chapter|chapitre|capitulo|capítulo|kapitel|stave)\b/u.test(normalized) ||
      (language !== 'ja' && first === first.toUpperCase() && first.length < 70 && !/[a-z]/.test(first)) ||
      (first.length < 70 && !/[,:;]/u.test(first) && /^(alice|alicia)\b/u.test(normalizeForCompare(after)));
    if (!titleLike) break;
    cleaned = cleanText(cleaned.slice(match[0].length));
  }

  return cleaned;
}

function splitSemanticUnits(text, language) {
  const normalized = cleanText(text);
  if (!normalized) return [];
  const sentenceParts = language === 'ja' ? splitJapaneseSentences(normalized) : splitLatinSentences(normalized);
  const units = [];

  for (const sentence of sentenceParts.length ? sentenceParts : [normalized]) {
    units.push(...splitLongSemanticUnit(sentence, language));
  }

  return units.map(cleanText).filter(Boolean);
}

function splitLatinSentences(text) {
  return scanLatinSentences(text)
    .map((part) => part.trim())
    .filter(Boolean);
}

function scanLatinSentences(text) {
  const sentences = [];
  let current = '';
  let quoteOpen = false;
  const normalized = text.replace(/[“”«»]/g, '"');

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    current += char;

    if (char === '"') {
      quoteOpen = !quoteOpen;
      const previous = normalized[index - 1] ?? '';
      if (!quoteOpen && /[.!?]/u.test(previous) && shouldBreakAfter(normalized, index + 1)) {
        sentences.push(current.trim());
        current = '';
      }
      continue;
    }

    if (!quoteOpen && /[.!?]/u.test(char) && shouldBreakAfter(normalized, index + 1)) {
      sentences.push(current.trim());
      current = '';
    }
  }

  if (current.trim()) sentences.push(current.trim());
  return sentences;
}

function shouldBreakAfter(text, index) {
  let cursor = index;
  while (cursor < text.length && /["')\]\s]/u.test(text[cursor])) cursor += 1;
  const next = text[cursor] ?? '';
  return !next || /[A-ZÁÉÍÓÚÜÑÄÖÀÂÇÈÊËÎÏÔÙÛÆŒ¿¡"([]/u.test(next);
}

function splitDialogueRuns(text) {
  const parts = [];
  let current = '';
  const tokens = text.split(/(\s+["“”«»][^"“”«»]{1,220}["“”«»])/u).filter(Boolean);
  if (tokens.length <= 1) return [text];
  for (const token of tokens) {
    const trimmed = token.trim();
    if (/^["“”«»]/u.test(trimmed)) {
      if (current.trim()) parts.push(current.trim());
      parts.push(trimmed);
      current = '';
    } else {
      current += token;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.length ? parts : [text];
}

function splitJapaneseSentences(text) {
  return text
    .replace(/([。！？])(?=「|『|（|【|［|[一-龯ぁ-んァ-ンA-Za-z0-9])/gu, '$1\n')
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitLongSemanticUnit(text, language) {
  const limit = maxUnitChars[language] ?? 180;
  const cleaned = cleanText(text);
  if (cleaned.length <= limit) return [cleaned];

  const clausePattern = language === 'ja' ? /(?<=[、，；：])/u : /(?<=[;:—])\s+/u;
  const clauses = cleaned.split(clausePattern).map((part) => part.trim()).filter(Boolean);
  if (clauses.length > 1) return packParts(clauses, limit, language);

  return splitByWordsOrChars(cleaned, limit, language);
}

function packParts(parts, limit, language) {
  const units = [];
  let current = '';
  for (const part of parts) {
    const joined = language === 'ja' ? `${current}${part}` : current ? `${current} ${part}` : part;
    if (current && joined.length > limit) {
      units.push(...splitByWordsOrChars(current, limit, language));
      current = part;
    } else {
      current = joined;
    }
  }
  if (current) units.push(...splitByWordsOrChars(current, limit, language));
  return units;
}

function splitByWordsOrChars(text, limit, language) {
  if (text.length <= limit) return [text];
  if (language === 'ja') {
    const chunks = [];
    for (let index = 0; index < text.length; index += limit) chunks.push(text.slice(index, index + limit));
    return chunks;
  }

  const wordsList = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const word of wordsList) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > limit) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function expandCandidatesToAtLeast(candidates, count, language) {
  const expanded = candidates.map(cleanText).filter(Boolean);
  while (expanded.length < count) {
    let bestIndex = -1;
    let bestParts = [];
    for (let index = 0; index < expanded.length; index += 1) {
      const parts = splitOneCandidate(expanded[index], language);
      if (parts.length > 1 && expanded[index].length > (expanded[bestIndex]?.length ?? 0)) {
        bestIndex = index;
        bestParts = parts;
      }
    }
    if (bestIndex < 0) break;
    expanded.splice(bestIndex, 1, ...bestParts);
  }

  while (expanded.length < count) expanded.push(expanded.at(-1) ?? '');
  return expanded;
}

function splitOneCandidate(text, language) {
  const cleaned = cleanText(text);
  if (!cleaned) return [];
  const clauses = language === 'ja'
    ? cleaned.split(/(?<=[、，；：])/u).map((part) => part.trim()).filter(Boolean)
    : cleaned.split(/(?<=[;:—])\s+/u).map((part) => part.trim()).filter(Boolean);
  if (clauses.length > 1) return clauses;
  return splitByWordsOrChars(cleaned, Math.max(24, Math.ceil(cleaned.length / 2)), language);
}

function alignCandidatesToMaster({ bookId, chapterId, masterUnits, masterLanguage, candidates, targetLanguage }) {
  const count = masterUnits.length;
  const safeCandidates = expandCandidatesToAtLeast(candidates, count, targetLanguage);
  const windows =
    buildDynamicAlignmentWindows(masterUnits, masterLanguage, safeCandidates, targetLanguage) ??
    buildWeightedCandidateWindows(masterUnits, masterLanguage, safeCandidates, targetLanguage);
  const sections = [];
  const samples = [];
  let totalScore = 0;
  let needsReview = 0;

  for (let index = 0; index < count; index += 1) {
    const [start, end] = windows[index];
    const candidateSlice = safeCandidates.slice(start, end);
    const text = cleanText(candidateSlice.join(targetLanguage === 'ja' ? '' : ' '));
    const score = semanticScore(masterUnits[index], text, masterLanguage, targetLanguage);
    const consumed = end - start;
    const review = !text || score < confidenceThreshold(masterLanguage, targetLanguage) || consumed > 3;
    const section = {
      ...makeSection(bookId, chapterId, index, text),
      ...(review ? { needsReview: true } : {}),
    };
    sections.push(section);
    totalScore += score;
    if (review) {
      needsReview += 1;
      if (samples.length < 8) {
        samples.push({
          language: targetLanguage,
          syncId: section.sectionId,
          score: Number(score.toFixed(3)),
          master: snippet(masterUnits[index]),
          translation: snippet(text),
          needsReview: true,
        });
      }
    }
  }

  return {
    sections,
    needsReview,
    averageScore: totalScore / Math.max(1, count),
    samples,
  };
}

function buildWeightedCandidateWindows(masterUnits, masterLanguage, candidates, targetLanguage) {
  const masterWeights = masterUnits.map((unit) => textWeight(unit, masterLanguage));
  const candidateWeights = candidates.map((unit) => textWeight(unit, targetLanguage));
  const masterTotal = masterWeights.reduce((sum, value) => sum + value, 0) || 1;
  const candidateCumulative = [0];
  for (const weight of candidateWeights) candidateCumulative.push(candidateCumulative.at(-1) + weight);
  const candidateTotal = candidateCumulative.at(-1) || 1;
  const windows = [];
  let previous = 0;
  let masterRunning = 0;

  for (let index = 0; index < masterUnits.length; index += 1) {
    masterRunning += masterWeights[index];
    const remainingMasters = masterUnits.length - index - 1;
    const idealTarget = (masterRunning / masterTotal) * candidateTotal;
    const idealEnd = index === masterUnits.length - 1 ? candidates.length : nearestBoundary(candidateCumulative, idealTarget);
    const minEnd = previous + 1;
    const maxEnd = candidates.length - remainingMasters;
    const end = clamp(idealEnd, minEnd, maxEnd);
    windows.push([previous, end]);
    previous = end;
  }

  return windows;
}

function buildDynamicAlignmentWindows(masterUnits, masterLanguage, candidates, targetLanguage) {
  const n = masterUnits.length;
  const m = candidates.length;
  if (!n || m < n) return null;

  const ratio = m / n;
  const maxChunk = Math.max(2, Math.min(7, Math.ceil(ratio) + 3));
  const band = Math.max(18, Math.ceil(Math.abs(m - n) / Math.max(1, n) * 40) + 18);
  const dp = Array.from({ length: n + 1 }, () => new Map());
  dp[0].set(0, { cost: 0, prev: -1 });

  for (let i = 0; i < n; i += 1) {
    const expectedNext = Math.round(((i + 1) * m) / n);
    const minJ = Math.max(i + 1, expectedNext - band);
    const maxJ = Math.min(m - (n - i - 1), expectedNext + band);

    for (const [prevJText, state] of dp[i]) {
      const prevJ = Number(prevJText);
      if (prevJ >= m) continue;
      for (let nextJ = Math.max(prevJ + 1, minJ); nextJ <= maxJ && nextJ <= prevJ + maxChunk; nextJ += 1) {
        const chunk = cleanText(candidates.slice(prevJ, nextJ).join(targetLanguage === 'ja' ? '' : ' '));
        const score = semanticScore(masterUnits[i], chunk, masterLanguage, targetLanguage);
        const positionPenalty = Math.abs(nextJ / m - (i + 1) / n) * 0.25;
        const chunkPenalty = Math.max(0, nextJ - prevJ - 2) * 0.08;
        const cost = state.cost + (1 - score) + positionPenalty + chunkPenalty;
        const old = dp[i + 1].get(nextJ);
        if (!old || cost < old.cost) dp[i + 1].set(nextJ, { cost, prev: prevJ });
      }
    }

    if (!dp[i + 1].size) return null;
  }

  let end = m;
  if (!dp[n].has(end)) {
    let best = null;
    for (const [jText, state] of dp[n]) {
      const j = Number(jText);
      const tailPenalty = Math.abs(m - j);
      const total = state.cost + tailPenalty;
      if (!best || total < best.total) best = { j, total };
    }
    if (!best) return null;
    end = best.j;
  }

  const boundaries = [];
  for (let i = n; i > 0; i -= 1) {
    const state = dp[i].get(end);
    if (!state) return null;
    boundaries.push([state.prev, end]);
    end = state.prev;
  }
  boundaries.reverse();

  if (end !== 0) return null;
  if (boundaries.at(-1)?.[1] !== m) {
    const last = boundaries.at(-1);
    if (last) last[1] = m;
  }
  return boundaries;
}

function nearestBoundary(cumulative, target) {
  let bestIndex = 1;
  let bestDistance = Infinity;
  for (let index = 1; index < cumulative.length; index += 1) {
    const distance = Math.abs(cumulative[index] - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function buildCandidateWindows(masterCount, candidateCount) {
  const windows = [];
  let previous = 0;
  for (let index = 0; index < masterCount; index += 1) {
    const remainingMasters = masterCount - index - 1;
    const idealEnd = index === masterCount - 1 ? candidateCount : Math.round(((index + 1) * candidateCount) / masterCount);
    const minEnd = previous + 1;
    const maxEnd = candidateCount - remainingMasters;
    const end = clamp(idealEnd, minEnd, maxEnd);
    windows.push([previous, end]);
    previous = end;
  }
  return windows;
}

function semanticScore(masterText, targetText, masterLanguage, targetLanguage) {
  if (!targetText) return 0;
  const master = features(masterText, masterLanguage, targetLanguage);
  const target = features(targetText, targetLanguage, masterLanguage);
  const nameScore = jaccard(master.names, target.names);
  const numberScore = jaccard(master.numbers, target.numbers);
  const tokenScore = Math.max(jaccard(master.tokens, target.tokens), jaccard(master.translatedHints, target.tokens));
  const punctuationScore =
    (master.hasQuestion === target.hasQuestion ? 0.07 : 0) +
    (master.hasExclamation === target.hasExclamation ? 0.05 : 0) +
    (master.hasQuote === target.hasQuote ? 0.04 : 0);
  const lengthScore = lengthSimilarity(masterText, targetText, masterLanguage, targetLanguage) * 0.24;
  const ngramScore = masterLanguage === 'ja' || targetLanguage === 'ja' ? 0 : charNgramScore(master.tokenList, target.tokenList) * 0.12;

  return clamp(nameScore * 0.25 + numberScore * 0.16 + tokenScore * 0.16 + punctuationScore + lengthScore + ngramScore, 0, 1);
}

function features(text, language, counterpartLanguage) {
  const normalized = normalizeForCompare(text);
  const tokenList = normalized.split(/\s+/).filter(Boolean);
  const blocked = stopwords[language] ?? new Set();
  const tokens = new Set(tokenList.filter((token) => token.length > 2 && !blocked.has(token)));
  const names = new Set((text.match(/\b[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'-]{2,}\b/g) ?? []).map(normalizeForCompare));
  const numbers = new Set(text.match(/\d+/g) ?? []);
  const translatedHints = new Set();
  if (counterpartLanguage && dictionary[counterpartLanguage]) {
    for (const token of tokens) {
      for (const hint of dictionary[counterpartLanguage][token] ?? []) translatedHints.add(hint);
    }
  }
  return {
    tokens,
    tokenList,
    names,
    numbers,
    translatedHints,
    hasQuestion: /[?¿？]/u.test(text),
    hasExclamation: /[!¡！]/u.test(text),
    hasQuote: /["'“”«»「」『』]/u.test(text),
  };
}

function lengthSimilarity(a, b, langA, langB) {
  const wa = textWeight(a, langA);
  const wb = textWeight(b, langB);
  return Math.min(wa, wb) / Math.max(wa, wb, 1);
}

function textWeight(text, language) {
  const cleaned = cleanText(text);
  if (language === 'ja') return Math.max(1, cleaned.length * 1.7);
  return Math.max(1, normalizeForCompare(cleaned).split(/\s+/).filter(Boolean).length * 6);
}

function charNgramScore(tokensA, tokensB) {
  return jaccard(
    new Set(tokensA.flatMap((token) => ngrams(token))),
    new Set(tokensB.flatMap((token) => ngrams(token))),
  );
}

function ngrams(token) {
  if (token.length < 5) return [];
  const result = [];
  for (let index = 0; index <= token.length - 4; index += 1) result.push(token.slice(index, index + 4));
  return result;
}

function jaccard(a, b) {
  if (!a?.size || !b?.size) return 0;
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
}

function confidenceThreshold(masterLanguage, targetLanguage) {
  if (masterLanguage === 'ja' || targetLanguage === 'ja') return 0.17;
  return 0.2;
}

function makeSection(bookId, chapterId, index, text) {
  return {
    sectionId: `${bookId}-${chapterId.replace(/^chapter-/, 'ch').replace(/[^a-z0-9-]/gi, '-')}-u${String(index + 1).padStart(4, '0')}`,
    unit: index + 1,
    text: cleanText(text),
  };
}

function cleanText(text) {
  return String(text ?? '')
    .replace(/\r/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[«»]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?。！？、，；：])/gu, '$1')
    .trim();
}

function normalizeForCompare(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text) {
  return new Set(text.split(/\s+/).filter(Boolean));
}

function groupBy(items, fn) {
  return items.reduce((acc, item) => {
    const key = fn(item);
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function snippet(text) {
  return cleanText(text).slice(0, 180);
}

function markdownReport(report) {
  const lines = ['# Content Alignment Report', '', `Generated: ${report.generatedAt}`, ''];
  for (const book of report.books) {
    lines.push(`## ${book.title}`, '', `Book ID: \`${book.bookId}\``, `Master language: \`${book.masterLanguage}\``, `Needs review: ${book.needsReview}`, '');
    for (const chapter of book.chapters) {
      lines.push(`- ${chapter.title}: ${chapter.units} units`);
      for (const [language, stats] of Object.entries(chapter.languages)) {
        lines.push(`  - ${language}: ${stats.units} units, ${stats.needsReview} needs review, ${stats.candidates} candidates, avg score ${stats.averageScore}`);
      }
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}
