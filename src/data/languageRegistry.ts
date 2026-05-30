export const languageRegistry = {
  en: { label: 'English', file: 'bookOfMormon.en.json' },
  es: { label: 'Spanish', file: 'bookOfMormon.es.json' },
  pt: { label: 'Português', file: 'bookOfMormon.pt.json' },
  fr: { label: 'Français', file: 'bookOfMormon.fr.json' },
  de: { label: 'Deutsch', file: 'bookOfMormon.de.json' },
  ja: { label: '日本語', file: 'bookOfMormon.ja.json' },
  ko: { label: '한국어', file: 'bookOfMormon.ko.json' },
  tl: { label: 'Tagalog', file: 'bookOfMormon.tl.json' },
} as const;

export type LanguageCode = keyof typeof languageRegistry;
