#!/bin/bash

# 量化交易機器人快速啟動腳本

set -e

echo "🚀 啟動量化交易機器人1.0..."

# 檢查必要工具
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ 錯誤: $1 未安裝"
        exit 1
    fi
}

echo "🔍 檢查依賴..."
check_command cargo
check_command node
check_command npm

# 創建必要目錄
mkdir -p logs
mkdir -p data

# 複製環境變量文件
if [ ! -f .env ]; then
    echo "📁 創建環境變量文件..."
    cp .env.example .env
    echo "⚠️  請編輯 .env 文件設置您的API密鑰"
fi

# 安裝依賴
echo "📦 安裝Rust依賴..."
cargo build --release

echo "📦 安裝前端依賴..."
cd frontend
npm install
cd ..

# 啟動服務
echo "🖥️  啟動Tauri應用..."
cd frontend
npm run tauri dev &

echo "✅ 應用正在啟動中..."
echo "📊 儀表板將在幾秒後打開"
echo "🔗 如果桌面應用未打開，請手動訪問: http://localhost:5173"
echo ""
echo "💡 提示:"
echo "   - 首次啟動可能需要較長時間進行編譯"
echo "   - 請確保已配置 .env 文件中的API密鑰"
echo "   - 默認運行在演示模式，不會進行實際交易"
echo ""
echo "🛑 要停止服務，請按 Ctrl+C"

# 等待用戶中斷
wait