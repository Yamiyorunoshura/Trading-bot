#!/bin/bash

# Trading Bot 環境激活腳本

echo "🚀 激活 Trading Bot 開發環境..."

# 激活 Python 虛擬環境
source trading_bot_env/bin/activate

# 激活 Rust 環境
source $HOME/.cargo/env

# 設置環境變量
export RUST_LOG=trading_bot=debug

echo "✅ 環境激活成功！"
echo ""
echo "📋 可用命令："
echo "  - cargo run -- validate-config    驗證配置"
echo "  - cargo run -- start --demo       啟動演示模式"
echo "  - cargo run -- status             查看狀態"
echo "  - python scripts/verify.py        驗證項目"
echo "  - cargo build                      構建項目"
echo "  - cargo test                       運行測試"
echo ""
echo "🔧 Python 策略測試："
echo "  - cd python && python -c \"from strategies.sma_crossover import SMACrossoverStrategy; print('策略導入成功')\""
echo ""
echo "📖 更多信息請查看 README.md"