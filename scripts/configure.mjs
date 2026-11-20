import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
await build({ entryPoints: ['src/netlify-client.js'], outfile: 'dist/netlify-client.js',
  bundle: true, format: 'esm', platform: 'browser', target: ['es2022'], minify: true, legalComments: 'none' });
const root = new URL('../dist/', import.meta.url);
const hash = createHash('sha256');
for (const file of readdirSync(root).sort()) {
  if (file === 'sw.js') continue;
  hash.update(file); hash.update(readFileSync(new URL(file, root)));
}
const worker = new URL('sw.js', root);
writeFileSync(worker, readFileSync(worker, 'utf8').replace(
  /^const VERSION = 'loops-marks-[^']+';/m,
  `const VERSION = 'loops-marks-${hash.digest('hex').slice(0, 12)}';`,
));
console.log('Loops Marks Pro V3: cliente Netlify Identity e backup prontos.');
