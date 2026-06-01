import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const outDir = path.join(process.cwd(), 'src', 'data', 'books');
const rawDir = path.join(process.cwd(), 'input', 'raw', 'wikisource');

const sherlockFrenchPages = [
  ['I. A SCANDAL IN BOHEMIA', 'Premières aventures de Sherlock Holmes/Un Scandale en Bohême'],
  ['II. THE RED-HEADED LEAGUE', 'Nouvelles Aventures de Sherlock Holmes/L’Association des hommes roux'],
  ['III. A CASE OF IDENTITY', 'Nouvelles Aventures de Sherlock Holmes/Un cas d’identité'],
  ['IV. THE BOSCOMBE VALLEY MYSTERY', 'Nouvelles Aventures de Sherlock Holmes/Le Mystère de la vallée de Boscombe'],
  ['V. THE FIVE ORANGE PIPS', 'Nouvelles Aventures de Sherlock Holmes/L’Aventure des Cinq Pépins d’orange'],
  ['VI. THE MAN WITH THE TWISTED LIP', 'Nouvelles Aventures de Sherlock Holmes/L’Homme à la lèvre retroussée'],
  ['VII. THE ADVENTURE OF THE BLUE CARBUNCLE', 'Premières aventures de Sherlock Holmes/L’Escarboucle Bleue'],
  ['VIII. THE ADVENTURE OF THE SPECKLED BAND', 'Premières aventures de Sherlock Holmes/Aventure de la Bande mouchetée'],
  ['IX. THE ADVENTURE OF THE ENGINEER’S THUMB', 'Premières aventures de Sherlock Holmes/Le Pouce de l’Ingénieur'],
  ['X. THE ADVENTURE OF THE NOBLE BACHELOR', 'Premières aventures de Sherlock Holmes/L’Aristocratique Célibataire'],
  ['XI. THE ADVENTURE OF THE BERYL CORONET', 'Premières aventures de Sherlock Holmes/Le Diadème de Béryls'],
  ['XII. THE ADVENTURE OF THE COPPER BEECHES', 'Premières aventures de Sherlock Holmes/Les Hêtres Pourpres'],
];

