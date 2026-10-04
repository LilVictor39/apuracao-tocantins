import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
const lan = process.argv.includes('--lan');

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { response.writeHead(403).end(); return; }
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404).end('Arquivo nao encontrado'); }
});
server.listen(Number(process.env.PORT || 4173), lan ? '0.0.0.0' : '127.0.0.1', () => {
  const port = server.address().port;
  console.log('Local: http://127.0.0.1:' + port);
  if (lan) for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === 'IPv4' && !i.internal) console.log('Celular (mesmo Wi-Fi): http://' + i.address + ':' + port);
});
