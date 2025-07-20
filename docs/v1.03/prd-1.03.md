# 量化交易機器人 v1.03 - 回測功能完整實現需求文檔

## 1. 項目概述

### 1.1 版本信息
- **版本號**: v1.03
- **開發階段**: 回測功能完整實現
- **基於版本**: v1.02 (霓虹未來UI系統)
- **開發週期**: 預計10天

### 1.2 項目背景
基於v1.02霓虹未來UI系統的成功實現，v1.03專注於完善回測功能，提供完整的策略驗證和績效分析能力。當前項目已具備：

**已實現的核心組件：**
- ✅ 完整的後端回測引擎 (python/backtest/engine.py - 530行)
- ✅ 動態倉位策略 (python/strategies/dynamic_position_strategy.py - 568行)
- ✅ SMA交叉策略 (python/strategies/sma_crossover.py - 323行)
- ✅ 策略基類系統 (python/strategies/base.py - 352行)
- ✅ 基礎的前端回測界面 (BacktestAnalysis.tsx - 469行)
- ✅ 動態倉位配置界面 (DynamicPositionConfig.tsx - 492行)
- ✅ 統一的API接口系統 (trading.ts - 858行)
- ✅ 霓虹未來設計系統 (v1.02完成)

**當前狀態：**
- 後端策略系統完整，支持2種策略類型
- 前端界面基礎完整，需要與後端回測引擎整合
- 需要擴展回測引擎以支持杠桿交易和複雜策略參數

### 1.3 核心目標
1. **完整實現回測功能**：基於現有SMA交叉和動態倉位策略的專業級回測分析
2. **可視化視圖優化**：基於霓虹未來設計系統的數據可視化
3. **面板配置API接口**：統一的回測配置和管理接口

## 2. 功能需求規格

### 2.1 回測引擎增強

#### 2.1.1 核心功能擴展
| 功能模組 | 當前狀態 | 目標狀態 | 優先級 |
|---------|---------|---------|--------|
| SMA交叉策略回測 | 基礎支持 | 完整支持 | 高 |
| 動態倉位策略回測 | 基礎支持 | 完整支持 | 高 |
| 參數優化 | 無 | 網格搜索優化 | 高 |
| 風險分析 | 基礎指標 | 完整風險模型 | 中 |
| 績效報告 | 基礎統計 | 專業報告 | 中 |
| 數據導出 | 無 | 多格式支持 | 低 |

#### 2.1.2 策略支持列表
基於項目現有實現，支持以下策略類型：

```python
# 已實現的策略類型
STRATEGIES = {
    'sma_crossover': {
        'name': 'SMA交叉策略',
        'description': '基於簡單移動平均線交叉的經典策略',
        'parameters': ['fast_period', 'slow_period', 'signal_threshold'],
        'status': '已實現',
        'file': 'python/strategies/sma_crossover.py'
    },
    'dynamic_position': {
        'name': '動態倉位策略 - 杠桿版',
        'description': '基於多指標綜合分析的智能杠桿交易策略',
        'parameters': ['risk_mode', 'leverage_config', 'indicator_weights'],
        'status': '已實現',
        'file': 'python/strategies/dynamic_position_strategy.py'
    }
}


```

#### 2.1.3 回測配置參數
基於現有策略實現，定義完整的回測配置參數：

```typescript
interface BacktestConfig {
  // 基礎配置
  strategy: string;
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  start_date: string;
  end_date: string;
  
  // 資金配置
  initial_capital: number;
  commission: number;
  slippage: number;
  
  // 策略特定參數
  strategy_params: {
    // SMA交叉策略參數
    sma_crossover?: {
      fast_period: number;      // 快線週期 (默認: 10)
      slow_period: number;      // 慢線週期 (默認: 20)
      signal_threshold: number; // 信號閾值 (默認: 0.001)
    };
    
    // 動態倉位策略參數
    dynamic_position?: {
      risk_mode: 'conservative' | 'balanced' | 'aggressive';
      leverage_config: {
        max_leverage: number;        // 最大杠桿 (1.0-10.0)
        leverage_usage_rate: number; // 杠桿使用率 (0.1-1.0)
        dynamic_leverage: boolean;   // 動態杠桿調整
      };
      indicator_weights: {
        valuation_weight: number;    // 估值指標權重 (0.34)
        risk_adjusted_weight: number; // 風險調整權重 (0.33)
        fundamental_weight: number;   // 基本面權重 (0.33)
      };
      thresholds: {
        buy_start_percentile: number;      // 買入開始百分位
        sell_start_percentile: number;     // 賣出開始百分位
        min_buy_ratio: number;            // 最小買入比例
        max_buy_ratio: number;            // 最大買入比例
      };
    };
  };
  
  // 風險控制
  risk_params: {
    max_position_size: number;  // 最大倉位大小
    stop_loss: number;          // 止損百分比
    take_profit: number;        // 止盈百分比
    max_drawdown: number;       // 最大回撤限制
    risk_per_trade: number;     // 每筆交易風險
  };
  
  // 優化配置
  optimization_enabled: boolean;
  optimization_params: {
    method: 'grid' | 'genetic' | 'bayesian';
    iterations: number;
    parallel: boolean;
    parameter_ranges: Record<string, [number, number]>; // 參數搜索範圍
  };
}
```

