# 🔧 故障排除指南

## 🚨 常見問題解決方案

### 1. 編譯錯誤

#### 問題：Rust 編譯失敗
```bash
error: could not compile `trading-bot`
```

**解決方案：**
```bash
# 更新 Rust 工具鏈
rustup update

# 清理並重新編譯
cargo clean
cargo build --release

# 如果仍然失敗，檢查 Rust 版本
rustc --version  # 需要 1.70+
```

#### 問題：缺少系統依賴
```bash
error: failed to run custom build command for `...`
```

**解決方案：**
```bash
# macOS
brew install pkg-config openssl

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install build-essential pkg-config libssl-dev

# CentOS/RHEL
sudo yum install gcc openssl-devel pkgconfig
```

### 2. 前端問題

#### 問題：npm 安裝失敗
```bash
npm ERR! code EINTEGRITY
```

**解決方案：**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 問題：Tauri 構建失敗
```bash
Error: Could not find the required dependencies for building
```

**解決方案：**
```bash
# macOS
brew install webkit2gtk

# Ubuntu/Debian
sudo apt-get install webkit2gtk-4.0-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Windows (需要 Visual Studio Build Tools)
# 下載並安裝 Microsoft C++ Build Tools
```

### 3. 運行時問題

#### 問題：應用啟動後崩潰
```bash
thread 'main' panicked at 'called `Result::unwrap()` on an `Err` value'
```

**解決方案：**
```bash
# 檢查配置文件
cat config/config.toml

# 檢查環境變量
cat .env

# 啟用調試模式
RUST_LOG=debug cargo run --bin trading-bot-ui
```

#### 問題：WebSocket 連接失敗
```bash
WebSocket connection failed
```

**解決方案：**
```bash
# 檢查端口是否被占用
lsof -i :8080
netstat -an | grep 8080

# 更改端口（在 config/config.toml）
[webserver]
port = 8081
```

#### 問題：前端無法連接後端
```bash
Failed to fetch from http://localhost:8080
```

**解決方案：**
```bash
# 確保後端正在運行
curl http://localhost:8080/health

# 檢查防火牆設置
# macOS
sudo pfctl -d

# Ubuntu
sudo ufw status
```

### 4. 數據庫問題

#### 問題：SQLite 權限錯誤
```bash
Error: unable to open database file
```

**解決方案：**
```bash
# 檢查文件權限
ls -la trading_bot.db

# 創建數據目錄
mkdir -p data
chmod 755 data

# 重新創建數據庫
rm trading_bot.db
cargo run --bin trading-bot-ui
```

#### 問題：PostgreSQL 連接失敗
```bash
Error: error connecting to database
```

**解決方案：**
```bash
# 檢查 PostgreSQL 是否運行
sudo systemctl status postgresql

# 檢查連接字符串
echo $DATABASE_URL

# 測試連接
psql $DATABASE_URL
```

### 5. API 問題

#### 問題：Binance API 連接失敗
```bash
Error: API key format invalid
```

**解決方案：**
```bash
# 檢查 API 密鑰格式
echo $BINANCE_API_KEY

# 確保使用測試網絡
BINANCE_TESTNET=true

# 檢查 API 權限
curl -H "X-MBX-APIKEY: $BINANCE_API_KEY" 'https://testnet.binance.vision/api/v3/account'
```

#### 問題：Discord 通知失敗
```bash
Error: webhook request failed
```

**解決方案：**
```bash
# 測試 webhook URL
curl -H "Content-Type: application/json" \
     -d '{"content": "test"}' \
     $DISCORD_WEBHOOK_URL

# 檢查 URL 格式
echo $DISCORD_WEBHOOK_URL
```

## 🐛 調試技巧

### 1. 啟用詳細日誌
```bash
export RUST_LOG=debug
export RUST_BACKTRACE=1
cargo run --bin trading-bot-ui
```

### 2. 檢查日誌文件
```bash
# 查看最新日誌
tail -f logs/trading_bot.log

# 搜索錯誤
grep -i error logs/trading_bot.log
```

### 3. 監控系統資源
```bash
# 檢查內存使用
top -p $(pgrep trading-bot)

# 檢查磁盤空間
df -h

# 檢查網絡連接
netstat -an | grep 8080
```

### 4. 驗證環境
```bash
# 檢查 Rust 版本
rustc --version

# 檢查 Node.js 版本
node --version

# 檢查 Python 版本
python --version

# 檢查 Tauri CLI
tauri --version
```

## 📋 健康檢查清單

在報告問題前，請執行以下檢查：

### 基本環境
- [ ] Rust 1.70+ 已安裝
- [ ] Node.js 18+ 已安裝
- [ ] Python 3.9+ 已安裝
- [ ] Tauri CLI 已安裝

### 項目設置
- [ ] 所有依賴已安裝 (`cargo build` 成功)
- [ ] 前端依賴已安裝 (`npm install` 成功)
- [ ] 配置文件存在且格式正確
- [ ] 環境變量文件已設置

### 運行時檢查
- [ ] 沒有端口衝突
- [ ] 防火牆允許連接
- [ ] 足夠的磁盤空間
- [ ] 足夠的內存

### 網絡連接
- [ ] 可以訪問 localhost:8080
- [ ] WebSocket 連接正常
- [ ] 外部 API 可訪問（如果啟用）

## 🆘 獲取幫助

如果上述解決方案都無法解決您的問題：

### 1. 收集信息
```bash
# 創建診斷報告
./scripts/diagnostic.sh > diagnostic_report.txt
```

### 2. 問題報告模板
```markdown
**環境信息：**
- 操作系統：[macOS/Windows/Linux]
- Rust 版本：[rustc --version]
- Node.js 版本：[node --version]
- 錯誤信息：[完整錯誤日誌]

**重現步驟：**
1. 
2. 
3. 

**期望結果：**
[描述您期望發生的情況]

**實際結果：**
[描述實際發生的情況]

**其他信息：**
[其他相關信息]
```

### 3. 聯繫支持
- 📧 Email: support@trading-bot.com
- 💬 Discord: [Discord 服務器連結]
- 📱 GitHub Issues: [GitHub 項目連結]

## 📚 更多資源

- 📖 [完整文檔](README.md)
- 🚀 [快速開始](QUICK_START.md)
- 🧪 [測試指南](TESTING_GUIDE.md)
- 🔧 [開發指南](DEVELOPMENT.md)

---

**💡 小提示：** 90% 的問題都可以通過重新安裝依賴和檢查配置文件來解決！