const grimmGermanPages = [
  ['THE GOLDEN BIRD', 'Der goldene Vogel'],
  ['HANS IN LUCK', 'Hans im Glück'],
  ['JORINDA AND JORINDEL', 'Jorinde und Joringel'],
  ['THE TRAVELLING MUSICIANS', 'Die Bremer Stadtmusikanten'],
  ['OLD SULTAN', 'Der alte Sultan'],
  ['BRIAR ROSE', 'Dornröschen'],
  ['THE DOG AND THE SPARROW', 'Der Hund und der Sperling'],
  ['THE TWELVE DANCING PRINCESSES', 'Die zertanzten Schuhe'],
  ['THE FISHERMAN AND HIS WIFE', 'Von dem Fischer un syner Fru'],
  ['THE WILLOW-WREN AND THE BEAR', 'Der Zaunkönig und der Bär'],
  ['THE FROG-PRINCE', 'Der Froschkönig oder der eiserne Heinrich'],
  ['CAT AND MOUSE IN PARTNERSHIP', 'Katze und Maus in Gesellschaft'],
  ['THE GOOSE-GIRL', 'Die Gänsemagd'],
  ['THE ADVENTURES OF CHANTICLEER AND PARTLET', 'Das Lumpengesindel'],
  ['RAPUNZEL', 'Rapunzel'],
  ['FUNDEVOGEL', 'Fundevogel'],
  ['THE VALIANT LITTLE TAILOR', 'Das tapfere Schneiderlein'],
  ['HANSEL AND GRETEL', 'Hänsel und Grethel'],
  ['MOTHER HOLLE', 'Frau Holle'],
  ['LITTLE RED-CAP', 'Rothkäppchen'],
  ['THE ROBBER BRIDEGROOM', 'Der Räuberbräutigam'],
  ['TOM THUMB', 'Daumesdick'],
  ['RUMPELSTILTSKIN', 'Rumpelstilzchen'],
  ['CLEVER GRETEL', 'Das kluge Grethel'],
  ['THE OLD MAN AND HIS GRANDSON', 'Der alte Großvater und der Enkel'],
  ['THE LITTLE PEASANT', 'Das Bürle'],
  ['FREDERICK AND CATHERINE', 'Der Frieder und das Catherlieschen'],
  ['SWEETHEART ROLAND', 'Der Liebste Roland'],
  ['SNOWDROP', 'Sneewittchen'],
  ['THE PINK', 'Die Nelke'],
  ['CLEVER ELSIE', 'Die kluge Else'],
  ['THE MISER IN THE BUSH', 'Der Jude im Dorn'],
  ['ASHPUTTEL', 'Aschenputtel'],
  ['THE WHITE SNAKE', 'Die weiße Schlange'],
  ['THE WOLF AND THE SEVEN LITTLE KIDS', 'Der Wolf und die sieben jungen Geislein'],
  ['THE QUEEN BEE', 'Die Bienenkönigin'],
  ['THE ELVES AND THE SHOEMAKER', 'Die Wichtelmänner'],
  ['THE JUNIPER-TREE', 'Von dem Machandelboom (1850)'],
  ['THE TURNIP', 'Die Rübe'],
  ['CLEVER HANS', 'Der gescheidte Hans'],
  ['THE THREE LANGUAGES', 'Die drei Sprachen'],
  ['THE FOX AND THE CAT', 'Der Fuchs und die Katze'],
  ['THE FOUR CLEVER BROTHERS', 'Die vier kunstreichen Brüder'],
  ['LILY AND THE LION', 'Das singende springende Löweneckerchen'],
  ['THE FOX AND THE HORSE', 'Der Fuchs und das Pferd'],
  ['THE BLUE LIGHT', 'Das blaue Licht'],
  ['THE RAVEN', 'Die Rabe'],
  ['THE GOLDEN GOOSE', 'Die goldene Gans'],
  ['THE WATER OF LIFE', 'Das Wasser des Lebens'],
  ['THE TWELVE HUNTSMEN', 'Die zwölf Jäger'],
  ['THE KING OF THE GOLDEN MOUNTAIN', 'Der König vom goldenen Berg'],
  ['DOCTOR KNOWALL', 'Doctor Allwissend'],
  ['THE SEVEN RAVENS', 'Die sieben Raben'],
  ['FIRST STORY', 'Die Hochzeit der Frau Füchsin'],
  ['SECOND STORY', 'Die Hochzeit der Frau Füchsin'],
  ['THE SALAD', 'Der Krautesel'],
  ['THE STORY OF THE YOUTH WHO WENT FORTH TO LEARN WHAT FEAR WAS', 'Mährchen von einem, der auszog das Fürchten zu lernen'],
  ['KING GRISLY-BEARD', 'König Drosselbart'],
  ['IRON HANS', 'Der Eisenhans'],
  ['CAT-SKIN', 'Allerleirauh'],
  ['SNOW-WHITE AND ROSE-RED', 'Schneeweißchen und Rosenroth'],
];

await mkdir(outDir, { recursive: true });
await mkdir(rawDir, { recursive: true });

await writeBook({
  bookId: 'sherlock-holmes',
  title: 'Les Aventures de Sherlock Holmes',
  author: 'Arthur Conan Doyle',
  language: 'fr',
  source: {
    name: 'French Wikisource',
    url: 'https://fr.wikisource.org/wiki/Premières_aventures_de_Sherlock_Holmes',
    licenseNote: 'Public-domain French translations hosted by Wikisource',
  },
  site: 'https://fr.wikisource.org',
  pages: sherlockFrenchPages,
});

