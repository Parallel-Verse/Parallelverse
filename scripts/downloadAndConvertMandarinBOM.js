import { convertOfficialBookOfMormonEpub } from './convertOfficialBookOfMormonEpub.js';

await convertOfficialBookOfMormonEpub({
  language: 'zho',
  sourcePage:
    'https://www.churchofjesuschrist.org/study/manual/translations-and-downloads/languages/chinese?lang=eng',
  epubUrl:
    'https://media.ldscdn.org/epub/lds-scriptures/book-of-mormon/06897_2018-00-0000-book-of-mormon-34406-zho.epub',
  epubFileName: 'mandarin-book-of-mormon.epub',
  outputFileName: 'bookOfMormon.zho.json',
});
