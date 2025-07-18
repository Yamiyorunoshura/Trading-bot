# 代碼庫結構

## 項目目錄結構

```
├── src/                    # Rust源代碼
│   ├── api/               # 外部API整合
│   │   ├── binance.rs     # Binance API
│   │   ├── discord.rs     # Discord通知
│   │   ├── mod.rs         # 模組聲明
│   │   └── traits.rs      # 交易所API特徵
│   ├── data/              # 數據管理
│   │   ├── collector.rs   # 數據收集器
│   │   ├── processor.rs   # 數據處理器
│   │   ├── storage.rs     # 數據存儲
│   │   └── mod.rs         # 數據管理器
│   ├── models/            # 數據模型
│   │   ├── market.rs      # 市場數據模型
│   │   ├── strategy.rs    # 策略模型
│   │   ├── trade.rs       # 交易模型
│   │   └── mod.rs         # 模組聲明
│   ├── python/            # Python橋接
│   │   └── mod.rs         # Python策略管理器
│   ├── trading/           # 交易引擎
│   │   ├── engine.rs      # 交易引擎
│   │   ├── orders.rs      # 訂單管理
│   │   ├── risk.rs        # 風險管理
│   │   └── mod.rs         # 交易系統
│   ├── utils/             # 工具函數
│   │   ├── config.rs      # 配置管理
│   │   ├── logger.rs      # 日誌系統
│   │   ├── metrics.rs     # 指標收集
│   │   └── mod.rs         # 工具模組
│   ├── lib.rs             # 主庫文件
│   └── main.rs            # 主程序入口
├── python/                # Python源代碼
│   ├── strategies/        # 策略實現
│   │   ├── base.py        # 策略基類
│   │   ├── sma_crossover.py # SMA交叉策略
│   │   └── __init__.py    # 模組初始化
│   ├── backtest/          # 回測引擎
│   │   ├── engine.py      # 回測引擎
│   │   └── __init__.py    # 模組初始化
│   ├── bridge/            # Rust橋接
│   │   ├── rust_bridge.py # Rust橋接
│   │   └── __init__.py    # 模組初始化
│   ├── analysis/          # 分析工具
│   └── __init__.py        # Python包初始化
├── config/                # 配置文件
│   └── config.toml        # 主配置文件
├── tests/                 # 測試文件
├── docs/                  # 文檔
├── scripts/               # 腳本
└── logs/                  # 日誌文件
```

## 核心模組說明
- **API模組**: 處理外部交易所API和Discord通知
- **Data模組**: 負責數據收集、處理和存儲
- **Models模組**: 定義市場、策略和交易數據結構
- **Python模組**: 提供Python策略與Rust核心的橋接
- **Trading模組**: 實現交易執行、訂單管理和風險控制
- **Utils模組**: 提供配置、日誌和指標等工具功能