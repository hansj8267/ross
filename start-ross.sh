#!/bin/bash
echo "🤖 Ross 시작중..."

# 기존 프로세스 완전 종료
pkill -9 -f "ross-bridge" 2>/dev/null
lsof -ti:9002 | xargs kill -9 2>/dev/null
sleep 2

# 브리지를 새 터미널 창에서 실행
osascript -e 'tell application "Terminal"
    activate
    do script "cd ~/Desktop/ross && node ross-bridge.mjs"
end tell'

sleep 2

# UI 실행
cd ~/Desktop/ross
npm run tauri dev
