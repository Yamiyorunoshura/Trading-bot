#!/bin/bash
# 交易機器人環境設置腳本

set -e

echo "🚀 開始設置量化交易機器人開發環境..."

# 檢查操作系統
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✅ 檢測到 macOS 系統"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "✅ 檢測到 Linux 系統"
else
    echo "❌ 不支援的操作系統: $OSTYPE"
    exit 1
fi

# 安裝 Rust
if ! command -v cargo &> /dev/null; then
    echo "📦 安裝 Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
    echo "✅ Rust 安裝完成"
else
    echo "✅ Rust 已安裝"
fi

# 檢查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 請先安裝 Python 3.9+"
    exit 1
else
    echo "✅ Python 已安裝"
fi

# 安裝 Python 依賴
if [ -f "requirements.txt" ]; then
    echo "📦 安裝 Python 依賴..."
    pip install -r requirements.txt
    echo "✅ Python 依賴安裝完成"
fi

# 創建環境變數文件
if [ ! -f ".env" ]; then
    echo "📝 創建環境變數文件..."
    cp .env.example .env
    echo "✅ 請編輯 .env 文件設置API密鑰"
fi

# 創建日誌目錄
mkdir -p logs
echo "✅ 日誌目錄已創建"

# 編譯 Rust 項目
echo "🔨 編譯 Rust 項目..."
cargo build
echo "✅ 編譯完成"

# 驗證配置
echo "🔍 驗證配置..."
cargo run -- validate-config || echo "⚠️ 配置驗證失敗，請檢查配置文件"

echo ""
echo "🎉 環境設置完成！"
echo ""
echo "下一步："
echo "1. 編輯 .env 文件，設置API密鑰"
echo "2. 編輯 config/config.toml 調整配置"
echo "3. 運行: cargo run -- start --demo"
echo ""
