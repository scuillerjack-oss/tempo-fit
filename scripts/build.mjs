// Build TEMPO FIT : copie src/ vers dist/, inscrit le commit déployé et la liste de précache.
// Aucune dépendance. Sur Cloudflare Pages : commande « npm run build », dossier de sortie « dist ».
import { cpSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

function gitCommit() {
  try {
    return execSync('git rev-parse HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'local';
  }
}
function gitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'inconnue';
  }
}

const commit = process.env.CF_PAGES_COMMIT_SHA || gitCommit();
const branch = process.env.CF_PAGES_BRANCH || gitBranch();
const builtAt = new Date().toISOString();

rmSync(dist, { recursive: true, force: true });
cpSync(src, dist, { recursive: true });

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const SKIP = new Set(['sw.js', '_headers', 'version.json', 'index.html']);
const assets = walk(dist)
  .map((p) => relative(dist, p).split('\\').join('/'))
  .filter((p) => !SKIP.has(p))
  .sort()
  .map((p) => `./${p}`);

const swPath = join(dist, 'sw.js');
let sw = readFileSync(swPath, 'utf8');
if (!sw.includes('/*__PRECACHE__*/ []')) throw new Error('Marqueur de précache introuvable dans sw.js');
sw = sw.replace('/*__PRECACHE__*/ []', JSON.stringify(assets)).replaceAll('__COMMIT__', commit);
writeFileSync(swPath, sw);

const verPath = join(dist, 'js', 'version.js');
writeFileSync(verPath, readFileSync(verPath, 'utf8').replace('__COMMIT__', commit).replace('__BUILT_AT__', builtAt));

writeFileSync(join(dist, 'version.json'), JSON.stringify({ app: 'tempo-fit', commit, branch, builtAt }, null, 2) + '\n');

console.log(`Build OK — commit ${commit} (${branch}) — ${assets.length} fichiers en précache → dist/`);
