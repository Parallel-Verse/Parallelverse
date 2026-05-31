import englishReference from './book-of-mormon-reference.json';
import spanishReference from './bookOfMormon.es.json';

export const languageOptions = [
  { code: 'eng', name: 'English', active: true },
  { code: 'spa', name: 'Spanish', active: true },
];

export const bookIndex = [
  { book: '1 Nephi', chapters: 22 },
  { book: '2 Nephi', chapters: 33 },
  { book: 'Jacob', chapters: 7 },
  { book: 'Enos', chapters: 1 },
  { book: 'Jarom', chapters: 1 },
  { book: 'Omni', chapters: 1 },
  { book: 'Words of Mormon', chapters: 1 },
  { book: 'Mosiah', chapters: 29 },
  { book: 'Alma', chapters: 63 },
  { book: 'Helaman', chapters: 16 },
  { book: '3 Nephi', chapters: 30 },
  { book: '4 Nephi', chapters: 1 },
  { book: 'Mormon', chapters: 9 },
  { book: 'Ether', chapters: 15 },
  { book: 'Moroni', chapters: 10 },
];

const bookIdsByEnglish = {
  '1 Nephi': '1-nephi',
  '2 Nephi': '2-nephi',
  Jacob: 'jacob',
  Enos: 'enos',
  Jarom: 'jarom',
  Omni: 'omni',
  'Words of Mormon': 'words-of-mormon',
  Mosiah: 'mosiah',
  Alma: 'alma',
  Helaman: 'helaman',
  '3 Nephi': '3-nephi',
  '4 Nephi': '4-nephi',
  Mormon: 'mormon',
  Ether: 'ether',
  Moroni: 'moroni',
};

const spanishBookTitles = {
  '1 Nephi': '1 Nefi',
  '2 Nephi': '2 Nefi',
  Jacob: 'Jacob',
  Enos: 'Enós',
  Jarom: 'Jarom',
  Omni: 'Omni',
  'Words of Mormon': 'Palabras de Mormón',
  Mosiah: 'Mosíah',
  Alma: 'Alma',
  Helaman: 'Helamán',
  '3 Nephi': '3 Nefi',
  '4 Nephi': '4 Nefi',
  Mormon: 'Mormón',
  Ether: 'Éter',
  Moroni: 'Moroni',
};

const spanishBookMapById = new Map(spanishReference.books.map((book) => [book.id, book]));

const getSpanishVerses = (book, chapter) => {
  const translatedBook = spanishBookMapById.get(bookIdsByEnglish[book]);
  const translatedChapter = translatedBook?.chapters.find((item) => Number(item.chapter) === chapter);
  return new Map((translatedChapter?.verses ?? []).map((verse) => [Number(verse.verse), verse.text]));
};

const createPlaceholderChapter = (book, chapter) => ({
  book,
  chapter,
  titles: {
    eng: book,
    spa: spanishBookTitles[book] ?? book,
  },
  sourceNote: 'Navigation is ready for this chapter. Text can be added by language in scriptureData.js.',
  verses: [
    {
      verse: 1,
      eng: `${book} chapter ${chapter} is available in navigation. Text for this chapter has not been loaded yet.`,
      spa: `${book} capitulo ${chapter} esta disponible en la navegacion. El texto de este capitulo aun no se ha cargado.`,
    },
  ],
});

export const chapters = bookIndex.flatMap(({ book, chapters: chapterCount }) =>
  Array.from({ length: chapterCount }, (_, index) => {
    const chapter = index + 1;
    const englishChapter = englishReference[book]?.[String(chapter)];
    const spanishVerses = getSpanishVerses(book, chapter);

    if (!englishChapter) {
      return createPlaceholderChapter(book, chapter);
    }

    const verses = Object.entries(englishChapter)
      .filter(([verse]) => /^\d+$/.test(verse))
      .map(([verse, eng]) => ({
        verse: Number(verse),
        eng,
        ...(spanishVerses.has(Number(verse)) ? { spa: spanishVerses.get(Number(verse)) } : {}),
      }));

    return {
      book,
      chapter,
      titles: {
        eng: book,
        spa: spanishBookTitles[book] ?? book,
      },
      sourceNote:
        'English text loaded from the public-domain bcbooks/scriptures-json Book of Mormon reference edition. Spanish text loaded from the bundled local JSON file.',
      verses,
    };
  }),
);
