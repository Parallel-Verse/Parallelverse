import englishReference from './book-of-mormon-reference.json';
import spanishReference from './bookOfMormon.es.json';
import japaneseReference from './bookOfMormon.ja.json';
import japaneseFuriganaReference from './bookOfMormon.ja.furigana.json';
import frenchReference from './bookOfMormon.fr.json';
import germanReference from './bookOfMormon.de.json';
import tagalogReference from './bookOfMormon.tl.json';
import portugueseReference from './bookOfMormon.pt.json';
import koreanReference from './bookOfMormon.ko.json';
import mandarinReference from './bookOfMormon.zho.json';
import cebuanoReference from './bookOfMormon.ceb.json';
import samoanReference from './bookOfMormon.smo.json';
import tonganReference from './bookOfMormon.ton.json';

export const languageOptions = [
  { code: 'eng', name: 'English', active: true },
  { code: 'spa', name: 'Spanish', active: true },
  { code: 'jpn', name: 'Japanese', active: true },
  { code: 'zho', name: 'Mandarin', active: true },
  { code: 'pt', name: 'Portuguese', active: true },
  { code: 'ko', name: 'Korean', active: true },
  { code: 'ceb', name: 'Cebuano', active: true },
  { code: 'smo', name: 'Samoan', active: true },
  { code: 'ton', name: 'Tongan', active: true },
  { code: 'deu', name: 'German', active: true },
  { code: 'tgl', name: 'Tagalog', active: true },
  { code: 'fra', name: 'French', active: true },
];

