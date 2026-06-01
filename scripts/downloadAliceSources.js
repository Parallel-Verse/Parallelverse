import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { aliceSources, ensureAliceDirs, rawDir } from './aliceAlignmentUtils.js';

await ensureAliceDirs();

for (const source of Object.values(aliceSources)) {
  console.log(`Downloading Alice ${source.language} from ${source.source.name}`);
  const response = await fetch(source.source.textUrl, {
    headers: { 'user-agent': 'Parallel Classics Alice alignment pipeline' },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${source.source.textUrl}`);
  }
  const text = await response.text();
  await writeFile(path.join(rawDir, `alice.${source.language}.raw`), text, 'utf8');
}

console.log(`Wrote raw Alice sources to ${rawDir}`);
