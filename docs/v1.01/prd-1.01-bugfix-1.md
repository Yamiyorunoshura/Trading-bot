# 動態倉位策略系統 - Bug修復需求文檔

## 1. 需求概述

### 1.1 修復目標
針對第三階段開發的動態倉位策略系統進行界面優化和功能調整，提升用戶體驗和系統實用性。

### 1.2 修復範圍
- 交易系統總覽界面優化
- 策略管理界面功能完善
- 實時交易監控功能重組
- 風險管理系統界面簡化

## 2. 具體修復需求

### 2.1 交易系統總覽界面優化

#### 2.1.1 問題描述
當前 `TradingSystemDashboard.tsx` 組件顯示了過多的系統信息，影響用戶對核心交易數據的關注。

#### 2.1.2 修復要求
- **移除系統信息顯示**：隱藏系統狀態、版本信息等技術細節
- **突出核心指標**：重點展示賬戶權益、總盈虧、風險等級等關鍵數據
- **簡化界面佈局**：優化卡片佈局，減少視覺干擾

#### 2.1.3 具體修改
```typescript
// 移除以下系統信息顯示：
- 系統狀態詳細信息
- 版本號和技術參數
- 冗餘的系統配置選項

// 保留並突出以下核心指標：
- 賬戶權益 (Account Equity)
- 總盈虧 (Total PnL)
- 風險等級 (Risk Level)
- 活躍訂單數量
- 當前倉位狀態
```

### 2.2 策略管理界面功能完善

#### 2.2.1 問題描述
新開發的動態倉位策略未完全整合到策略管理界面中，用戶無法方便地管理和配置策略。

#### 2.2.2 修復要求
- **整合動態倉位策略**：將 `DynamicPositionStrategy.tsx` 完全整合到策略管理系統
- **統一策略配置界面**：提供統一的策略參數配置界面
- **策略狀態管理**：實現策略的啟動、停止、暫停等狀態管理
- **策略性能監控**：展示策略的實時性能指標

#### 2.2.3 具體修改
```typescript
// 在策略管理界面中添加：
- 動態倉位策略卡片
- 策略配置表單（杠桿倍數、風險模式等）
- 策略運行狀態指示器
- 策略性能圖表
- 策略控制按鈕（啟動/停止/暫停）
```

### 2.3 實時交易監控功能重組

#### 2.3.1 問題描述
實時交易監控功能分散在多個界面中，用戶需要切換多個頁面才能獲取完整的交易信息。

#### 2.3.2 修復要求
- **整合監控信息**：將實時交易監控信息整合到策略詳細信息中
- **統一數據展示**：在策略詳情頁面中展示相關的實時交易數據
- **優化信息架構**：重新組織信息層次，提高信息獲取效率

#### 2.3.3 具體修改
```typescript
// 在策略詳細信息中添加：
- 實時價格和成交量
- 當前持倉信息
- 最近交易信號
- 訂單執行狀態
- 風險警報信息
- 性能指標圖表
```

### 2.4 風險管理系統界面簡化

#### 2.4.1 問題描述
當前為每個策略都單獨開設風險管理界面，造成界面複雜和功能重複。

#### 2.4.2 修復要求
- **統一風險管理**：使用原有的統一風險管理系統
- **移除重複界面**：刪除策略專用的風險管理界面
- **優化風險展示**：在策略詳情中展示相關的風險指標

#### 2.4.3 具體修改
```typescript
// 保留原有的 EnhancedRiskManagement.tsx：
- 統一風險監控面板
- 全局風險指標
- 風險警報管理
- 緊急控制功能

// 移除策略專用的風險管理：
- 刪除 DynamicPositionStrategy 中的風險管理部分
- 在策略詳情中只顯示相關風險指標
- 通過鏈接到統一風險管理界面
```

## 3. 技術實現要求

### 3.1 界面組件修改

#### 3.1.1 TradingSystemDashboard.tsx
```typescript
// 修改系統總覽組件
const renderSystemOverview = () => {
  // 移除系統信息顯示
  // 保留核心交易指標
  return (
    <Row gutter={[16, 16]}>
      {/* 只顯示核心指標卡片 */}
    </Row>
  )
}
```

#### 3.1.2 DynamicPositionStrategy.tsx
```typescript
// 整合到策略管理系統
interface StrategyManagementProps {
  strategyType: 'dynamic_position'
  config: DynamicPositionConfig
}

// 移除重複的風險管理功能
// 添加策略配置和監控功能
```

#### 3.1.3 RealTimeTrading.tsx
```typescript
// 重組為策略詳情組件
interface StrategyDetailProps {
  strategyId: string
  includeRealTimeData: boolean
}

// 整合實時交易監控到策略詳情中
```

### 3.2 數據流優化

#### 3.2.1 狀態管理調整
```typescript
// 優化 tradingStore.ts
interface TradingStore {
  // 簡化系統狀態
  systemStatus: SimplifiedSystemStatus
  
  // 統一策略管理
  strategies: Strategy[]
  activeStrategy: string | null
  
  // 統一風險管理
  riskMetrics: RiskMetrics
  riskAlerts: RiskAlert[]
}
```

#### 3.2.2 API接口調整
```typescript
// 優化 trading.ts API
export class TradingSystemAPI {
  // 簡化系統狀態獲取
  static async getSimplifiedSystemStatus(): Promise<SimplifiedSystemStatus>
  
  // 統一策略管理
  static async getStrategies(): Promise<Strategy[]>
  static async getStrategyDetail(strategyId: string): Promise<StrategyDetail>
  
  // 保持統一風險管理
  static async getRiskMetrics(): Promise<RiskMetrics>
}
```

## 4. 測試要求

### 4.1 功能測試
- [ ] 交易系統總覽只顯示核心指標
- [ ] 動態倉位策略完全整合到策略管理
- [ ] 實時交易監控在策略詳情中正常顯示
- [ ] 統一風險管理系統正常工作

### 4.2 界面測試
- [ ] 界面佈局簡潔清晰
- [ ] 信息層次合理
- [ ] 用戶操作流程順暢
- [ ] 響應式設計正常

### 4.3 性能測試
- [ ] 界面響應速度正常
- [ ] 數據更新及時
- [ ] 內存使用合理

## 5. 驗收標準

### 5.1 功能完整性
- 所有修復需求已實現
- 原有功能不受影響
- 新功能正常工作

### 5.2 用戶體驗
- 界面簡潔易用
- 信息獲取效率提升
- 操作流程優化

### 5.3 代碼質量
- 代碼結構清晰
- 組件復用性良好
- 性能優化到位

## 6. 開發計劃

### 6.1 第一階段：界面簡化（1天）
- 修改 TradingSystemDashboard.tsx
- 移除系統信息顯示
- 優化核心指標展示

### 6.2 第二階段：策略整合（2天）
- 整合動態倉位策略到管理界面
- 實現統一策略配置
- 完善策略狀態管理

### 6.3 第三階段：監控重組（1天）
- 重組實時交易監控
- 整合到策略詳情中
- 優化數據展示

### 6.4 第四階段：風險管理優化（1天）
- 簡化風險管理界面
- 移除重複功能
- 統一風險展示

### 6.5 第五階段：測試和優化（1天）
- 功能測試
- 界面測試
- 性能優化

**總開發時間：6天**