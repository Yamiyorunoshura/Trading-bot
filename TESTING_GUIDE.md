# 量化交易機器人1.0實測指南

## 🚀 快速開始

### 1. 環境準備

**系統要求：**
- macOS 10.15+, Windows 10+, 或 Linux (Ubuntu 20.04+)
- Rust 1.70+
- Node.js 18+
- Python 3.9+
- PostgreSQL 13+ (可選)
- Redis 6+ (可選)

**安裝 Rust:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**安裝 Node.js:**
```bash
# macOS
brew install node

# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**安裝 Tauri CLI:**
```bash
cargo install tauri-cli
```

### 2. 項目依賴安裝

**安裝 Rust 依賴:**
```bash
cargo build
```

**安裝前端依賴:**
```bash
cd frontend
npm install
cd ..
```

**安裝 Python 依賴:**
```bash
# 創建虛擬環境（推薦）
python -m venv trading_bot_env
source trading_bot_env/bin/activate  # Linux/macOS
# 或 trading_bot_env\Scripts\activate  # Windows

# 安裝依賴
pip install -r requirements.txt
```

### 3. 配置設置

**創建基本配置文件 `config/config.toml`:**
```toml
[application]
name = "trading-bot"
version = "1.0.0"
debug = true

[database]
# PostgreSQL配置 (可選 - 如果沒有會使用SQLite)
postgres_url = "postgresql://postgres:password@localhost:5432/trading_bot"

# Redis配置 (可選)
redis_url = "redis://localhost:6379"

[trading]
# 演示模式，不會進行實際交易
demo_mode = true
initial_balance = 10000.0

[binance]
# 測試用的API密鑰 (Binance Testnet)
api_key = "your_binance_testnet_api_key"
api_secret = "your_binance_testnet_api_secret"
testnet = true

[discord]
# Discord通知 (可選)
webhook_url = "https://discord.com/api/webhooks/your_webhook_url"
enabled = false

[webserver]
host = "127.0.0.1"
port = 8080

[logging]
level = "info"
```

**創建環境變量文件 `.env`:**
```bash
# 數據庫
DATABASE_URL=sqlite:./trading_bot.db
REDIS_URL=redis://localhost:6379

# API密鑰 (測試用)
BINANCE_API_KEY=your_testnet_api_key
BINANCE_API_SECRET=your_testnet_secret

# 其他配置
LOG_LEVEL=info
RUST_LOG=trading_bot=debug
```

### 4. 運行測試

## 🧪 運行方式

### 方式1：開發模式運行

**1. 啟動後端服務:**
```bash
# 終端1 - 運行核心交易機器人
cargo run --bin trading-bot start --config config/config.toml --demo

# 終端2 - 運行Tauri UI應用
cargo run --bin trading-bot-ui
```

**2. 啟動前端開發服務器:**
```bash
# 終端3 - 前端開發服務器
cd frontend
npm run dev
```

### 方式2：Tauri 應用模式

**構建並運行桌面應用:**
```bash
# 開發模式
cd frontend
npm run tauri dev

# 或者構建生產版本
npm run tauri build
```

### 方式3：僅測試後端API

**運行後端服務:**
```bash
cargo run --bin trading-bot-ui
```

然後訪問 `http://localhost:8080/health` 確認服務運行正常。

## 📊 功能測試

### 1. 基本功能測試

**啟動應用後，您可以測試以下功能：**

#### 儀表板測試
- ✅ 查看系統狀態指示器
- ✅ 觀察模擬市場數據更新
- ✅ 查看盈利曲線圖表
- ✅ 測試啟動/停止按鈕

#### 策略管理測試
- ✅ 查看策略列表
- ✅ 創建新策略
- ✅ 編輯策略參數
- ✅ 啟動/停止策略（演示模式）

#### 盈利分析測試
- ✅ 查看盈利趨勢圖表
- ✅ 分析不同時間段數據
- ✅ 檢查風險指標
- ✅ 查看交易記錄

#### 回測分析測試
- ✅ 配置回測參數
- ✅ 運行回測（使用模擬數據）
- ✅ 查看回測結果
- ✅ 分析資金曲線

#### 風險管理測試
- ✅ 設置風險參數
- ✅ 查看風險警報
- ✅ 測試風險限制
- ✅ 監控風險指標

#### 系統設置測試
- ✅ 配置API設置
- ✅ 設置通知選項
- ✅ 管理數據庫連接
- ✅ 查看系統日誌

### 2. API端點測試

**使用curl測試API:**
```bash
# 健康檢查
curl http://localhost:8080/health

# 測試WebSocket連接
wscat -c ws://localhost:8080/ws
```

## 🔧 常見問題解決

### 問題1：Rust編譯錯誤
```bash
# 更新Rust工具鏈
rustup update
cargo clean
cargo build
```

### 問題2：前端依賴問題
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 問題3：Python依賴問題
```bash
# 重新安裝Python依賴
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### 問題4：Tauri構建問題
```bash
# 安裝系統依賴
# macOS
brew install webkit2gtk

# Ubuntu
sudo apt-get install webkit2gtk-4.0-dev
```

### 問題5：數據庫連接問題
如果沒有PostgreSQL，程序會自動使用SQLite：
```bash
# 檢查SQLite文件
ls -la trading_bot.db
```

## 📱 測試場景

### 場景1：完整流程測試
1. 啟動應用
2. 查看儀表板狀態
3. 創建一個SMA交叉策略
4. 運行回測分析
5. 檢查盈利分析結果
6. 設置風險管理參數

### 場景2：實時數據測試
1. 啟動應用
2. 觀察WebSocket實時數據更新
3. 查看市場數據變化
4. 檢查圖表動態更新

### 場景3：API集成測試
1. 配置Binance Testnet API
2. 測試市場數據獲取
3. 運行模擬交易
4. 檢查交易記錄

## 🎯 性能測試

### 內存使用測試
```bash
# 監控內存使用
top -p $(pgrep trading-bot)
```

### 並發測試
```bash
# 使用 wrk 進行壓力測試
wrk -t12 -c400 -d30s http://localhost:8080/health
```

## 📸 期望結果

**成功運行後，您應該看到：**
- 🖥️ 桌面應用視窗打開
- 📊 儀表板顯示系統狀態和圖表
- 🔄 實時數據更新
- 📈 策略管理功能正常
- 🎨 專業的暗色主題界面
- ⚡ 響應式操作體驗

## 🆘 獲取幫助

**如果遇到問題：**
1. 檢查日誌文件：`logs/` 目錄
2. 查看控制台輸出錯誤信息
3. 確認所有依賴已正確安裝
4. 檢查配置文件格式
5. 聯繫開發團隊

**調試模式：**
```bash
# 啟用詳細日誌
RUST_LOG=debug cargo run --bin trading-bot-ui
```

## 🎉 測試成功標準

✅ 應用成功啟動
✅ 所有7個功能模組正常顯示
✅ 實時數據正常更新
✅ 圖表正常渲染
✅ 策略操作響應正常
✅ 系統配置可以保存
✅ 桌面應用打包成功

恭喜！您已經成功運行了量化交易機器人1.0版本！🚀