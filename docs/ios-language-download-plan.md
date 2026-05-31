# iOS Optional Language Downloads

Parallel Verse should ship with English and Spanish bundled so the default reader works offline on first launch. Additional languages can move to optional downloads after the Capacitor shell is stable.

## Proposed Approach

1. Keep English and Spanish in the app bundle and load them from local imports.
2. Move other language JSON files to hosted release assets, GitHub Pages assets, or another static CDN.
3. Add a language manifest with code, label, version, byte size, checksum, and download URL.
4. Use `@capacitor/filesystem` to save downloaded language files under `Directory.Data`.
5. At startup, merge bundled languages with downloaded languages discovered from the local manifest cache.
6. In Settings, show unavailable languages as download actions instead of selectable reader languages.
7. Validate downloaded JSON against the same shape used by the current scripture data before enabling it.
8. Keep a versioned cache key so updated language files can be re-downloaded without breaking existing offline data.

## Notes

- Bundled offline baseline: English and Spanish.
- Downloaded files should be treated as content data only; do not manually rewrite scripture text in code.
- Keep the existing disclaimer visible in Settings:
  "Unofficial study tool. Not affiliated with The Church of Jesus Christ of Latter-day Saints."
