import { convertOfficialBookOfMormonEpub } from './convertOfficialBookOfMormonEpub.js';

await convertOfficialBookOfMormonEpub({
  language: 'smo',
  sourcePage:
    'https://www.churchofjesuschrist.org/study/manual/translations-and-downloads/languages/samoan?lang=eng',
  epubUrl:
    'https://media.ldscdn.org/epub/lds-scriptures/book-of-mormon/06897_2011-00-0000-book-of-mormon-34406-smo.epub',
  epubFileName: 'samoan-book-of-mormon.epub',
  outputFileName: 'bookOfMormon.smo.json',
});