### 2.2 可視化視圖系統

#### 2.2.1 核心圖表組件
基於霓虹未來設計系統，實現以下可視化組件：

**2.2.1.1 權益曲線圖**
- 實時權益變化曲線
- 最大回撤標記
- 交易點位標記
- 霓虹光效動畫

**2.2.1.2 績效儀表板**
- 關鍵指標卡片展示
- 實時數據更新
- 動態顏色變化
- 呼吸動畫效果

**2.2.1.3 交易分布圖**
- 盈虧分布直方圖
- 交易頻率熱力圖
- 時間序列分析
- 交互式篩選

**2.2.1.4 風險分析圖**
- 回撤分析圖
- 夏普比率變化
- 波動率分析
- 相關性矩陣

#### 2.2.2 霓虹未來視覺規範
```css
/* 圖表主題色彩 */
--chart-primary: #00F5D4;
--chart-secondary: #7A81A3;
--chart-success: #29DDC4;
--chart-danger: #FF4D6D;
--chart-warning: #FFB800;

/* 圖表動畫 */
--chart-animation-duration: 0.8s;
--chart-animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
```

### 2.3 面板配置API接口

#### 2.3.1 回測管理API
```typescript
// 回測管理接口
interface BacktestAPI {
  // 基礎操作
  createBacktest(config: BacktestConfig): Promise<string>;
  startBacktest(id: string): Promise<boolean>;
  stopBacktest(id: string): Promise<boolean>;
  deleteBacktest(id: string): Promise<boolean>;
  
  // 配置管理
  getBacktestConfig(id: string): Promise<BacktestConfig>;
  updateBacktestConfig(id: string, config: Partial<BacktestConfig>): Promise<boolean>;
  
  // 結果查詢
  getBacktestResult(id: string): Promise<BacktestResult>;
  getBacktestProgress(id: string): Promise<BacktestProgress>;
  
  // 批量操作
  listBacktests(filters?: BacktestFilters): Promise<BacktestSummary[]>;
  compareBacktests(ids: string[]): Promise<ComparisonResult>;
}
```

#### 2.3.2 策略配置API
```typescript
// 策略配置接口
interface StrategyAPI {
  // 策略管理
  getAvailableStrategies(): Promise<StrategyInfo[]>;
  getStrategyConfig(strategy: string): Promise<StrategyConfig>;
  validateStrategyConfig(config: StrategyConfig): Promise<ValidationResult>;
  
  // 參數優化
  optimizeStrategy(config: OptimizationConfig): Promise<OptimizationResult>;
  getOptimizationProgress(id: string): Promise<OptimizationProgress>;
  
  // 模板管理
  saveStrategyTemplate(config: StrategyConfig, name: string): Promise<boolean>;
  loadStrategyTemplate(name: string): Promise<StrategyConfig>;
  listStrategyTemplates(): Promise<TemplateInfo[]>;
}
```

#### 2.3.3 數據管理API
```typescript
// 數據管理接口
interface DataAPI {
  // 歷史數據
  getHistoricalData(symbol: string, timeframe: string, start: string, end: string): Promise<MarketData[]>;
  validateDataAvailability(symbol: string, timeframe: string, start: string, end: string): Promise<DataValidation>;
  
  // 數據導出
  exportBacktestData(id: string, format: 'csv' | 'json' | 'excel'): Promise<string>;
  exportStrategyConfig(id: string, format: 'json' | 'yaml'): Promise<string>;
  
  // 數據導入
  importStrategyConfig(data: string, format: 'json' | 'yaml'): Promise<StrategyConfig>;
  importHistoricalData(data: string, format: 'csv' | 'json'): Promise<boolean>;
}
```

