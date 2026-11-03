#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/runtime.sh
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Git 저장소 폴더에서 실행하세요.";exit 1; }
mkdir -p .runtime
if [[ -f .runtime/app.pid ]]; then
  previous_pid=$(cat .runtime/app.pid)
  if [[ "$previous_pid" =~ ^[0-9]+$ ]] && kill -0 "$previous_pid" 2>/dev/null; then
    echo "앱 또는 확인이 필요한 PID가 남아 있습니다. status.sh와 stop.sh를 먼저 실행하세요.";exit 1
  fi
  rm -f .runtime/app.pid
fi
if ! git diff --quiet HEAD --; then echo "커밋하지 않은 추적 파일 변경이 있습니다. 선택한 커밋을 깨끗하게 준비하세요.";exit 1;fi
app_sha=$(git rev-parse HEAD)
[[ "$app_sha" =~ ^[a-f0-9]{40}$ ]] || { echo "Git 전체 SHA가 필요합니다.";exit 1; }
export APP_SHA="$app_sha" APP_ENV="${APP_ENV:-dev}" PORT="${PORT:-3000}" HOST="${HOST:-0.0.0.0}"
export APP_RUN_ID
APP_RUN_ID=$("$LAB_NODE" -e 'console.log(require("node:crypto").randomUUID())')
nohup "$LAB_NODE" server.mjs >> .runtime/app.log 2>&1 &
app_pid=$!
echo "$app_pid" > .runtime/app.pid
"$LAB_NODE" -e 'require("node:fs").writeFileSync(".runtime/app.json",JSON.stringify({pid:Number(process.argv[1]),port:Number(process.argv[2]),run_id:process.env.APP_RUN_ID}))' "$app_pid" "$PORT"
for attempt in {1..30}; do
  if ! kill -0 "$app_pid" 2>/dev/null; then echo "앱 시작 실패. .runtime/app.log를 확인하세요.";rm -f .runtime/app.pid;exit 1;fi
  if "$LAB_NODE" scripts/smoke.mjs "http://127.0.0.1:$PORT" "$app_sha" > .runtime/last-smoke.json 2>/dev/null; then
    echo "STARTED pid=$app_pid port=$PORT sha=$app_sha";cat .runtime/last-smoke.json;exit 0
  fi
  sleep 0.2
done
echo "앱이 예상대로 응답하지 않습니다. 로그와 포트를 확인하고 stop.sh로 정리하세요.";exit 1
