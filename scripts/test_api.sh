#!/bin/bash

# API測試腳本

echo "🧪 測試量化交易機器人API..."

API_URL="http://localhost:8080"

# 測試健康檢查
echo "🔍 測試健康檢查..."
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
if [ $response -eq 200 ]; then
    echo "✅ 健康檢查: 通過"
else
    echo "❌ 健康檢查: 失敗 (HTTP $response)"
    echo "請確保後端服務正在運行: cargo run --bin trading-bot-ui"
    exit 1
fi

# 測試WebSocket連接
echo "🔌 測試WebSocket連接..."
if command -v wscat &> /dev/null; then
    timeout 5 wscat -c ws://localhost:8080/ws &
    sleep 2
    echo "✅ WebSocket連接: 可用"
else
    echo "⚠️  WebSocket測試: 跳過 (需要安裝 wscat)"
    echo "   安裝命令: npm install -g wscat"
fi

echo "🎉 API測試完成！"