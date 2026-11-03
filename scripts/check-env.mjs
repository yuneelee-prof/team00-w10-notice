// 읽기 중심의 사전 점검. 앱을 시작하거나 Git 파일·AWS 설정을 바꾸지 않습니다.
import { existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import net from 'node:net';
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
let repo = false, sha, port = 3000, bad = 0;
const pass = (name, message) => console.log(`[PASS] ${name}: ${message}`);
const fail = (name, message) => {bad++;console.log(`[FAIL] ${name}: ${message}`);};
for (let i=0;i<args.length;i++) {
  if (args[i] === '--repo') repo = true;
  else if (args[i] === '--sha' && args[i+1]) {sha=args[++i];repo=true;}
  else if (args[i] === '--port' && args[i+1]) port=Number(args[++i]);
  else {fail('ARGS','사용법: check-env.mjs [--repo] [--sha 전체40자리] [--port 3000]');break;}
}
if (!Number.isInteger(port) || port<1 || port>65535) fail('PORT','포트는 1~65535의 정수입니다.');
if (sha && !/^[a-f0-9]{40}$/i.test(sha)) fail('SHA','예상 SHA를 실제 전체 40자리 값으로 바꾸세요.');
const major=Number(process.versions.node.split('.')[0]);
major===24 ? pass('NODE',process.version) : fail('NODE',`${process.version}. 이 실습은 Node 24가 필요합니다.`);
const git=(argv)=>spawnSync('git',argv,{cwd:root,encoding:'utf8',timeout:10000,windowsHide:true});
const version=git(['--version']);
const gitOK=version.status===0;
gitOK ? pass('GIT',version.stdout.trim()) : fail('GIT','Git 실행 실패. 설치·PATH를 확인하고 터미널을 다시 여세요.');
const required=['index.html','server.mjs','tests/app.test.mjs','.github/workflows/week10-check.yml','scripts/start.sh','scripts/stop.sh','scripts/status.sh','scripts/node.sh','scripts/runtime.sh','scripts/preflight.sh','scripts/smoke.mjs','scripts/control.mjs','scripts/check-env.mjs','scripts/check-env.sh','.gitignore','.gitattributes'];
const missing=required.filter(f=>!existsSync(new URL('../'+f,import.meta.url)));
missing.length ? fail('FILES','빠진 파일: '+missing.join(', ')) : pass('FILES','필수 앱·Workflow·스크립트 파일이 있습니다.');
if (repo && gitOK) {
  const top=git(['rev-parse','--show-toplevel']);
  const sameRoot=top.status===0 && realpathSync(top.stdout.trim())===realpathSync(root);
  if (!sameRoot) fail('REPO','starter 파일이 팀 저장소 최상위에 있는지 확인하세요. 이 폴더의 Git 저장소가 필요합니다.');
  else {
    const head=git(['rev-parse','--verify','HEAD']);
    if (head.status!==0) fail('HEAD','아직 Commit이 없습니다. 저장소의 기록을 먼저 준비하세요.');
    else {
      const current=head.stdout.trim();pass('HEAD',current);
      const versioned=git(['ls-files','--error-unmatch','--',...required]);
      versioned.status===0 ? pass('VERSIONED','필수 파일이 Git 추적 대상입니다.') : fail('VERSIONED','필수 파일 중 Git에 반영되지 않은 파일이 있습니다. 전체 패키지를 Commit·Push·Merge한 새 버전을 사용하세요.');
      const diff=git(['diff','--quiet','HEAD','--']);
      diff.status===0 ? pass('TRACKED','추적 파일의 미커밋 변경이 없습니다.') : fail('TRACKED','미커밋 변경이 있습니다. git status --short로 확인하세요.');
      if (sha) current.toLowerCase()===sha.toLowerCase() ? pass('SHA','현재 HEAD와 예상 SHA가 같습니다.') : fail('SHA','현재 HEAD와 예상 SHA가 다릅니다. 검사한 main Run과 checkout을 확인하세요.');
    }
    const unknown=git(['ls-files','--others','--exclude-standard']);
    if (unknown.status===0 && unknown.stdout.trim()) console.log('[WARN] UNTRACKED: 미추적 파일이 있습니다. git status --short로 파일 반영·제외 여부를 확인하세요.');
  }
}
if (Number.isInteger(port) && port>=1 && port<=65535) {
  const available=await new Promise(resolve=>{
    const server=net.createServer();
    server.once('error',e=>resolve({ok:false,code:e.code}));
    server.listen({host:'0.0.0.0',port,exclusive:true},()=>server.close(()=>resolve({ok:true})));
  });
  available.ok ? pass('PORT_LOCAL',`${port}번 포트에 잠시 바인딩 후 닫았습니다. 현재 로컬 사용 가능.`) : fail('PORT_LOCAL',`${port}번 포트 사용 불가 (${available.code}). 기존 자기 앱 또는 포트 사용을 확인하세요.`);
}
console.log('[MANUAL] GitHub 로그인·Push/PR 권한·Actions 실행·AWS 접속·보안 그룹·외부 응답은 별도 확인합니다.');
console.log(bad ? `LOCAL CHECK FAIL: ${bad}개 항목을 보완한 뒤 다시 실행하세요.` : 'LOCAL CHECK PASS: 도구·파일·로컬 포트 범위를 통과했습니다. 전체 배포 성공 판정은 아닙니다.');
process.exitCode=bad?1:0;
