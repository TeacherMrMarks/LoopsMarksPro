import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const supabaseUrl = process.env.LOOPS_SUPABASE_URL || '';
const supabaseKey = process.env.LOOPS_SUPABASE_PUBLIC_KEY || '';
if (Boolean(supabaseUrl) !== Boolean(supabaseKey)) {
  throw new Error('Defina LOOPS_SUPABASE_URL e LOOPS_SUPABASE_PUBLIC_KEY juntas.');
}
if (supabaseKey.startsWith('sb_secret_')) {
  throw new Error('Use a chave pública do Supabase.');
}
if (supabaseKey.startsWith('eyJ')) {
  const [, payload] = supabaseKey.split('.');
  if (JSON.parse(Buffer.from(payload, 'base64url')).role !== 'anon') {
    throw new Error('Use a chave anon ou publishable do Supabase.');
  }
}
if (supabaseUrl && new URL(supabaseUrl).protocol !== 'https:') {
  throw new Error('A URL do Supabase deve usar HTTPS.');
}
writeFileSync(new URL('../dist/config.js', import.meta.url),
  'window.LOOPS_CONFIG = ' + JSON.stringify({ supabaseUrl, supabaseKey }) + ';\n');

const root = new URL('../dist/', import.meta.url);
const hash = createHash('sha256');
for (const file of readdirSync(root).sort()) {
  if (file === 'sw.js') continue;
  hash.update(file);
  hash.update(readFileSync(new URL(file, root)));
}
const worker = new URL('sw.js', root);
writeFileSync(worker, readFileSync(worker, 'utf8').replace(
  /^const VERSION = 'loops-marks-[^']+';/m,
  `const VERSION = 'loops-marks-${hash.digest('hex').slice(0, 12)}';`,
));