const loadedChapters = [
  {
    book: '1 Nephi',
    chapter: 1,
    sourceNote:
      'English follows a public-domain Book of Mormon text. Spanish is a clean local study translation prepared for this prototype.',
    verses: [
      {
        verse: 1,
        eng: 'I, Nephi, having been born of goodly parents, therefore I was taught somewhat in all the learning of my father; and having seen many afflictions in the course of my days, nevertheless, having been highly favored of the Lord in all my days; yea, having had a great knowledge of the goodness and the mysteries of God, therefore I make a record of my proceedings in my days.',
        spa: 'Yo, Nefi, habiendo nacido de buenos padres, fui instruido en parte en toda la ciencia de mi padre; y aunque he visto muchas aflicciones durante mis dias, tambien he sido grandemente favorecido por el Senor todos mis dias; si, y he tenido gran conocimiento de la bondad y de los misterios de Dios; por tanto, hago una relacion de mis hechos en mis dias.',
      },
      {
        verse: 2,
        eng: 'Yea, I make a record in the language of my father, which consists of the learning of the Jews and the language of the Egyptians.',
        spa: 'Si, hago una relacion en el idioma de mi padre, que se compone de la ciencia de los judios y del idioma de los egipcios.',
      },
      {
        verse: 3,
        eng: 'And I know that the record which I make is true; and I make it with mine own hand; and I make it according to my knowledge.',
        spa: 'Y se que la relacion que hago es verdadera; la escribo con mi propia mano, y la hago conforme a mi conocimiento.',
      },
      {
        verse: 4,
        eng: 'For it came to pass in the commencement of the first year of the reign of Zedekiah, king of Judah, my father, Lehi, having dwelt at Jerusalem in all his days; and in that same year there came many prophets, prophesying unto the people that they must repent, or the great city Jerusalem must be destroyed.',
        spa: 'Porque acontecio al comenzar el primer ano del reinado de Sedequias, rey de Juda, que mi padre Lehi habia vivido todos sus dias en Jerusalen; y en ese mismo ano vinieron muchos profetas, profetizando al pueblo que debia arrepentirse, o la gran ciudad de Jerusalen seria destruida.',
      },
      {
        verse: 5,
        eng: 'Wherefore it came to pass that my father, Lehi, as he went forth prayed unto the Lord, yea, even with all his heart, in behalf of his people.',
        spa: 'Por tanto, acontecio que mi padre Lehi salio y oro al Senor, si, con todo su corazon, a favor de su pueblo.',
      },
      {
        verse: 6,
        eng: 'And it came to pass as he prayed unto the Lord, there came a pillar of fire and dwelt upon a rock before him; and he saw and heard much; and because of the things which he saw and heard he did quake and tremble exceedingly.',
        spa: 'Y acontecio que, mientras oraba al Senor, vino una columna de fuego y se poso sobre una roca delante de el; y vio y oyo muchas cosas; y por causa de lo que vio y oyo, temblo y se estremecio en gran manera.',
      },
      {
        verse: 7,
        eng: 'And it came to pass that he returned to his own house at Jerusalem; and he cast himself upon his bed, being overcome with the Spirit and the things which he had seen.',
        spa: 'Y acontecio que volvio a su propia casa en Jerusalen; y se echo sobre su lecho, vencido por el Espiritu y por las cosas que habia visto.',
      },
      {
        verse: 8,
        eng: 'And being thus overcome with the Spirit, he was carried away in a vision, even that he saw the heavens open, and he thought he saw God sitting upon his throne, surrounded with numberless concourses of angels in the attitude of singing and praising their God.',
        spa: 'Y estando asi vencido por el Espiritu, fue arrebatado en una vision, de modo que vio abrirse los cielos, y penso ver a Dios sentado sobre su trono, rodeado de innumerables multitudes de angeles en actitud de cantar y alabar a su Dios.',
      },
      {
        verse: 9,
        eng: 'And it came to pass that he saw One descending out of the midst of heaven, and he beheld that his luster was above that of the sun at noon-day.',
        spa: 'Y acontecio que vio a Uno descender de en medio del cielo, y contemplo que su resplandor era mayor que el del sol al mediodia.',
      },
      {
        verse: 10,
        eng: 'And he also saw twelve others following him, and their brightness did exceed that of the stars in the firmament.',
        spa: 'Y vio tambien a otros doce que lo seguian, y su brillo excedia al de las estrellas en el firmamento.',
      },
      {
        verse: 11,
        eng: 'And they came down and went forth upon the face of the earth; and the first came and stood before my father, and gave unto him a book, and bade him that he should read.',
        spa: 'Y descendieron y salieron sobre la faz de la tierra; y el primero vino y se puso delante de mi padre, le dio un libro y le mando que leyera.',
      },
      {
        verse: 12,
        eng: 'And it came to pass that as he read, he was filled with the Spirit of the Lord.',
        spa: 'Y acontecio que, mientras leia, fue lleno del Espiritu del Senor.',
      },
      {
        verse: 13,
        eng: 'And he read, saying: Wo, wo, unto Jerusalem, for I have seen thine abominations! Yea, and many things did my father read concerning Jerusalem, that it should be destroyed, and the inhabitants thereof; many should perish by the sword, and many should be carried away captive into Babylon.',
        spa: 'Y leyo, diciendo: Ay, ay de Jerusalen, porque he visto tus abominaciones. Si, y muchas cosas leyo mi padre acerca de Jerusalen: que seria destruida, junto con sus habitantes; que muchos perecerian por la espada y muchos serian llevados cautivos a Babilonia.',
      },
      {
        verse: 14,
        eng: 'And it came to pass that when my father had read and saw many great and marvelous things, he did exclaim many things unto the Lord; such as: Great and marvelous are thy works, O Lord God Almighty! Thy throne is high in the heavens, and thy power, and goodness, and mercy are over all the inhabitants of the earth; and, because thou art merciful, thou wilt not suffer those who come unto thee that they shall perish!',
        spa: 'Y acontecio que, cuando mi padre hubo leido y vio muchas cosas grandes y maravillosas, exclamo muchas cosas al Senor, tales como: Grandes y maravillosas son tus obras, oh Senor Dios Todopoderoso. Tu trono esta alto en los cielos, y tu poder, bondad y misericordia estan sobre todos los habitantes de la tierra; y por cuanto eres misericordioso, no permitiras que perezcan los que vengan a ti.',
      },
      {
        verse: 15,
        eng: 'And after this manner was the language of my father in the praising of his God; for his soul did rejoice, and his whole heart was filled, because of the things which he had seen, yea, which the Lord had shown unto him.',
        spa: 'Y de esta manera hablaba mi padre al alabar a su Dios; porque su alma se regocijaba, y todo su corazon estaba lleno a causa de las cosas que habia visto, si, las que el Senor le habia mostrado.',
      },
      {
        verse: 16,
        eng: 'And now I, Nephi, do not make a full account of the things which my father hath written, for he hath written many things which he saw in visions and in dreams; and he also hath written many things which he prophesied and spake unto his children, of which I shall not make a full account.',
        spa: 'Y ahora yo, Nefi, no hago una relacion completa de las cosas que mi padre ha escrito, porque ha escrito muchas cosas que vio en visiones y en suenos; y tambien ha escrito muchas cosas que profetizo y hablo a sus hijos, de las cuales no hare una relacion completa.',
      },
      {
        verse: 17,
        eng: 'But I shall make an account of my proceedings in my days. Behold, I make an abridgment of the record of my father, upon plates which I have made with mine own hands; wherefore, after I have abridged the record of my father then will I make an account of mine own life.',
        spa: 'Pero hare una relacion de mis hechos en mis dias. He aqui, hago un compendio de la relacion de mi padre sobre planchas que he hecho con mis propias manos; por tanto, despues de compendiar la relacion de mi padre, hare una relacion de mi propia vida.',
      },
      {
        verse: 18,
        eng: 'Therefore, I would that ye should know, that after the Lord had shown so many marvelous things unto my father, Lehi, yea, concerning the destruction of Jerusalem, behold he went forth among the people, and began to prophesy and to declare unto them concerning the things which he had both seen and heard.',
        spa: 'Por tanto, quisiera que supierais que, despues que el Senor hubo mostrado tantas cosas maravillosas a mi padre Lehi, si, acerca de la destruccion de Jerusalen, he aqui, salio entre el pueblo y empezo a profetizar y a declararles las cosas que habia visto y oido.',
      },
      {
        verse: 19,
        eng: 'And it came to pass that the Jews did mock him because of the things which he testified of them; for he truly testified of their wickedness and their abominations; and he testified that the things which he saw and heard, and also the things which he read in the book, manifested plainly of the coming of a Messiah, and also the redemption of the world.',
        spa: 'Y acontecio que los judios se burlaron de el por las cosas que testificaba acerca de ellos; porque en verdad testificaba de su iniquidad y de sus abominaciones; y testificaba que las cosas que vio y oyo, y tambien las que leyo en el libro, manifestaban claramente la venida de un Mesias y tambien la redencion del mundo.',
      },
      {
        verse: 20,
        eng: 'And when the Jews heard these things they were angry with him; yea, even as with the prophets of old, whom they had cast out, and stoned, and slain; and they also sought his life, that they might take it away. But behold, I, Nephi, will show unto you that the tender mercies of the Lord are over all those whom he hath chosen, because of their faith, to make them mighty even unto the power of deliverance.',
        spa: 'Y cuando los judios oyeron estas cosas, se enojaron contra el; si, tal como contra los profetas antiguos, a quienes habian echado fuera, apedreado y matado; y tambien procuraron quitarle la vida. Pero he aqui, yo, Nefi, os mostrare que las tiernas misericordias del Senor estan sobre todos aquellos a quienes ha escogido, por causa de su fe, para hacerlos poderosos hasta el poder de la liberacion.',
      },
    ],
  },
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

const chapterKey = (book, chapter) => `${book}-${chapter}`;
const loadedChapterMap = new Map(
  loadedChapters.map((chapter) => [chapterKey(chapter.book, chapter.chapter), chapter]),
);

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

const japaneseBookTitles = {
  '1 Nephi': 'ニーファイ第一書',
  '2 Nephi': 'ニーファイ第二書',
  Jacob: 'ヤコブ書',
  Enos: 'エノス書',
  Jarom: 'ジェロム書',
  Omni: 'オムナイ書',
  'Words of Mormon': 'モルモンの言葉',
  Mosiah: 'モーサヤ書',
  Alma: 'アルマ書',
  Helaman: 'ヒラマン書',
  '3 Nephi': '第三ニーファイ',
  '4 Nephi': '第四ニーファイ',
  Mormon: 'モルモン書',
  Ether: 'エテル書',
  Moroni: 'モロナイ書',
};

const frenchBookTitles = {
  '1 Nephi': 'Premier Livre de Néphi',
  '2 Nephi': 'Deuxième Livre de Néphi',
  Jacob: 'Livre de Jacob',
  Enos: 'Énos',
  Jarom: 'Jarom',
  Omni: 'Omni',
  'Words of Mormon': 'Paroles de Mormon',
  Mosiah: 'Livre de Mosiah',
  Alma: 'Livre d’Alma',
  Helaman: 'Livre d’Hélaman',
  '3 Nephi': 'Trois Néphi',
  '4 Nephi': '4 Néphi',
  Mormon: 'Livre de Mormon',
  Ether: 'Livre d’Éther',
  Moroni: 'Livre de Moroni',
};

const germanBookTitles = {
  '1 Nephi': 'Das Erste Buch Nephi',
  '2 Nephi': 'Das Zweite Buch Nephi',
  Jacob: 'Das Buch Jakob',
  Enos: 'Das Buch Enos',
  Jarom: 'Das Buch Jarom',
  Omni: 'Das Buch Omni',
  'Words of Mormon': 'Die Worte Mormons',
  Mosiah: 'Das Buch Mosia',
  Alma: 'Das Buch Alma',
  Helaman: 'Das Buch Helaman',
  '3 Nephi': 'Dritter Nephi',
  '4 Nephi': 'Vierter Nephi',
  Mormon: 'Das Buch Mormon',
  Ether: 'Das Buch Ether',
  Moroni: 'Das Buch Moroni',
};

const tagalogBookTitles = {
  '1 Nephi': 'Ang Unang Aklat ni Nephi',
  '2 Nephi': 'Ang Ikalawang Aklat ni Nephi',
  Jacob: 'Ang Aklat ni Jacob',
  Enos: 'Ang Aklat ni Enos',
  Jarom: 'Ang Aklat ni Jarom',
  Omni: 'Ang Aklat ni Omni',
  'Words of Mormon': 'Ang mga Salita ni Mormon',
  Mosiah: 'Ang Aklat ni Mosias',
  Alma: 'Ang Aklat ni Alma',
  Helaman: 'Ang Aklat ni Helaman',
  '3 Nephi': 'Ikatlong Nephi',
  '4 Nephi': 'Ikaapat na Nephi',
  Mormon: 'Ang Aklat ni Mormon',
  Ether: 'Ang Aklat ni Eter',
  Moroni: 'Ang Aklat ni Moroni',
};

const portugueseBookTitles = {
  '1 Nephi': '1 Néfi',
  '2 Nephi': '2 Néfi',
  Jacob: 'Jacó',
  Enos: 'Enos',
  Jarom: 'Jarom',
  Omni: 'Ômni',
  'Words of Mormon': 'Palavras de Mórmon',
  Mosiah: 'Mosias',
  Alma: 'Alma',
  Helaman: 'Helamã',
  '3 Nephi': '3 Néfi',
  '4 Nephi': '4 Néfi',
  Mormon: 'Mórmon',
  Ether: 'Éter',
  Moroni: 'Morôni',
};

const koreanBookTitles = {
  '1 Nephi': '니파이전서',
  '2 Nephi': '니파이후서',
  Jacob: '야곱서',
  Enos: '이노스서',
  Jarom: '예이롬서',
  Omni: '옴나이서',
  'Words of Mormon': '몰몬의 말씀',
  Mosiah: '모사이야서',
  Alma: '앨마서',
  Helaman: '힐라맨서',
  '3 Nephi': '제3니파이',
  '4 Nephi': '제4니파이',
  Mormon: '몰몬서',
  Ether: '이더서',
  Moroni: '모로나이서',
};

const spanishBookMap = new Map(spanishReference.books.map((book) => [book.title, book]));
const japaneseBookMap = new Map(japaneseReference.books.map((book) => [book.title, book]));
const japaneseFuriganaBookMap = new Map(
  japaneseFuriganaReference.books.map((book) => [book.title, book]),
);
const frenchBookMap = new Map(frenchReference.books.map((book) => [book.title, book]));
const germanBookMap = new Map(germanReference.books.map((book) => [book.title, book]));
const tagalogBookMap = new Map(tagalogReference.books.map((book) => [book.title, book]));
const portugueseBookMap = new Map(portugueseReference.books.map((book) => [book.title, book]));
const koreanBookMap = new Map(koreanReference.books.map((book) => [book.title, book]));

const bookMapById = (reference) => new Map(reference.books.map((book) => [book.id, book]));

const translationSources = [
  { code: 'spa', titles: spanishBookTitles, bookMap: spanishBookMap, bookMapById: bookMapById(spanishReference) },
  { code: 'jpn', titles: japaneseBookTitles, bookMap: japaneseBookMap, bookMapById: bookMapById(japaneseReference) },
  { code: 'zho', bookMapById: bookMapById(mandarinReference) },
  { code: 'pt', titles: portugueseBookTitles, bookMap: portugueseBookMap, bookMapById: bookMapById(portugueseReference) },
  { code: 'ko', titles: koreanBookTitles, bookMap: koreanBookMap, bookMapById: bookMapById(koreanReference) },
  { code: 'ceb', bookMapById: bookMapById(cebuanoReference) },
  { code: 'smo', bookMapById: bookMapById(samoanReference) },
  { code: 'ton', bookMapById: bookMapById(tonganReference) },
  { code: 'fra', titles: frenchBookTitles, bookMap: frenchBookMap, bookMapById: bookMapById(frenchReference) },
  { code: 'deu', titles: germanBookTitles, bookMap: germanBookMap, bookMapById: bookMapById(germanReference) },
  { code: 'tgl', titles: tagalogBookTitles, bookMap: tagalogBookMap, bookMapById: bookMapById(tagalogReference) },
];

const furiganaSource = {
  code: 'jpn_furigana',
  titles: japaneseBookTitles,
  bookMap: japaneseFuriganaBookMap,
};

const getTranslationVerses = (source, book, chapter) => {
  const translatedBook =
    source.bookMapById?.get(bookIdsByEnglish[book]) ?? source.bookMap?.get(source.titles?.[book] ?? book);
  const translatedChapter = translatedBook?.chapters.find((item) => Number(item.chapter) === chapter);
  return new Map((translatedChapter?.verses ?? []).map((verse) => [Number(verse.verse), verse.text]));
};

const localizedTitlesFor = (book) =>
  translationSources.reduce(
    (titles, source) => ({
      ...titles,
      [source.code]:
        source.titles?.[book] ??
        source.bookMapById?.get(bookIdsByEnglish[book])?.title ??
        book,
    }),
    { eng: book },
  );

const loadedVerseMap = (book, chapter) => {
  const loadedChapter = loadedChapterMap.get(chapterKey(book, chapter));
  return new Map((loadedChapter?.verses ?? []).map((verse) => [Number(verse.verse), verse]));
};

const createPlaceholderChapter = (book, chapter) => ({
  book,
  chapter,
  titles: localizedTitlesFor(book),
  sourceNote: 'Navigation is ready for this chapter. Text can be added by language in scriptureData.js.',
  verses: [
    {
      verse: 1,
      eng: `${book} chapter ${chapter} is available in navigation. Text for this chapter has not been loaded yet.`,
      spa: `${book} capitulo ${chapter} esta disponible en la navegacion. El texto de este capitulo aun no se ha cargado.`,
      jpn: `${book} ${chapter}章はナビゲーションで選択できます。この章の本文はまだ読み込まれていません。`,
      pt: `${book} capítulo ${chapter} está disponível na navegação. O texto deste capítulo ainda não foi carregado.`,
      ko: `${book} ${chapter}장은 탐색에서 선택할 수 있습니다. 이 장의 본문은 아직 로드되지 않았습니다.`,
      fra: `${book} chapitre ${chapter} est disponible dans la navigation. Le texte de ce chapitre n'a pas encore ete charge.`,
      deu: `${book} Kapitel ${chapter} ist in der Navigation verfugbar. Der Text dieses Kapitels wurde noch nicht geladen.`,
      tgl: `Maaaring piliin ang ${book} kabanata ${chapter} sa nabigasyon. Hindi pa nailalagay ang teksto ng kabanatang ito.`,
    },
  ],
});

export const chapters = bookIndex.flatMap(({ book, chapters: chapterCount }) =>
  Array.from({ length: chapterCount }, (_, index) => {
    const chapter = index + 1;
    const englishChapter = englishReference[book]?.[String(chapter)];
    const translatedVerseMaps = Object.fromEntries(
      translationSources.map((source) => [source.code, getTranslationVerses(source, book, chapter)]),
    );
    const furiganaVerses = new Map(
      (furiganaSource.bookMap
        .get(furiganaSource.titles[book] ?? book)
        ?.chapters.find((item) => Number(item.chapter) === chapter)
        ?.verses ?? []
      ).map((verse) => [Number(verse.verse), verse]),
    );

    if (!englishChapter) {
      return createPlaceholderChapter(book, chapter);
    }

    const overlays = loadedVerseMap(book, chapter);
    const verses = Object.entries(englishChapter)
      .filter(([verse]) => /^\d+$/.test(verse))
      .map(([verse, eng]) => {
        const overlay = overlays.get(Number(verse)) ?? {};
        const { verse: _verse, eng: _eng, ...translations } = overlay;
        return {
          verse: Number(verse),
          eng,
          ...translations,
          ...Object.fromEntries(
            Object.entries(translatedVerseMaps)
              .filter(([, verses]) => verses.has(Number(verse)))
              .map(([code, verses]) => [code, verses.get(Number(verse))]),
          ),
          ...(furiganaVerses.has(Number(verse))
            ? { jpn_furigana: furiganaVerses.get(Number(verse)) }
            : {}),
        };
      });

    return {
      book,
      chapter,
      titles: localizedTitlesFor(book),
      sourceNote:
        'English text loaded from the public-domain bcbooks/scriptures-json Book of Mormon reference edition. Additional language text loaded from local user-provided JSON files.',
      verses,
    };
  }),
);
