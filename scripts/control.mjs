import { readFile, rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
// 프로세스 조회 명령 대신 저장한 실행 ID와 HTTP 응답을 대조합니다.
const action = process.argv[2];
if (!['status', 'stop'].includes(action)) throw new Error('status 또는 stop이 필요합니다.');
async function clear() { await rm('.runtime/app.pid', { force: true });await rm('.runtime/app.json', { force: true }); }
try {
  let meta;
  try { meta = JSON.parse(await readFile('.runtime/app.json', 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') { console.log('STOPPED: 관리 정보 없음');process.exit(0); }throw error; }
  if (!Number.isInteger(meta.pid) || meta.pid < 1 || !Number.isInteger(meta.port) || meta.port < 1 || meta.port > 65535 || typeof meta.run_id !== 'string') throw new Error('실행 관리 정보가 올바르지 않습니다.');
  try { process.kill(meta.pid, 0); }
  catch (error) { if (error.code === 'ESRCH') { await clear();console.log('STOPPED');process.exit(0); }throw error; }
  let version;
  try { version = await (await fetch(`http://127.0.0.1:${meta.port}/version`, { signal: AbortSignal.timeout(1500) })).json(); }
  catch { console.log(`PID ${meta.pid}는 있으나 앱 응답을 확인할 수 없습니다. 로그와 포트를 확인하세요.`);process.exitCode = action === 'stop' ? 1 : 0; }
  if (version) {
    if (version.run_id !== meta.run_id) throw new Error('현재 프로젝트의 실행 ID와 다릅니다. 다른 프로세스를 종료하지 않습니다.');
    if (action === 'status') console.log(`RUNNING pid=${meta.pid} port=${meta.port} sha=${version.sha}`);
    else {
      process.kill(meta.pid, 'SIGTERM');
      let stopped = false;
      for (let i = 0; i < 30; i++) {
        await delay(100);
        try { await fetch(`http://127.0.0.1:${meta.port}/version`, { signal: AbortSignal.timeout(500) }); }
        catch { stopped = true;break; }
      }
      if (!stopped) throw new Error('종료 후에도 응답이 남아 있습니다. 로그와 포트를 확인하세요.');
      await clear();console.log('STOPPED');
    }
  }
} catch (error) { console.error(error.message);process.exitCode = 1; }
