import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const forbidden = /(^\.|\.(?:sqlite\d*|db|pem|key)$|\.sqlite(?:-wal|-shm)?$)/i;
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (forbidden.test(entry.name) || entry.isSymbolicLink())
      throw new Error('Unexpected file in public assets');
    if (entry.isDirectory()) await inspect(join(directory, entry.name));
  }
}
await inspect(root);
for (const name of ['index.html', 'app.js', 'clinical.js', 'presentation-runtime.js',
  'presentation-fixtures.js', 'demo-scoring/scoring-service.mjs'])
  if (!(await stat(join(root, name))).isFile()) throw new Error('Missing frontend asset: ' + name);
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
}
const table = JSON.parse(await readFile(join(root, 'demo-scoring/interview-reference.json'), 'utf8'));
const digest = createHash('sha256').update(canonical(table)).digest('hex');
if (digest !== '64aea6e0f04a505cdf8334abfd598f691463c38369c7266dac6310843767fe13')
  throw new Error('Reference data integrity check failed');
console.log('Frontend assets are ready. No server application or database is included.');
