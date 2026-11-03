// 사용법: node scripts/smoke.mjs URL 전체_예상_SHA
// 이 검사는 기본 응답·health·버전만 확인합니다. 모든 기능·성능·보안을 보증하지 않습니다.
export async function smoke(base, expectedSha) {
  if (!/^[a-f0-9]{40}$/i.test(expectedSha ?? '')) throw new Error('예상 SHA는 Git의 전체 40자리 값을 입력하세요.');
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('http 또는 https URL이 필요합니다.');
  async function get(path) {
    const response = await fetch(new URL(path, url), { signal: AbortSignal.timeout(4000) });
    if (response.status !== 200) throw new Error(`${path}: HTTP ${response.status}`);
    return response;
  }
  const page = await (await get('/')).text();
  if (!/<h1(?:\s[^>]*)?>[\s\S]*?<\/h1>/i.test(page)) throw new Error('첫 화면에서 h1을 확인할 수 없습니다.');
  const health = await (await get('/health')).json();
  if (health.status !== 'ok') throw new Error('/health가 ok가 아닙니다.');
  const version = await (await get('/version')).json();
  if (version.sha !== expectedSha) throw new Error(`버전 불일치: expected=${expectedSha}, actual=${version.sha}`);
  return { result: 'PASS', url: url.origin, sha: version.sha, checks: ['page-200-h1', 'health-ok', 'expected-sha'] };
}

if (process.argv[1]?.endsWith('/smoke.mjs') || process.argv[1]?.endsWith('\\smoke.mjs')) {
  try { console.log(JSON.stringify(await smoke(process.argv[2], process.argv[3]))); }
  catch (error) { console.error('SMOKE FAIL: ' + error.message); process.exitCode = 1; }
}
