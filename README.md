# Bilingual Book of Mormon Reader

A mobile-first React + Vite reader for studying Book of Mormon text in two synced language panes. Version 1 ships with the full English, Spanish, Japanese with optional furigana, French, German, and Tagalog Book of Mormon text with full book/chapter navigation.

Unofficial study tool. Not affiliated with The Church of Jesus Christ of Latter-day Saints.

## Features

- Portrait layout: English on top, Spanish on bottom.
- Landscape layout: English on the left, Spanish on the right.
- Verse-aware synced scrolling between panes.
- Book and chapter selectors for every Book of Mormon book and chapter.
- Settings menu with Light, Dark, and Sepia themes.
- Pane language selectors with English, Spanish, Japanese, German, and Tagalog active.
- Missing language text is shown explicitly when a selected translation has not been loaded for a verse yet.
- Preferences persist in `localStorage`.

## Local Development

```bash
npm install
npm run dev
```

Build the production app:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Scripture Data

The English text source lives in `src/data/book-of-mormon-reference.json`. User-provided translation files live in `src/data/bookOfMormon.*.json` for Spanish, Japanese, French, German, and Tagalog. The Japanese furigana file is used when the Japanese furigana setting is enabled. The reader data is assembled in `src/data/scriptureData.js`:

```js
{
  book: '1 Nephi',
  chapter: 1,
  verses: [
    {
      verse: 1,
      eng: '...',
      spa: '...'
    }
  ]
}
```

Additional authorized language text can be added by:

1. Adding a language option in `languageOptions`.
2. Adding a matching language key to each verse, such as `jpn` or `deu`.
3. Filling each chapter's verse data with aligned verse numbers.

The Japanese furigana file can be regenerated with:

```bash
npm run convert:japanese-furigana
```

This downloads the official Japanese EPUB, preserves source ruby markup when present, validates the output against the English book/chapter/verse structure, and writes `src/data/bookOfMormon.ja.furigana.json`.

Source note: the full English Book of Mormon text comes from the public-domain [`bcbooks/scriptures-json`](https://github.com/bcbooks/scriptures-json) reference edition, which states that its files are public domain and excludes copyrighted study material. The Spanish, Japanese, French, German, and Tagalog text were loaded from local user-provided JSON files. The Japanese Furigana JSON is generated from the official Japanese EPUB. Additional modern official non-English editions should only be added from sources you have permission to reproduce.

## GitHub Pages Deployment

This project uses `base: '/Parallelverse/'` in `vite.config.js`, so the production build is configured for this GitHub Pages project site:

```text
https://parallel-verse.github.io/Parallelverse/
```

The `homepage` field in `package.json` is set to `https://parallel-verse.github.io/Parallelverse/`.

### Create a New GitHub Repo

1. Create or open the GitHub organization `Parallel-Verse`.
2. Create or open the repository `Parallelverse`.
2. Push this project to the new repository.
3. In GitHub, open **Settings > Pages**.
4. Under **Build and deployment**, choose **GitHub Actions**.
5. Push to the `main` branch. The workflow in `.github/workflows/deploy.yml` builds the app and publishes `dist`.

### Optional `gh-pages` Script

You can also publish with:

```bash
npm run deploy
```

Then set GitHub Pages to deploy from the `gh-pages` branch in **Settings > Pages**.