## 3. 技術實現方案

### 3.1 後端架構增強

#### 3.1.1 回測引擎擴展
```python
# 新增功能模組
class EnhancedBacktestEngine(BacktestEngine):
    def __init__(self, config: BacktestConfig):
        super().__init__(config)
        self.optimizer = StrategyOptimizer()
        self.risk_analyzer = RiskAnalyzer()
        self.performance_analyzer = PerformanceAnalyzer()
    
    async def run_optimization(self, optimization_config: OptimizationConfig) -> OptimizationResult:
        """運行策略參數優化"""
        pass
    
    async def generate_report(self, format: str = 'html') -> str:
        """生成專業回測報告"""
        pass
    
    async def export_results(self, format: str = 'csv') -> str:
        """導出回測結果"""
        pass
```

#### 3.1.2 策略工廠擴展
基於現有的策略架構，擴展策略工廠支持：

```python
# 策略工廠模式 - 基於現有實現
class StrategyFactory:
    @staticmethod
    def create_strategy(strategy_type: str, config: StrategyConfig) -> BaseStrategy:
        """創建策略實例"""
        strategies = {
            'sma_crossover': SMACrossoverStrategy,
            'dynamic_position': DynamicPositionStrategy,
        }
        
        if strategy_type not in strategies:
            raise ValueError(f"不支持的策略類型: {strategy_type}")
        
        return strategies[strategy_type](config)
    
    @staticmethod
    def get_available_strategies() -> Dict[str, Dict]:
        """獲取可用策略列表"""
        return {
            'sma_crossover': {
                'name': 'SMA交叉策略',
                'description': '基於簡單移動平均線交叉的經典策略',
                'parameters': {
                    'fast_period': {'type': 'int', 'default': 10, 'range': [5, 50]},
                    'slow_period': {'type': 'int', 'default': 20, 'range': [10, 100]},
                    'signal_threshold': {'type': 'float', 'default': 0.001, 'range': [0.0001, 0.01]}
                },
                'risk_params': {
                    'max_position_size': {'type': 'float', 'default': 1000.0},
                    'stop_loss': {'type': 'float', 'default': 0.02, 'range': [0.01, 0.10]},
                    'take_profit': {'type': 'float', 'default': 0.04, 'range': [0.02, 0.20]}
                }
            },
            'dynamic_position': {
                'name': '動態倉位策略 - 杠桿版',
                'description': '基於多指標綜合分析的智能杠桿交易策略',
                'parameters': {
                    'risk_mode': {'type': 'enum', 'options': ['conservative', 'balanced', 'aggressive']},
                    'max_leverage': {'type': 'float', 'default': 3.0, 'range': [1.0, 10.0]},
                    'leverage_usage_rate': {'type': 'float', 'default': 0.8, 'range': [0.1, 1.0]}
                },
                'risk_params': {
                    'max_position_size': {'type': 'float', 'default': 1000.0},
                    'stop_loss': {'type': 'float', 'default': 0.05, 'range': [0.02, 0.15]},
                    'take_profit': {'type': 'float', 'default': 0.10, 'range': [0.05, 0.30]},
                    'max_drawdown': {'type': 'float', 'default': 0.15, 'range': [0.05, 0.30]}
                }
            }
        }
```

### 3.2 前端組件重構

#### 3.2.1 回測分析組件重構
```typescript
// 基於霓虹未來設計系統的重構
const BacktestAnalysis: React.FC = () => {
  return (
    <div className="neon-backtest-container">
      {/* 配置面板 */}
      <BacktestConfigPanel />
      
      {/* 可視化面板 */}
      <BacktestVisualizationPanel />
      
      {/* 結果面板 */}
      <BacktestResultsPanel />
      
      {/* 優化面板 */}
      <BacktestOptimizationPanel />
    </div>
  );
};
```

