# 🚀 快速開始指南

## 一鍵啟動（推薦）

### macOS/Linux
```bash
# 1. 運行快速啟動腳本
./scripts/start_dev.sh
```

### Windows
```cmd
# 1. 運行快速啟動腳本
scripts\start_dev.bat
```

就是這麼簡單！腳本會自動：
- ✅ 檢查依賴
- ✅ 安裝所需套件
- ✅ 創建配置文件
- ✅ 啟動桌面應用

## 手動啟動步驟

### 1. 準備環境
```bash
# 安裝 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安裝 Tauri CLI
cargo install tauri-cli

# 安裝 Node.js (如果還沒有)
# macOS: brew install node
# Ubuntu: sudo apt install nodejs npm
```

### 2. 設置配置
```bash
# 複製環境變量文件
cp .env.example .env

# 編輯 .env 文件 (可選)
nano .env
```

### 3. 安裝依賴
```bash
# 安裝 Rust 依賴
cargo build

# 安裝前端依賴
cd frontend && npm install && cd ..
```

### 4. 啟動應用
```bash
# 啟動桌面應用
cd frontend && npm run tauri dev
```

## 🎯 首次使用指南

### 1. 應用啟動後，您將看到：
- 📊 **儀表板**: 顯示系統狀態和模擬數據
- 🤖 **策略管理**: 可以創建和管理交易策略
- 📈 **盈利分析**: 查看盈利圖表和統計
- 🔬 **回測分析**: 測試策略效果
- ⚠️ **風險管理**: 設置風險控制參數
- ⚙️ **系統設置**: 配置API和通知

### 2. 建議的測試流程：
1. **查看儀表板** → 確認系統狀態正常
2. **創建策略** → 策略管理 → 新增策略
3. **運行回測** → 回測分析 → 配置並運行
4. **查看結果** → 盈利分析 → 查看圖表
5. **設置風險** → 風險管理 → 配置參數

## 📱 功能預覽

### 儀表板
- 💰 總資產和今日盈虧
- 📊 實時市場數據
- 🔄 系統健康狀態
- 📈 盈利曲線圖

### 策略管理
- 🎯 創建SMA交叉策略
- ⚡ 一鍵啟動/停止
- 📋 策略績效監控
- 🔧 參數調整

### 盈利分析
- 📊 多維度盈利分析
- 📈 趨勢圖表
- 📊 風險指標
- 📝 詳細交易記錄

## 🔧 常見問題

### Q: 應用啟動失敗？
A: 檢查以下項目：
- Rust 是否已安裝：`rustc --version`
- Node.js 是否已安裝：`node --version`
- 依賴是否已安裝：`cargo build` 和 `npm install`

### Q: 桌面窗口沒有打開？
A: 手動訪問 http://localhost:5173

### Q: 想要連接真實交易所？
A: 編輯 `.env` 文件，設置您的API密鑰：
```bash
BINANCE_API_KEY=your_real_api_key
BINANCE_API_SECRET=your_real_secret
BINANCE_TESTNET=false
DEMO_MODE=false
```

### Q: 如何添加新的交易策略？
A: 當前版本支持SMA交叉策略，後續版本將支持更多策略類型。

## 🛠️ 開發模式

### 單獨運行後端
```bash
cargo run --bin trading-bot-ui
```

### 單獨運行前端
```bash
cd frontend && npm run dev
```

### 測試API
```bash
./scripts/test_api.sh
```

## 🎉 成功標誌

如果一切正常，您將看到：
- ✅ 桌面應用打開
- ✅ 儀表板顯示數據
- ✅ 圖表正常渲染
- ✅ 策略管理功能可用
- ✅ 響應式界面操作流暢

## 📞 需要幫助？

- 📖 查看詳細文檔：[TESTING_GUIDE.md](TESTING_GUIDE.md)
- 🐛 遇到問題？檢查日誌：`logs/trading_bot.log`
- 💬 技術支持：聯繫開發團隊

---

**🎯 開始您的量化交易之旅！** 🚀