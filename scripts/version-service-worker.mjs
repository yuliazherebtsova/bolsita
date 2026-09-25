import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = process.argv[2] ?? 'dist';
const template = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const hash = createHash('sha256').update(template);

// A release changes the shell cache, never the localStorage schema/key.
for (const name of (await readdir(directory, { recursive: true })).sort()) {
  const path = join(directory, name);
  if (name !== 'sw.js' && (await stat(path)).isFile()) {
    hash.update(name).update('\0').update(await readFile(path)).update('\0');
  }
}

const version = hash.digest('hex').slice(0, 16);
await writeFile(join(directory, 'sw.js'), template.replaceAll('__BOLSITA_BUILD_VERSION__', version));
