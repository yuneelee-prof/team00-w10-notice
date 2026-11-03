#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/runtime.sh
command -v git >/dev/null || { echo 'Git이 필요합니다.';exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo 'Git 저장소에서 실행하세요.';exit 1; }
for file in index.html server.mjs scripts/smoke.mjs; do
  [[ -f "$file" ]] || { echo "파일 없음: $file";exit 1; }
done
git diff --quiet HEAD -- || { echo '추적 파일의 미커밋 변경이 있습니다.';exit 1; }
"$LAB_NODE" --version
git --version
printf 'HEAD='
git rev-parse HEAD
echo 'PREFLIGHT PASS: 실행 도구·파일·Git 상태 확인. 포트와 외부 접속은 실행 후 검사합니다.'
