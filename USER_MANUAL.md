# 📚 量化交易機器人1.0 - 使用手冊

## 🎯 目錄
- [快速開始](#快速開始)
- [功能介紹](#功能介紹)
- [使用教程](#使用教程)
- [高級配置](#高級配置)
- [故障排除](#故障排除)
- [常見問題](#常見問題)

## 🚀 快速開始

### 一鍵啟動
```bash
# macOS/Linux
./scripts/start_dev.sh

# Windows
scripts\start_dev.bat
```

### 手動啟動
```bash
# 1. 設置環境
cp .env.example .env

# 2. 安裝依賴
cargo build
cd frontend && npm install && cd ..

# 3. 啟動應用
cd frontend && npm run tauri dev
```

## 📊 功能介紹

### 1. 儀表板 (Dashboard)
**主要功能：**
- 📈 即時市場數據監控
- 💰 資產和盈虧統計
- 🔄 系統健康狀態
- 📊 盈利趨勢圖表

**使用方法：**
1. 啟動應用後自動顯示
2. 點擊"刷新數據"更新信息
3. 使用"啟動交易"/"停止交易"控制系統

### 2. 策略管理 (Strategy Management)
**主要功能：**
- 🎯 創建和編輯交易策略
- ⚡ 策略啟動/停止控制
- 📊 策略績效監控
- 🔧 參數調整和優化

**使用方法：**
1. 點擊"新增策略"創建策略
2. 選擇策略類型 (如：SMA交叉策略)
3. 設置交易對和參數
4. 點擊"啟動"開始運行

### 3. 盈利分析 (Profit Analysis)
**主要功能：**
- 📈 多維度盈利統計
- 📊 時間段分析
- 💹 風險調整收益
- 📋 詳細交易記錄

**使用方法：**
1. 選擇時間範圍（今日/7天/30天/自定義）
2. 篩選特定策略
3. 查看盈利趨勢和分析圖表
4. 導出報告

### 4. 回測分析 (Backtest Analysis)
**主要功能：**
- 🔬 策略歷史性能測試
- 📊 資金曲線分析
- 📈 績效指標計算
- 📋 詳細回測報告

**使用方法：**
1. 選擇要回測的策略
2. 設置回測時間範圍
3. 配置初始資金和手續費
4. 點擊"開始回測"運行測試

### 5. 風險管理 (Risk Management)
**主要功能：**
- ⚠️ 風險參數設置
- 📊 風險指標監控
- 🚨 風險警報系統
- 🔒 止損止盈控制

**使用方法：**
1. 設置最大回撤限制
2. 配置止損止盈比例
3. 設置倉位限制
4. 保存風險控制設置

### 6. 系統設置 (System Settings)
**主要功能：**
- 🔑 API密鑰管理
- 📧 通知設置
- 🗄️ 數據庫配置
- 📋 系統日誌查看

**使用方法：**
1. 配置交易所API密鑰
2. 設置Discord/郵件通知
3. 配置數據庫連接
4. 查看系統運行日誌

## 📖 使用教程

### 新手入門教程

#### 第1步：首次啟動
1. 運行 `./scripts/start_dev.sh`
2. 等待桌面應用打開
3. 查看儀表板確認系統正常

#### 第2步：創建第一個策略
1. 點擊左側菜單"策略管理"
2. 點擊"新增策略"按鈕
3. 填寫策略信息：
   - 策略名稱：測試SMA策略
   - 交易對：BTCUSDT
   - 策略類型：SMA交叉策略
   - 快速週期：10
   - 慢速週期：30
   - 最大倉位：1000 USD
4. 點擊"確定"創建

#### 第3步：運行回測
1. 點擊左側菜單"回測分析"
2. 選擇剛創建的策略
3. 設置回測參數：
   - 時間範圍：最近6個月
   - 初始資金：10000 USD
   - 手續費：0.1%
4. 點擊"開始回測"
5. 查看回測結果和資金曲線

#### 第4步：分析結果
1. 點擊左側菜單"盈利分析"
2. 查看盈利趨勢圖表
3. 分析風險指標
4. 查看詳細交易記錄

#### 第5步：設置風險控制
1. 點擊左側菜單"風險管理"
2. 設置風險參數：
   - 最大回撤：10%
   - 止損比例：2%
   - 止盈比例：4%
3. 點擊"保存設置"

### 高級用戶教程

#### 連接真實交易所
1. 註冊Binance帳戶並啟用API
2. 獲取API密鑰和密鑰
3. 在"系統設置"中配置：
   - API Key：您的真實API密鑰
   - API Secret：您的真實密鑰
   - 測試環境：關閉
4. 在 `.env` 文件中設置：
   ```
   BINANCE_TESTNET=false
   DEMO_MODE=false
   ```

#### 設置通知系統
1. 創建Discord Webhook URL
2. 在"系統設置"中配置：
   - 啟用Discord通知
   - 輸入Webhook URL
   - 選擇通知事件
3. 測試通知功能

#### 自定義策略參數
1. 在"策略管理"中編輯策略
2. 調整技術指標參數
3. 設置風險控制參數
4. 保存並測試新參數

## ⚙️ 高級配置

### 配置文件詳解

#### config/config.toml
```toml
[application]
name = "trading-bot"
version = "1.0.0"
debug = true                    # 調試模式

[trading]
demo_mode = true               # 演示模式
initial_balance = 10000.0      # 初始資金
max_strategies = 10            # 最大策略數

[binance]
api_key = "your_key"           # API密鑰
api_secret = "your_secret"     # API密鑰
testnet = true                 # 測試網絡

[webserver]
host = "127.0.0.1"            # 服務器地址
port = 8080                   # 服務器端口
```

#### .env 文件
```bash
# 數據庫配置
DATABASE_URL=sqlite:./trading_bot.db

# API配置
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
BINANCE_TESTNET=true

# 應用配置
DEMO_MODE=true
LOG_LEVEL=info
```

### 數據庫設置

#### 使用SQLite (默認)
```bash
# 自動創建，無需額外配置
DATABASE_URL=sqlite:./trading_bot.db
```

#### 使用PostgreSQL
```bash
# 1. 安裝PostgreSQL
sudo apt install postgresql

# 2. 創建數據庫
createdb trading_bot

# 3. 設置環境變量
DATABASE_URL=postgresql://user:password@localhost/trading_bot
```

### 性能優化

#### 系統資源配置
- **CPU**: 建議4核心以上
- **內存**: 建議8GB以上
- **磁盤**: 建議SSD，至少10GB可用空間
- **網絡**: 穩定的網絡連接

#### 應用優化
```toml
[ui]
chart_update_interval = 1000   # 圖表更新間隔(毫秒)
max_chart_points = 1000        # 圖表最大數據點

[trading]
max_concurrent_orders = 10     # 最大併發訂單數
order_timeout = 30             # 訂單超時時間(秒)
```

## 🔧 故障排除

### 常見問題快速解決

#### 1. 應用無法啟動
```bash
# 檢查依賴
./scripts/diagnostic.sh

# 重新安裝依賴
cargo clean && cargo build
cd frontend && rm -rf node_modules && npm install
```

#### 2. 連接失敗
```bash
# 檢查端口
lsof -i :8080

# 測試API
curl http://localhost:8080/health
```

#### 3. 數據不更新
```bash
# 檢查WebSocket連接
wscat -c ws://localhost:8080/ws

# 重啟服務
pkill trading-bot && cargo run --bin trading-bot-ui
```

### 日誌分析
```bash
# 查看實時日誌
tail -f logs/trading_bot.log

# 搜索錯誤
grep -i error logs/trading_bot.log

# 分析警告
grep -i warning logs/trading_bot.log
```

## ❓ 常見問題

### Q: 如何切換到實際交易？
A: 編輯 `.env` 文件，設置 `DEMO_MODE=false` 和 `BINANCE_TESTNET=false`，並配置真實的API密鑰。

### Q: 可以添加其他交易所嗎？
A: 當前版本主要支持Binance，後續版本將支持更多交易所。

### Q: 如何備份交易數據？
A: 交易數據存儲在 `trading_bot.db` 文件中，定期備份此文件即可。

### Q: 支持哪些交易策略？
A: 當前支持SMA交叉策略、均值回歸策略、動量策略等，可在策略管理中查看。

### Q: 如何優化策略性能？
A: 使用回測分析功能測試不同參數組合，並根據風險指標調整策略。

### Q: 系統有哪些安全保護？
A: 包括止損止盈、最大回撤控制、倉位限制、風險警報等多重保護機制。

## 📞 技術支持

### 獲取幫助
- 📖 查看文檔：[完整文檔](README.md)
- 🚀 快速開始：[QUICK_START.md](QUICK_START.md)
- 🔧 故障排除：[TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 🧪 測試指南：[TESTING_GUIDE.md](TESTING_GUIDE.md)

### 聯繫我們
- 📧 Email: support@trading-bot.com
- 💬 Discord: [Discord社群]
- 📱 GitHub: [GitHub項目]

---

**🎯 祝您交易順利！** 📈✨