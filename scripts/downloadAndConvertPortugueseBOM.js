import { convertOfficialBookOfMormonEpub } from './convertOfficialBookOfMormonEpub.js';

await convertOfficialBookOfMormonEpub({
  language: 'pt',
  sourcePage:
    'https://www.churchofjesuschrist.org/study/manual/translations-and-downloads/languages/portuguese?lang=eng',
  epubUrl:
    'https://media.ldscdn.org/epub/lds-scriptures/book-of-mormon/06897_2013-00-0000-book-of-mormon-34406-por.epub',
  epubFileName: 'portuguese-book-of-mormon.epub',
  outputFileName: 'bookOfMormon.pt.json',
});
