# 量化交易機器人 v0.1

一個基於Rust和Python混合架構的高性能量化交易機器人，提供歷史數據分析、策略回測、自動化交易執行和實時Discord通知功能。

## 🚀 功能特性

### 核心功能

1. **📊 歷史數據統計**
   - 多交易所數據收集支援（Binance等）
   - 實時和歷史數據同步
   - 數據完整性檢查和自動修復
   - 多時間框架支援（1s, 1m, 5m, 1h, 1d等）

2. **🔄 策略回測**
   - 完整的回測引擎和績效分析
   - 多種風險指標計算（夏普比率、最大回撤、勝率等）
   - 手續費和滑點模擬
   - 策略參數優化

3. **💰 自動化交易**
   - 高性能交易執行引擎
   - 智能風險管理系統
   - 紙上交易和實盤交易模式
   - 多種訂單類型支援

4. **📱 Discord通知**
   - 實時交易通知（開倉、平倉、盈虧）
   - 系統狀態監控
   - 績效報告推送
   - 豐富的消息格式

### 技術架構

- **Rust核心**: 高性能交易執行、數據處理、風險管理
- **Python策略**: 靈活的策略開發、回測分析、機器學習整合
- **混合架構**: 充分發揮兩種語言的優勢

## 📋 系統要求

### 必要環境

- **Rust 1.70+** (用於核心引擎)
- **Python 3.9+** (用於策略開發)
- **PostgreSQL 13+** (關係型數據庫)
- **Redis 6+** (緩存系統)
- **ClickHouse** (可選，用於時序數據)

### Python依賴

```bash
pip install pandas numpy yfinance requests matplotlib seaborn
```

## 🔧 快速開始

### 1. 環境設置

```bash
# 克隆項目
git clone <repository-url>
cd trading-bot-v0

# 設置開發環境
./scripts/setup.sh

# 複製配置文件
cp .env.example .env

# 編輯配置文件，設置API密鑰
nano .env
```

### 2. 安裝依賴

```bash
# 安裝Rust依賴
cargo build

# 安裝Python依賴
pip install -r requirements.txt
```

### 3. 配置設定

編輯 `config/config.toml` 文件：

```toml
[database]
postgres_url = "postgresql://username:password@localhost/trading_db"
redis_url = "redis://localhost:6379"

[discord]
token = "YOUR_DISCORD_BOT_TOKEN"
channel_id = "YOUR_DISCORD_CHANNEL_ID"
enabled = true

[exchanges.binance]
api_key = "YOUR_BINANCE_API_KEY"
secret_key = "YOUR_BINANCE_SECRET_KEY"
testnet = true

[trading]
live_trading = false  # 設為true啟用實盤交易
max_position_size = 1000.0
risk_limit = 0.02
```

### 4. 啟動系統

```bash
# 驗證配置
cargo run -- validate-config

# 啟動演示模式
cargo run -- start --demo

# 啟動實盤模式
cargo run -- start
```

## 📈 使用指南

### 運行回測

```bash
# 運行SMA交叉策略回測
cargo run -- backtest --strategy SMA_Cross --from 2024-01-01 --to 2024-12-01 --capital 10000

# 指定配置文件
cargo run -- backtest --strategy SMA_Cross --from 2024-01-01 --to 2024-12-01 --config custom-config.toml
```

### 系統監控

```bash
# 檢查系統狀態
cargo run -- status

# 查看日誌
tail -f logs/trading-bot.log

# 停止系統
cargo run -- stop
```

## 🧩 策略開發

### 創建新策略

1. 在 `python/strategies/` 目錄創建新策略文件
2. 繼承 `BaseStrategy` 類
3. 實現必要的方法

```python
from strategies.base import BaseStrategy, StrategySignal, SignalType

class MyStrategy(BaseStrategy):
    def generate_signals(self, data):
        # 實現你的策略邏輯
        signals = []
        # ... 策略邏輯 ...
        return signals
    
    def calculate_position_size(self, signal, price, balance):
        # 實現倉位計算
        return balance * 0.1 / price
```

### 現有策略

- **SMA交叉策略**: 基於快慢移動平均線交叉的經典策略
- 更多策略正在開發中...

## 🔒 風險管理

### 內建風險控制

- **最大倉位限制**: 防止單筆交易過大
- **止損止盈**: 自動風險控制
- **最大回撤限制**: 系統級風險保護
- **連續虧損保護**: 防止連續虧損

### 緊急停止機制

系統支援多種緊急停止觸發條件：
- 虧損超過閾值
- 回撤超過限制
- 連續虧損次數
- API錯誤率過高

## 📊 績效分析

### 回測報告包含

- 總收益和收益率
- 年化收益率
- 最大回撤
- 夏普比率和索蒂諾比率
- 交易統計（勝率、平均盈虧等）
- 權益曲線圖

### 實時監控

- Discord實時通知
- 系統健康檢查
- 交易日誌記錄
- 績效指標追蹤

## 🔧 開發指南

### 項目結構

```
├── src/                    # Rust源代碼
│   ├── api/               # 外部API整合
│   ├── data/              # 數據管理
│   ├── models/            # 數據模型
│   ├── python/            # Python橋接
│   ├── trading/           # 交易引擎
│   └── utils/             # 工具函數
├── python/                # Python源代碼
│   ├── strategies/        # 策略實現
│   ├── backtest/         # 回測引擎
│   ├── bridge/           # Rust橋接
│   └── analysis/         # 分析工具
├── config/               # 配置文件
├── tests/                # 測試文件
└── docs/                 # 文檔
```

### 開發工作流

```bash
# 格式化代碼
cargo fmt
black python/

# 檢查代碼
cargo clippy
flake8 python/

# 運行測試
cargo test
pytest python/tests/

# 構建發布版本
cargo build --release
```

## 🛡️ 安全注意事項

1. **API密鑰安全**: 
   - 使用環境變量存儲API密鑰
   - 定期輪換密鑰
   - 限制API權限

2. **資金安全**:
   - 始終在測試網測試
   - 設置合理的風險限額
   - 監控異常行為

3. **系統安全**:
   - 定期更新依賴
   - 使用防火牆保護
   - 監控系統日誌

## 🐛 故障排除

### 常見問題

1. **數據連接問題**
   - 檢查網絡連接
   - 驗證API密鑰
   - 確認數據庫連接

2. **策略執行問題**
   - 檢查Python環境
   - 驗證策略參數
   - 查看詳細日誌

3. **通知問題**
   - 確認Discord配置
   - 檢查頻道權限
   - 測試網絡連接

### 日誌位置

- 系統日誌: `logs/trading-bot.log`
- 錯誤日誌: `logs/error.log`
- 交易日誌: `logs/trades.log`

## 📞 支持與貢獻

### 技術支持

如果遇到問題，請：
1. 查看日誌文件
2. 檢查配置設置
3. 參考故障排除指南
4. 提交Issue並附上詳細信息

### 貢獻指南

歡迎提交Pull Request！請確保：
1. 遵循代碼風格規範
2. 添加適當的測試
3. 更新相關文檔
4. 通過所有檢查

## 📜 許可證

本項目採用MIT許可證 - 詳見 [LICENSE](LICENSE) 文件

## ⚠️ 免責聲明

本軟件僅供教育和研究目的使用。使用本軟件進行實際交易存在風險，可能導致資金損失。使用者需自行承擔所有風險，開發者不承擔任何責任。

在使用真實資金進行交易前，請：
- 充分測試所有功能
- 了解相關風險
- 諮詢專業建議
- 設定適當的風險限額

---

**開始你的量化交易之旅！** 🚀