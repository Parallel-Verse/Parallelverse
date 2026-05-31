export const languageRegistry = {
  en: { label: 'English', file: 'bookOfMormon.en.json' },
  es: { label: 'Spanish', file: 'bookOfMormon.es.json' },
  zho: { label: 'Mandarin', file: 'bookOfMormon.zho.json' },
  ceb: { label: 'Cebuano', file: 'bookOfMormon.ceb.json' },
  pt: { label: 'Português', file: 'bookOfMormon.pt.json' },
  fr: { label: 'Français', file: 'bookOfMormon.fr.json' },
  de: { label: 'Deutsch', file: 'bookOfMormon.de.json' },
  ja: { label: '日本語', file: 'bookOfMormon.ja.json' },
  ko: { label: '한국어', file: 'bookOfMormon.ko.json' },
  smo: { label: 'Samoan', file: 'bookOfMormon.smo.json' },
  ton: { label: 'Tongan', file: 'bookOfMormon.ton.json' },
  tl: { label: 'Tagalog', file: 'bookOfMormon.tl.json' },
} as const;

export type LanguageCode = keyof typeof languageRegistry;
