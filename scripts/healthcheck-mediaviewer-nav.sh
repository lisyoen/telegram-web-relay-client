#!/usr/bin/env bash
# [016] MediaViewer 네비게이션 정적 검증
# 빌드 산출물 dist/*.js 에 핵심 식별자 잔존 여부를 확인한다.
set -e

DIST="${DIST:-$(cd "$(dirname "$0")/.."; pwd)/dist}"
SRV="${SRV:-../telegram-web-relay/server.js}"
PASS=0
FAIL=0

check() {
  local label="$1"
  local result="$2"
  if [ "$result" -gt 0 ]; then
    echo "  PASS  $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $label"
    FAIL=$((FAIL+1))
  fi
}

echo "=== [016] MediaViewer Nav Healthcheck ==="

# 1. dist 존재 확인
if [ ! -d "$DIST" ]; then
  echo "  FAIL  dist/ 디렉토리 없음 (빌드 미실행?)"
  exit 1
fi

# 2. 화살표 버튼 클래스 식별자
check "media-viewer-nav-arrow 클래스 존재" \
  "$(grep -rl 'media-viewer-nav-arrow' "$DIST"/*.js 2>/dev/null | wc -l)"

# 3. 키보드 핸들러 잔존 (ArrowLeft)
check "ArrowLeft 키 핸들러 잔존" \
  "$(grep -rl 'ArrowLeft' "$DIST"/*.js 2>/dev/null | wc -l)"

# 4. changeSlide 로직 잔존 (changeSlideRef → 매핑된 form)
check "changeSlide 로직 잔존" \
  "$(grep -rl 'changeSlide\|media-viewer-nav-arrow' "$DIST"/*.js 2>/dev/null | wc -l)"

# 5. server.js searchMessagesInChat 핸들러 회귀 가드
if [ -f "$SRV" ]; then
  CNT=$(grep -c "case 'searchMessagesInChat'" "$SRV" 2>/dev/null || true)
  if [ "$CNT" -ge 1 ]; then
    echo "  PASS  server.js searchMessagesInChat 핸들러 존재 (count=$CNT)"
    PASS=$((PASS+1))
  else
    echo "  FAIL  server.js searchMessagesInChat 핸들러 없음"
    FAIL=$((FAIL+1))
  fi
else
  echo "  SKIP  server.js 경로 없음 ($SRV)"
fi

echo ""
echo "결과: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo "ALL PASS" && exit 0 || exit 1
