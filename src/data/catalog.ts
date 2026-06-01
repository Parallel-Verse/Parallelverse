import aliceCover from '../assets/covers/alice.svg';
import carolCover from '../assets/covers/christmas-carol.svg';
import sherlockCover from '../assets/covers/sherlock-holmes.svg';
import grimmCover from '../assets/covers/grimm.svg';
import eightyDaysCover from '../assets/covers/eighty-days.svg';
import monteCristoCover from '../assets/covers/monte-cristo-cover.png';
import iAmACatCover from '../assets/covers/i-am-a-cat-cover.png';
import botchanCover from '../assets/covers/botchan-cover.png';
import kokoroCover from '../assets/covers/kokoro-cover.png';
import bambooCutterCover from '../assets/covers/bamboo-cutter-cover.png';

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja';

export type BookCatalogItem = {
  category: 'Language Learner Classics' | 'Japanese Classics';
  bookId: string;
  title: string;
  originalTitle?: string;
  author: string;
  cover: string;
  languages: LanguageCode[];
  hasFurigana?: boolean;
};

export const languageNames: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ja: 'Japanese',
};

export const catalog: BookCatalogItem[] = [
  {
    category: 'Language Learner Classics',
    bookId: 'alice',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    cover: aliceCover,
    languages: ['en', 'es', 'fr', 'de'],
  },
  {
    category: 'Language Learner Classics',
    bookId: 'christmas-carol',
    title: 'A Christmas Carol',
    author: 'Charles Dickens',
    cover: carolCover,
    languages: ['en', 'es', 'fr', 'de'],
  },
  {
    category: 'Language Learner Classics',
    bookId: 'sherlock-holmes',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    cover: sherlockCover,
    languages: ['en', 'fr'],
  },
  {
    category: 'Language Learner Classics',
    bookId: 'grimm',
    title: "Grimm's Fairy Tales",
    author: 'Brothers Grimm',
    cover: grimmCover,
    languages: ['en', 'de'],
  },
  {
    category: 'Language Learner Classics',
    bookId: 'eighty-days',
    title: 'Around the World in Eighty Days',
    author: 'Jules Verne',
    cover: eightyDaysCover,
    languages: ['en', 'es', 'fr'],
  },
  {
    category: 'Language Learner Classics',
    bookId: 'monte-cristo',
    title: 'The Count of Monte Cristo',
    originalTitle: 'El conde de Monte-Cristo',
    author: 'Alexandre Dumas',
    cover: monteCristoCover,
    languages: ['en', 'es'],
  },
  {
    category: 'Japanese Classics',
    bookId: 'i-am-a-cat',
    title: 'I Am a Cat',
    originalTitle: '吾輩は猫である',
    author: 'Natsume Sōseki',
    cover: iAmACatCover,
    languages: ['ja', 'en'],
    hasFurigana: true,
  },
  {
    category: 'Japanese Classics',
    bookId: 'botchan',
    title: 'Botchan',
    originalTitle: '坊っちゃん',
    author: 'Natsume Sōseki',
    cover: botchanCover,
    languages: ['ja', 'en'],
    hasFurigana: true,
  },
  {
    category: 'Japanese Classics',
    bookId: 'kokoro',
    title: 'Kokoro',
    originalTitle: 'こころ',
    author: 'Natsume Sōseki',
    cover: kokoroCover,
    languages: ['ja', 'en'],
    hasFurigana: true,
  },
  {
    category: 'Japanese Classics',
    bookId: 'bamboo-cutter',
    title: 'The Tale of the Bamboo Cutter',
    originalTitle: '竹取物語',
    author: 'Traditional / unknown author',
    cover: bambooCutterCover,
    languages: ['ja', 'en'],
    hasFurigana: true,
  },
];