#### 3.2.2 新增可視化組件
```typescript
// 權益曲線組件
const EquityCurveChart: React.FC<{data: EquityData[]}> = ({data}) => {
  return (
    <div className="neon-chart-container">
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00F5D4" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#00F5D4" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
          <XAxis dataKey="date" stroke="#7A81A3" />
          <YAxis stroke="#7A81A3" />
          <Tooltip contentStyle={neonTooltipStyle} />
          <Area 
            type="monotone" 
            dataKey="equity" 
            stroke="#00F5D4" 
            fill="url(#equityGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 3.3 API接口實現

#### 3.3.1 Tauri後端API
```rust
// 回測管理API
#[tauri::command]
async fn create_backtest(
    config: BacktestConfig,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let backtest_id = generate_uuid();
    let engine = EnhancedBacktestEngine::new(config);
    
    state.backtest_engines.lock().await.insert(backtest_id.clone(), engine);
    
    Ok(backtest_id)
}

#[tauri::command]
async fn start_backtest(
    id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    if let Some(engine) = state.backtest_engines.lock().await.get_mut(&id) {
        engine.start().await.map_err(|e| e.to_string())
    } else {
        Err("Backtest not found".to_string())
    }
}
```

#### 3.3.2 前端API服務
```typescript
// 回測API服務類
export class BacktestAPIService {
  static async createBacktest(config: BacktestConfig): Promise<string> {
    if (isTauriAvailable()) {
      return await invoke('create_backtest', { config });
    } else {
      // 模擬API調用
      return await this.mockCreateBacktest(config);
    }
  }
  
  static async getBacktestResult(id: string): Promise<BacktestResult> {
    if (isTauriAvailable()) {
      return await invoke('get_backtest_result', { id });
    } else {
      return await this.mockGetBacktestResult(id);
    }
  }
}
```

## 4. 開發計劃

### 4.1 第一階段：現有策略整合 (3天)
- [ ] 完善SMA交叉策略的回測支持
- [ ] 完善動態倉位策略的回測支持
- [ ] 擴展回測引擎以支持杠桿交易
- [ ] 實現策略特定的參數配置界面
- [ ] 基礎API接口開發和測試

### 4.2 第二階段：可視化系統 (3天)
- [ ] 霓虹未來圖表組件開發
- [ ] 權益曲線可視化
- [ ] 績效儀表板實現
- [ ] 動畫效果優化

### 4.3 第三階段：高級功能 (2天)
- [ ] 參數優化功能
- [ ] 風險分析增強
- [ ] 報告生成系統
- [ ] 數據導出功能

### 4.4 第四階段：測試優化 (2天)
- [ ] 端到端測試
- [ ] 性能優化
- [ ] 文檔完善
- [ ] 用戶驗收

## 5. 驗收標準

### 5.1 功能驗收
- [ ] 支持2種已實現策略（SMA交叉、動態倉位）
- [ ] 完整的回測配置界面，支持策略特定參數配置
- [ ] 基於霓虹未來設計的專業級可視化圖表
- [ ] 參數優化功能（網格搜索、遺傳算法）
- [ ] 多格式數據導出（CSV、JSON、Excel）
- [ ] 動態倉位策略的杠桿配置和風險模式選擇
- [ ] SMA交叉策略的移動平均線參數調整

### 5.2 性能驗收
- [ ] 回測執行時間 < 30秒 (1年數據)
- [ ] 圖表渲染時間 < 2秒
- [ ] 內存使用 < 500MB
- [ ] 支持並發回測

### 5.3 用戶體驗驗收
- [ ] 霓虹未來設計一致性
- [ ] 響應式適配完整
- [ ] 動畫效果流暢
- [ ] 操作流程直觀

## 6. 技術風險與對策

### 6.1 性能風險
**風險**: 大量數據處理可能導致性能問題
**對策**: 
- 實現數據分頁和虛擬化
- 使用Web Workers進行後台計算
- 實現漸進式數據加載

### 6.2 兼容性風險
**風險**: 新功能可能影響現有系統
**對策**:
- 保持向後兼容性
- 建立完整的測試套件
- 實現功能開關機制

### 6.3 數據安全風險
**風險**: 敏感策略配置可能洩露
**對策**:
- 實現本地加密存儲
- 建立數據備份機制
- 添加訪問權限控制

## 7. 成功指標

### 7.1 技術指標
- 代碼覆蓋率 > 85%
- 構建成功率 100%
- 測試通過率 > 95%
- 性能達標率 100%

### 7.2 業務指標
- 功能完成度 100%
- 用戶滿意度 > 90%
- 文檔完整性 100%
- 部署成功率 100%

---

**文檔版本**: 1.0
**創建日期**: 2025年1月
**最後更新**: 2025年1月
**負責人**: 開發團隊