await writeBook({
  bookId: 'grimm',
  title: 'Kinder- und Hausmärchen',
  author: 'Brothers Grimm',
  language: 'de',
  source: {
    name: 'German Wikisource',
    url: 'https://de.wikisource.org/wiki/Der_goldene_Vogel',
    licenseNote: 'Public-domain German source texts hosted by Wikisource',
  },
  site: 'https://de.wikisource.org',
  pages: grimmGermanPages,
});

async function writeBook({ bookId, title, author, language, source, site, pages }) {
  const chapters = [];

  for (let index = 0; index < pages.length; index += 1) {
    const [englishTitle, page] = pages[index];
    const sourcePage = bookId === 'grimm' && !/\(\d{4}\)$/.test(page) ? `${page} (1857)` : page;
    console.log(`Fetching ${bookId}.${language} ${sourcePage}`);
    const text = await fetchWikisourceText(site, sourcePage);
    await writeFile(path.join(rawDir, `${bookId}.${language}.${index + 1}.txt`), text, 'utf8');

    chapters.push({
      chapterId: `chapter-${index + 1}`,
      title: englishTitle,
      sections: splitParagraphs(fixKnownDropCaps(bookId, language, index, text)).map((paragraph, paragraphIndex) => ({
        sectionId: `chapter-${index + 1}-p${paragraphIndex + 1}`,
        text: paragraph,
      })),
    });

    await wait(1800);
  }

  const book = { bookId, title, author, language, source, chapters };
  await writeFile(path.join(outDir, `${bookId}.${language}.json`), `${JSON.stringify(book, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${bookId}.${language}.json with ${chapters.length} chapters`);
}

async function fetchWikisourceText(site, page) {
  const apiUrl = `${site}/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json&origin=*`;
  const text = await fetchWithRetry(apiUrl);
  const data = JSON.parse(text);
  if (data.error) throw new Error(`${page}: ${data.error.code}: ${data.error.info}`);

  const $ = load(data.parse.text['*']);
  $('.noprint, .mw-editsection, sup.reference, style, script, table, .ws-noexport, .printfooter').remove();

  const blocks = [];
  $('.mw-parser-output p, .mw-parser-output .poem').each((_, element) => {
    const block = normalizeText($(element).text());
    if (block && !isNavigationText(block)) blocks.push(block);
  });

  if (!blocks.length) {
    const fallback = normalizeText($('.mw-parser-output').text());
    if (fallback) blocks.push(fallback);
  }

  return blocks.join('\n\n');
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, { headers: { 'user-agent': 'Parallel Classics public-domain importer' } });
    const text = await response.text();
    if (response.ok && !/^You are making too many requests/i.test(text)) return text;
    lastError = `${response.status} ${response.statusText}: ${text.slice(0, 80)}`;
    await wait(3500 * (attempt + 1));
  }
  throw new Error(lastError);
}

function splitParagraphs(text) {
  return text
    .split(/\n\s*\n/g)
    .map(normalizeText)
    .filter((paragraph) => paragraph.length > 0);
}

function normalizeText(text) {
  return String(text ?? '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNavigationText(text) {
  return /^(source|modifier|précédent|suivant|zurück|weiter|inhaltsverzeichnis)$/i.test(text);
}

function fixKnownDropCaps(bookId, language, index, text) {
  if (bookId !== 'sherlock-holmes' || language !== 'fr') return text;

  const fixes = new Map([
    [0, ['our Sherlock Holmes', 'Pour Sherlock Holmes']],
    [6, ['E surlendemain', 'Le surlendemain']],
    [7, ['n parcourant', 'En parcourant']],
    [8, ['armi tous', 'Parmi tous']],
    [9, ['e mariage', 'Le mariage']],
    [10, ['ON cher Holmes', 'Mon cher Holmes']],
    [11, ['OUR l’homme', 'Pour l’homme']],
    [11, ["OUR l'homme", "Pour l'homme"]],
  ]);

  const fix = fixes.get(index);
  if (!fix) return text;
  return text.replace(fix[0], fix[1]);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
