# 建議命令列表

## 環境設置
```bash
# 設置開發環境
./scripts/setup.sh

# 安裝Rust依賴
cargo build

# 安裝Python依賴
pip install -r requirements.txt

# 複製配置文件
cp .env.example .env
```

## 開發命令
```bash
# 驗證配置
cargo run -- validate-config

# 啟動演示模式
cargo run -- start --demo

# 啟動實盤模式
cargo run -- start

# 查看系統狀態
cargo run -- status

# 停止系統
cargo run -- stop

# 運行回測
cargo run -- backtest --strategy SMA_Cross --from 2024-01-01 --to 2024-12-01 --capital 10000
```

## 代碼質量檢查
```bash
# Rust代碼格式化
cargo fmt

# Rust代碼檢查
cargo clippy

# Rust測試
cargo test

# Python代碼格式化
black python/

# Python代碼檢查
flake8 python/

# Python測試
pytest python/tests/

# 項目驗證
python scripts/verify.py
```

## 構建和發布
```bash
# 構建發布版本
cargo build --release

# 運行基準測試
cargo bench

# 生成文檔
cargo doc --open
```

## 系統管理
```bash
# 查看日誌
tail -f logs/trading-bot.log

# 查看錯誤日誌
tail -f logs/error.log

# 查看交易日誌
tail -f logs/trades.log

# 清理構建緩存
cargo clean
```

## macOS 特定命令
```bash
# 使用Homebrew安裝依賴
brew install postgresql redis

# 啟動服務
brew services start postgresql
brew services start redis

# 查看系統信息
system_profiler SPHardwareDataType

# 查看進程
ps aux | grep trading-bot
```

## Git 工作流程
```bash
# 查看狀態
git status

# 提交代碼
git add .
git commit -m "描述"

# 推送代碼
git push origin main

# 查看分支
git branch -a

# 創建功能分支
git checkout -b feature/新功能
```