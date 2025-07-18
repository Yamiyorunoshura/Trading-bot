#!/bin/bash

# 診斷腳本 - 收集系統信息用於故障排除

echo "=========================================="
echo "量化交易機器人 - 診斷報告"
echo "生成時間: $(date)"
echo "=========================================="

echo ""
echo "🖥️  系統信息"
echo "操作系統: $(uname -s)"
echo "架構: $(uname -m)"
echo "內核版本: $(uname -r)"

echo ""
echo "🔧 開發環境"
echo "Rust 版本:"
if command -v rustc &> /dev/null; then
    rustc --version
else
    echo "  ❌ Rust 未安裝"
fi

echo "Cargo 版本:"
if command -v cargo &> /dev/null; then
    cargo --version
else
    echo "  ❌ Cargo 未安裝"
fi

echo "Node.js 版本:"
if command -v node &> /dev/null; then
    node --version
else
    echo "  ❌ Node.js 未安裝"
fi

echo "npm 版本:"
if command -v npm &> /dev/null; then
    npm --version
else
    echo "  ❌ npm 未安裝"
fi

echo "Python 版本:"
if command -v python &> /dev/null; then
    python --version
else
    echo "  ❌ Python 未安裝"
fi

echo "Tauri CLI 版本:"
if command -v tauri &> /dev/null; then
    tauri --version
else
    echo "  ❌ Tauri CLI 未安裝"
fi

echo ""
echo "📁 項目文件"
echo "當前目錄: $(pwd)"
echo "Cargo.toml 存在: $(test -f Cargo.toml && echo "✅" || echo "❌")"
echo "package.json 存在: $(test -f frontend/package.json && echo "✅" || echo "❌")"
echo "config.toml 存在: $(test -f config/config.toml && echo "✅" || echo "❌")"
echo ".env 存在: $(test -f .env && echo "✅" || echo "❌")"

echo ""
echo "🔒 權限檢查"
echo "當前用戶: $(whoami)"
echo "項目目錄權限: $(ls -ld . | awk '{print $1, $3, $4}')"

echo ""
echo "🌐 網絡檢查"
echo "端口 8080 使用情況:"
if command -v lsof &> /dev/null; then
    lsof -i :8080 || echo "  端口 8080 未被使用"
else
    netstat -an | grep :8080 || echo "  端口 8080 未被使用"
fi

echo ""
echo "💾 磁盤空間"
df -h . | head -2

echo ""
echo "🧠 內存信息"
if command -v free &> /dev/null; then
    free -h
else
    echo "內存檢查不可用"
fi

echo ""
echo "🔍 進程檢查"
echo "相關進程:"
ps aux | grep -E "(trading-bot|node|npm|cargo)" | grep -v grep || echo "  沒有找到相關進程"

echo ""
echo "📋 環境變量"
echo "PATH: $PATH"
echo "RUST_LOG: ${RUST_LOG:-未設置}"
echo "NODE_ENV: ${NODE_ENV:-未設置}"

echo ""
echo "🗂️  日誌文件"
if [ -d "logs" ]; then
    echo "日誌目錄內容:"
    ls -la logs/
else
    echo "  日誌目錄不存在"
fi

echo ""
echo "🔧 編譯狀態"
if [ -d "target" ]; then
    echo "Rust 編譯目錄存在: ✅"
    echo "Debug 模式: $(test -d target/debug && echo "✅" || echo "❌")"
    echo "Release 模式: $(test -d target/release && echo "✅" || echo "❌")"
else
    echo "Rust 編譯目錄不存在: ❌"
fi

if [ -d "frontend/node_modules" ]; then
    echo "前端依賴已安裝: ✅"
else
    echo "前端依賴未安裝: ❌"
fi

echo ""
echo "🧪 快速測試"
echo "配置文件語法檢查:"
if [ -f "config/config.toml" ]; then
    if command -v python &> /dev/null; then
        python -c "import toml; toml.load('config/config.toml')" 2>/dev/null && echo "  ✅ 配置文件語法正確" || echo "  ❌ 配置文件語法錯誤"
    else
        echo "  ⚠️  無法檢查（需要 Python）"
    fi
else
    echo "  ❌ 配置文件不存在"
fi

echo ""
echo "🌍 網絡連接測試"
echo "本地迴路測試:"
curl -s --connect-timeout 5 http://localhost:8080/health >/dev/null 2>&1 && echo "  ✅ 本地服務可訪問" || echo "  ❌ 本地服務不可訪問"

echo ""
echo "=========================================="
echo "診斷報告完成"
echo "=========================================="