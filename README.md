# Parallel Classics

A mobile-first React + Vite reader for public-domain classic literature in synchronized language panes.

## Features

- Gallery of five starter classics with real PNG cover assets.
- Portrait reader layout stacks language panes top and bottom.
- Landscape reader layout places language panes side by side.
- Hidden sync IDs are shared across translations for synchronized reading.
- Compact corner controls for book, chapter, language, theme, and font size.
- Light, Dark, and Sepia themes.
- Preferences persist in `localStorage`.
- Public-domain data pipeline and validation scripts.

## Local Development

```bash
npm install
npm run dev
```

Build the production app:

```bash
npm run build
```

Validate normalized book data:

```bash
npm run validate:books
```

Download and convert public-domain source texts:

```bash
npm run convert:classics
```

The converter searches Gutendex for Project Gutenberg public-domain text files, stores raw downloads in `input/raw/`, converts them into normalized JSON in `src/data/books/`, and warns when chapter or paragraph counts differ between translations.

Run the Alice semantic alignment pipeline:

```bash
npm run alice:pipeline
```

The Alice pipeline writes raw sources to `input/raw/alice/`, cleaned chapter data to `input/clean/alice/`, final aligned files to `src/data/books/alice/`, and review reports to `reports/`.

## Data Shape

Alice uses the semantic sync-unit format:

```json
{
  "bookId": "alice",
  "title": "Alice's Adventures in Wonderland",
  "author": "Lewis Carroll",
  "language": "en",
  "source": {
    "name": "Project Gutenberg",
    "url": "https://www.gutenberg.org/ebooks/11",
    "licenseNote": "Public domain in the USA"
  },
  "chapters": [
    {
      "chapter": 1,
      "title": "Down the Rabbit-Hole",
      "units": [
        {
          "unit": 1,
          "syncId": "alice-ch01-u001",
          "text": "..."
        }
      ]
    }
  ]
}
```

The reader hides `unit` values by default and uses `syncId` only for synchronization. The reader menu has a debug toggle for showing hidden unit numbers during alignment testing.

## Alice Sources

- English: Project Gutenberg, <https://www.gutenberg.org/ebooks/11>, public domain in the USA.
- French: Project Gutenberg, <https://www.gutenberg.org/ebooks/55456>, public domain in the USA.
- German: Project Gutenberg, <https://www.gutenberg.org/ebooks/19778>, public domain in the USA.
- Spanish: textos.info, <https://www.textos.info/lewis-carroll/alicia-en-el-pais-de-las-maravillas>. The page identifies the translation as Juan Gutierrez Gili's 1927 Spanish translation and provides a freely available digital text. Do not replace it with a modern copyrighted translation.

Only public-domain texts and public-domain translations should be added.
