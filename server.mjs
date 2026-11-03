import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export async function createNoticeServer({ root = fileURLToPath(new URL('.', import.meta.url)), sha = process.env.APP_SHA ?? 'local-unversioned', environment = process.env.APP_ENV ?? 'local' } = {}) {
  // 시작할 때 HTML과 버전을 한 번 읽습니다. 파일 변경만으로 실행 중인 앱이 바뀌지 않음을 관찰합니다.
  const html = await readFile(resolve(root, 'index.html'));
  const version = { sha, release_id: sha.slice(0, 12), environment, run_id: process.env.APP_RUN_ID ?? 'direct-run' };
  return http.createServer((req, res) => {
    const started = performance.now();
    const path = new URL(req.url, 'http://localhost').pathname;
    res.on('finish', () => console.log(JSON.stringify({ time: new Date().toISOString(), path, status: res.statusCode, duration_ms: Math.round(performance.now() - started), sha })));
    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
    } else if (path === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ status: 'ok', environment, sha }));
    } else if (path === '/version') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(version));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1..65535');
  const server = await createNoticeServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, host, () => console.log(JSON.stringify({ event: 'started', host, port, sha: process.env.APP_SHA ?? 'local-unversioned' })));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
