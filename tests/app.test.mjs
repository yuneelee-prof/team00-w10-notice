import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNoticeServer } from '../server.mjs';
import { smoke } from '../scripts/smoke.mjs';
const SHA = 'a'.repeat(40);

test('HTML에 title과 h1이 있다', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<title>[\s\S]+?<\/title>/i);
  assert.match(html, /<h1(?:\s[^>]*)?>[\s\S]+?<\/h1>/i);
});

test('기본 응답과 버전 검사 및 실패 판정', async t => {
  const server = await createNoticeServer({ sha: SHA, environment: 'test' });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await smoke(url, SHA)).result, 'PASS');
  await assert.rejects(() => smoke(url, 'b'.repeat(40)), /버전 불일치/);
  assert.equal((await fetch(url + '/missing')).status, 404);
});

test('파일 수정만으로 실행 앱이 바뀌지 않으며 재시작 후 반영된다', async t => {
  const root = await mkdtemp(join(tmpdir(), 'notice-w10-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'index.html'), '<title>A</title><h1>A</h1>');
  let server = await createNoticeServer({ root, sha: SHA });
  const servers = [];
  t.after(async () => { for (const s of servers) if (s.listening) await new Promise(resolve => { s.close(resolve); s.closeAllConnections(); }); });
  servers.push(server);server.listen(0, '127.0.0.1');await once(server, 'listening');
  let url = `http://127.0.0.1:${server.address().port}`;
  await writeFile(join(root, 'index.html'), '<title>B</title><h1>B</h1>');
  assert.match(await (await fetch(url)).text(), /<h1>A<\/h1>/);
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  server = await createNoticeServer({ root, sha: 'b'.repeat(40) });servers.push(server);
  server.listen(0, '127.0.0.1');await once(server, 'listening');url = `http://127.0.0.1:${server.address().port}`;
  assert.match(await (await fetch(url)).text(), /<h1>B<\/h1>/);
});
