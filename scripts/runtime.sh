#!/usr/bin/env bash
# 다른 스크립트가 source하여 Node.js 24의 실제 명령 이름을 선택합니다.
LAB_NODE=''
if [[ -n "${NODE_BIN:-}" ]]; then
  candidates=("$NODE_BIN")
else
  candidates=(node node-24 nodejs24)
fi
for candidate in "${candidates[@]}"; do
  if command -v "$candidate" >/dev/null 2>&1; then
    major=$("$candidate" -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)
    if [[ "$major" == 24 ]]; then LAB_NODE=$(command -v "$candidate");break;fi
  fi
done
if [[ -z "$LAB_NODE" ]]; then
  echo 'Node.js 24를 찾지 못했습니다. node / node-24 / nodejs24 설치 상태를 확인하세요.' >&2
  return 1
fi
export LAB_NODE
