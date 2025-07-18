# 技術棧詳細信息

## Rust 技術棧
- **核心框架**: tokio (異步運行時)
- **HTTP客戶端**: reqwest
- **數據庫**: sqlx (PostgreSQL), redis
- **數據處理**: polars, chrono
- **配置管理**: config, clap
- **日誌系統**: tracing, tracing-subscriber
- **錯誤處理**: anyhow, thiserror
- **Python整合**: pyo3
- **序列化**: serde, serde_json
- **WebSocket**: tokio-tungstenite
- **加密**: ring, base64

## Python 技術棧
- **數據處理**: pandas, numpy, polars
- **技術指標**: ta-lib, pandas-ta
- **交易**: ccxt, websocket-client
- **機器學習**: scikit-learn
- **HTTP客戶端**: requests, aiohttp
- **配置**: pyyaml, python-dotenv
- **數據庫**: psycopg2-binary, redis, clickhouse-driver
- **測試**: pytest, pytest-asyncio
- **開發工具**: black, isort, mypy

## 架構設計
- **Rust**: 性能關鍵的交易執行、數據處理、風險管理
- **Python**: 策略開發、回測分析、機器學習整合
- **通信**: Python通過pyo3與Rust核心通信