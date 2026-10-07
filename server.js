// Kleine statische server met wachtwoord (HTTP Basic Auth). Geen afhankelijkheden.
// Gebruikersnaam en wachtwoord komen uit de omgevingsvariabelen AUTH_USER en AUTH_PASS.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 10000;
const USER = process.env.AUTH_USER || '';
const PASS = process.env.AUTH_PASS || '';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};
const BLOCK = new Set(['server.js', 'package.json', '.git', 'render.yaml']);

function safeEqual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function authorized(req) {
  if (!USER || !PASS) return false;
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const dec = Buffer.from(h.slice(6), 'base64').toString('utf8');
  const i = dec.indexOf(':');
  if (i < 0) return false;
  return safeEqual(dec.slice(0, i), USER) && safeEqual(dec.slice(i + 1), PASS);
}

http.createServer((req, res) => {
  if (req.url === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (!authorized(req)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Bewijsverkenner", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Toegang alleen met gebruikersnaam en wachtwoord.');
  }
  let p;
  try { p = decodeURIComponent((req.url || '/').split('?')[0]); } catch { res.writeHead(400); return res.end(); }
  if (p === '/' || p === '') p = '/index.html';
  const first = p.split('/')[1];
  if (BLOCK.has(first)) { res.writeHead(404); return res.end('Niet gevonden'); }
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(400); return res.end(); }
  fs.stat(file, (err, st) => {
    const target = (!err && st.isFile()) ? file : path.join(ROOT, 'index.html');
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff'
    });
    fs.createReadStream(target).pipe(res);
  });
}).listen(PORT, () => console.log('Bewijsverkenner luistert op poort ' + PORT));
