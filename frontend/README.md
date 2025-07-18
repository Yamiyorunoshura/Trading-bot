# 量化交易機器人前端界面

基於 Tauri + React + TypeScript 的量化交易機器人桌面應用程式。

## 功能特點

- **儀表板**: 即時監控交易狀態和關鍵指標
- **策略管理**: 管理和監控交易策略
- **盈利分析**: 詳細的盈利分析和圖表
- **回測分析**: 策略回測功能
- **風險管理**: 風險控制和監控
- **系統設置**: 完整的系統配置管理

## 技術架構

- **前端**: React 18 + TypeScript + Vite
- **UI 框架**: Ant Design (暗色主題)
- **圖表庫**: Recharts
- **狀態管理**: Zustand
- **路由**: React Router
- **桌面應用**: Tauri
- **通信**: WebSocket + REST API

## 開發環境要求

- Node.js 18+
- npm 或 yarn
- Rust 1.70+
- Tauri CLI

## 安裝和運行

1. 安裝依賴：
```bash
npm install
```

2. 開發模式運行：
```bash
npm run dev
```

3. 構建生產版本：
```bash
npm run build
```

4. 運行 Tauri 應用：
```bash
npm run tauri dev
```

5. 構建 Tauri 應用：
```bash
npm run tauri build
```

## 項目結構

```
frontend/
├── src/
│   ├── components/         # React 組件
│   │   ├── Dashboard.tsx   # 儀表板
│   │   ├── StrategyManagement.tsx  # 策略管理
│   │   ├── ProfitAnalysis.tsx      # 盈利分析
│   │   ├── BacktestAnalysis.tsx    # 回測分析
│   │   ├── RiskManagement.tsx      # 風險管理
│   │   └── SystemSettings.tsx      # 系統設置
│   ├── stores/             # 狀態管理
│   │   └── appStore.ts     # 應用狀態
│   ├── App.tsx             # 主應用組件
│   ├── main.tsx            # 應用入口
│   └── index.css           # 全局樣式
├── public/                 # 靜態資源
├── package.json            # 依賴配置
├── vite.config.ts          # Vite 配置
└── tsconfig.json           # TypeScript 配置
```

## API 接口

應用程式通過 Tauri 命令與後端 Rust 核心通信：

- `init_trading_bot`: 初始化交易機器人
- `start_trading_bot`: 啟動交易機器人
- `stop_trading_bot`: 停止交易機器人
- `get_system_status`: 獲取系統狀態
- `get_strategies`: 獲取策略列表
- `get_market_data`: 獲取市場數據

## WebSocket 通信

前端通過 WebSocket 接收即時數據：

- 端口: 8080
- 路徑: `/ws`
- 數據格式: JSON
- 消息類型: market_data, strategy_update, system_status

## 主要組件

### 儀表板 (Dashboard)
- 即時交易狀態監控
- 關鍵指標顯示
- 系統健康狀態
- 盈利曲線圖表

### 策略管理 (StrategyManagement)
- 策略列表查看
- 策略啟動/停止
- 策略參數編輯
- 策略績效分析

### 盈利分析 (ProfitAnalysis)
- 盈利趨勢分析
- 多維度盈利統計
- 風險調整收益指標
- 詳細交易記錄

### 回測分析 (BacktestAnalysis)
- 策略回測配置
- 回測結果展示
- 資金曲線圖表
- 績效指標分析

### 風險管理 (RiskManagement)
- 風險參數設置
- 風險監控警報
- 風險指標顯示
- 風險控制規則

### 系統設置 (SystemSettings)
- 交易所 API 配置
- 通知設置
- 數據庫配置
- 系統日誌查看

## 主要特性

1. **響應式設計**: 支援各種螢幕尺寸
2. **暗色主題**: 專業的金融級界面
3. **即時數據**: WebSocket 即時數據更新
4. **離線支援**: 關鍵數據本地緩存
5. **安全性**: 敏感數據加密存儲
6. **可擴展性**: 模組化設計，易於擴展

## 開發指南

1. 所有組件都使用 TypeScript
2. 使用 Ant Design 組件庫
3. 遵循響應式設計原則
4. 使用 Zustand 進行狀態管理
5. 通過 Tauri 命令與後端通信
6. 使用 WebSocket 接收即時數據

## 未來計劃

- [ ] 移動端適配
- [ ] 更多圖表類型
- [ ] 高級分析功能
- [ ] 插件系統
- [ ] 多語言支援
- [ ] 主題自定義

## 問題反饋

如遇到問題或有建議，請在項目倉庫中提交 Issue。