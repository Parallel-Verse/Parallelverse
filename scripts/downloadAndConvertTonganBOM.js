import { convertOfficialBookOfMormonEpub } from './convertOfficialBookOfMormonEpub.js';

await convertOfficialBookOfMormonEpub({
  language: 'ton',
  sourcePage:
    'https://www.churchofjesuschrist.org/study/manual/translations-and-downloads/languages/tongan?lang=eng',
  epubUrl:
    'https://media.ldscdn.org/epub/lds-scriptures/book-of-mormon/06897_2006-00-0000-book-of-mormon-34406-ton.epub',
  epubFileName: 'tongan-book-of-mormon.epub',
  outputFileName: 'bookOfMormon.ton.json',
});
