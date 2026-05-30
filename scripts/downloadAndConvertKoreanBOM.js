import { convertOfficialBookOfMormonEpub } from './convertOfficialBookOfMormonEpub.js';

await convertOfficialBookOfMormonEpub({
  language: 'ko',
  sourcePage:
    'https://www.churchofjesuschrist.org/study/manual/translations-and-downloads/languages/korean?lang=eng',
  epubUrl:
    'https://media.ldscdn.org/epub/lds-scriptures/book-of-mormon/06897_2005-00-0000-book-of-mormon-34406-kor.epub',
  epubFileName: 'korean-book-of-mormon.epub',
  outputFileName: 'bookOfMormon.ko.json',
});
