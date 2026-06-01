export function normalizeText(text) {
  return String(text ?? '')
    .replace(/\r/g, '\n')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanAozoraText(text) {
  return String(text ?? '')
    .replace(/\r/g, '\n')
    .replace(/^[\s\S]*?-{5,}\s*/, '')
    .replace(/\u5e95\u672c\uff1a[\s\S]*$/m, '')
    .replace(/\uff3b\uff03[^\uff3d]+\uff3d/g, '')
    .replace(/\uff5c/g, '')
    .replace(/\u300a[^\u300b]+\u300b/g, '')
    .replace(/[ \t]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function splitJapaneseUnits(text, targetChars = 90) {
  const units = [];
  const parts = String(text ?? '')
    .replace(/\n+/g, '\n')
    .split(/(?<=[\u3002\uff01\uff1f])|(?=\u300c)/u)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) units.push(...splitLong(part, targetChars, /(?<=[\u3001\uff0c\uff1b])|(?<=\u300d)/u));
  return units.map((unit) => unit.trim()).filter(Boolean);
}

export function splitEnglishUnits(text, targetChars = 190) {
  const parts = normalizeText(text)
    .split(/(?<=[.!?;:)"'])\s+(?=[A-Z"'])/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const units = [];
  for (const part of parts) units.push(...splitLong(part, targetChars, /(?<=[,;:\u2014-])\s+/u));
  return units;
}

export function alignByPosition(masterUnits, translationUnits, bookId, chapterNumber, options = {}) {
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
      unit: index + 1,
      syncId: syncId(bookId, chapterNumber, index),
      text: text || '[alignment missing]',
      ...(options.needsReviewAll || ratio < 0.25 || ratio > 5 || end - start > 4 ? { needsReview: true } : {}),
    };
  });
}

export function syncId(bookId, chapterNumber, index) {
  return `${bookId}-ch${String(chapterNumber).padStart(2, '0')}-u${String(index + 1).padStart(3, '0')}`;
}

function splitLong(text, targetChars, splitter) {
  if (text.length <= targetChars) return [text];
  const parts = text.split(splitter).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return splitByWords(text, targetChars);
  const chunks = [];
  let current = '';
  for (const part of parts) {
    const next = current ? `${current} ${part}` : part;
    if (current && next.length > targetChars) {
      chunks.push(current);
      current = part;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks.flatMap((chunk) => splitByWords(chunk, targetChars));
}

function splitByWords(text, targetChars) {
  if (text.length <= targetChars) return [text];
  const words = text.includes(' ') ? text.split(/\s+/) : [...text];
  const chunks = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current}${text.includes(' ') ? ' ' : ''}${word}` : word;
    if (current && next.length > targetChars) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function ensureCount(units, count) {
  const result = [...units];
  while (result.length < count) {
    const index = result.reduce((best, unit, current) => (unit.length > result[best].length ? current : best), 0);
    if (!result[index] || result[index].length < 20) break;
    const text = result[index];
    const mid = Math.floor(text.length / 2);
    result.splice(index, 1, text.slice(0, mid).trim(), text.slice(mid).trim());
  }
  return result;
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
