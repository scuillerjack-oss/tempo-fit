// Serveur statique local pour tester dist/ (aucune dépendance).
// Applique les en-têtes de dist/_headers, comme Cloudflare Pages, pour tester la CSP.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function parseHeaders() {
  const file = join(root, '_headers');
  if (!existsSync(file)) return [];
  const rules = [];
  let current = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
    } else if (current) {
      const i = line.indexOf(':');
      current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}
const rules = parseHeaders();

export function startServer(p = port) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (path.endsWith('/')) path += 'index.html';
    const file = join(root, path);
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    for (const r of rules) {
      if (r.pattern === '/*' || r.pattern === url.pathname) for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
    }
    try {
      const s = await stat(file);
      if (!s.isFile()) throw new Error('not file');
      res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
    }
  });
  return new Promise((resolve) => server.listen(p, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer().then(() => console.log(`TEMPO FIT servi sur http://localhost:${port}`));
}
