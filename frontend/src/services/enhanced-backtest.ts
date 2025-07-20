/**
 * v1.03 增強型回測API服務
 * 
 * 支持動態倉位策略、杠桿交易、參數優化等功能
 */

import { invoke } from '@tauri-apps/api/tauri'
import { tauriApiService } from './tauri'

// ===== 增強型回測接口定義 =====

export interface EnhancedBacktestConfig {
  // 基礎配置
  strategy_type: 'sma_crossover' | 'dynamic_position'
  symbol: string
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  start_date: string
  end_date: string
  
  // 資金配置
  initial_capital: number
  commission: number
  slippage: number
  
  // 策略特定參數
  strategy_params: {
    // SMA交叉策略參數
    sma_crossover?: {
      fast_period: number
      slow_period: number
      signal_threshold: number
    }
    
    // 動態倉位策略參數
    dynamic_position?: {
      risk_mode: 'conservative' | 'balanced' | 'aggressive'
      leverage_config: {
        max_leverage: number
        leverage_usage_rate: number
        dynamic_leverage: boolean
      }
      indicator_weights: {
        valuation_weight: number
        risk_adjusted_weight: number
        fundamental_weight: number
      }
      thresholds: {
        buy_start_percentile: number
        sell_start_percentile: number
        min_buy_ratio: number
        max_buy_ratio: number
      }
    }
  }
  
  // 風險控制
  risk_params: {
    max_position_size: number
    stop_loss: number
    take_profit: number
    max_drawdown: number
    risk_per_trade: number
  }
  
  // 杠桿配置
  leverage_enabled: boolean
  max_leverage: number
  leverage_config: Record<string, any>
  
  // 優化配置
  optimization_enabled: boolean
  optimization_params: Record<string, any>
}

export interface EnhancedBacktestResult {
  // 基礎結果
  strategy_name: string
  start_date: string
  end_date: string
  initial_capital: number
  final_capital: number
  
  // 交易統計
  total_trades: number
  winning_trades: number
  losing_trades: number
  
  // 盈虧統計
  total_pnl: number
  total_return: number
  annual_return: number
  max_drawdown: number
  
  // 風險指標
  sharpe_ratio: number
  sortino_ratio: number
  volatility: number
  
  // 杠桿相關指標
  leverage_stats: {
    max_leverage_used: number
    avg_leverage_used: number
    leverage_efficiency: number
    utilization: number
    volatility: number
  }
  
  // 高級風險指標
  var_95: number
  cvar_95: number
  calmar_ratio: number
  omega_ratio: number
  
  // 交易分析
  trade_analysis: {
    total_trades: number
    profitable_trades: number
    losing_trades: number
    win_rate: number
    avg_profit: number
    avg_loss: number
    profit_factor: number
    largest_win: number
    largest_loss: number
  }
  
  // 時間序列數據
  daily_returns: number[]
  monthly_returns: number[]
  equity_curve: number[]
  drawdown_periods: Array<{
    start_date: string
    end_date: string
    duration_days: number
    max_drawdown: number
    recovery_date?: string
  }>
  
  // 交易記錄
  trades: Array<{
    timestamp: string
    action: string
    price: number
    quantity: number
    commission: number
    slippage: number
    capital: number
    signal_strength: number
    pnl: number
  }>
  
  // 策略特定結果
  strategy_metrics: Record<string, any>
}

// ===== 參數優化接口 =====

export interface ParameterRange {
  name: string
  min_value: number
  max_value: number
  step?: number
  values?: any[]
  dtype: 'float' | 'int' | 'bool' | 'choice'
}

export interface OptimizationConfig {
  method: 'grid_search' | 'genetic_algorithm' | 'random_search' | 'bayesian_optimization'
  parameter_ranges: Record<string, ParameterRange>
  objective_function: 'total_return' | 'sharpe_ratio' | 'calmar_ratio' | 'profit_factor'
  maximize: boolean
  max_evaluations: number
  parallel_workers: number
  timeout_seconds: number
  early_stopping: boolean
  early_stopping_patience: number
  
  // 遺傳算法參數
  genetic_algorithm_params?: {
    population_size: number
    mutation_rate: number
    crossover_rate: number
    elitism_rate: number
    max_generations: number
  }
  
  // 貝葉斯優化參數
  bayesian_params?: {
    acquisition_function: string
    n_initial_points: number
    alpha: number
  }
}

export interface OptimizationResult {
  best_parameters: Record<string, any>
  best_score: number
  best_backtest_result: EnhancedBacktestResult
  all_results: Array<{
    parameters: Record<string, any>
    score: number
    result: EnhancedBacktestResult
  }>
  optimization_history: number[]
  convergence_info: Record<string, any>
  total_evaluations: number
  execution_time: number
  method_used: string
}

// ===== 回測進度跟蹤 =====

export interface BacktestProgress {
  backtest_id: string
  status: 'not_started' | 'running' | 'completed' | 'failed'
  progress_percentage: number
  current_step: string
  steps_completed: number
  total_steps: number
  start_time: string
  estimated_completion?: string
  error_message?: string
}

export interface BacktestSummary {
  id: string
  strategy_name: string
  symbol: string
  timeframe: string
  start_date: string
  end_date: string
  status: 'completed' | 'running' | 'failed'
  final_return?: number
  sharpe_ratio?: number
  max_drawdown?: number
  created_at: string
  updated_at: string
}

// ===== 增強型回測API服務 =====

export class EnhancedBacktestAPIService {
  
  // ===== 回測管理 =====
  
  static async createBacktest(config: EnhancedBacktestConfig): Promise<string> {
    if (tauriApiService()) {
      return await invoke('create_enhanced_backtest', { config })
    } else {
      // 模擬API調用
      return await this.mockCreateBacktest(config)
    }
  }
  
  static async startBacktest(id: string): Promise<boolean> {
    if (tauriApiService()) {
      return await invoke('start_enhanced_backtest', { id })
    } else {
      return await this.mockStartBacktest(id)
    }
  }
  
  static async stopBacktest(id: string): Promise<boolean> {
    if (tauriApiService()) {
      return await invoke('stop_enhanced_backtest', { id })
    } else {
      return await this.mockStopBacktest(id)
    }
  }
  
  static async deleteBacktest(id: string): Promise<boolean> {
    if (tauriApiService()) {
      return await invoke('delete_enhanced_backtest', { id })
    } else {
      return await this.mockDeleteBacktest(id)
    }
  }
  
  // ===== 配置管理 =====
  
  static async getBacktestConfig(id: string): Promise<EnhancedBacktestConfig> {
    if (tauriApiService()) {
      return await invoke('get_enhanced_backtest_config', { id })
    } else {
      return await this.mockGetBacktestConfig(id)
    }
  }
  
  static async updateBacktestConfig(id: string, config: Partial<EnhancedBacktestConfig>): Promise<boolean> {
    if (tauriApiService()) {
      return await invoke('update_enhanced_backtest_config', { id, config })
    } else {
      return await this.mockUpdateBacktestConfig(id, config)
    }
  }
  
  // ===== 結果查詢 =====
  
  static async getBacktestResult(id: string): Promise<EnhancedBacktestResult> {
    if (tauriApiService()) {
      return await invoke('get_enhanced_backtest_result', { id })
    } else {
      return await this.mockGetBacktestResult(id)
    }
  }
  
  static async getBacktestProgress(id: string): Promise<BacktestProgress> {
    if (tauriApiService()) {
      return await invoke('get_enhanced_backtest_progress', { id })
    } else {
      return await this.mockGetBacktestProgress(id)
    }
  }
  
  // ===== 批量操作 =====
  
  static async listBacktests(filters?: Record<string, any>): Promise<BacktestSummary[]> {
    if (tauriApiService()) {
      return await invoke('list_enhanced_backtests', { filters })
    } else {
      return await this.mockListBacktests(filters)
    }
  }
  
  static async compareBacktests(ids: string[]): Promise<{
    comparison_table: Record<string, any>[]
    charts_data: Record<string, any>
    statistical_tests: Record<string, any>
  }> {
    if (tauriApiService()) {
      return await invoke('compare_enhanced_backtests', { ids })
    } else {
      return await this.mockCompareBacktests(ids)
    }
  }
  
  // ===== 參數優化 =====
  
  static async startOptimization(
    base_config: EnhancedBacktestConfig, 
    optimization_config: OptimizationConfig
  ): Promise<string> {
    if (tauriApiService()) {
      return await invoke('start_parameter_optimization', { base_config, optimization_config })
    } else {
      return await this.mockStartOptimization(base_config, optimization_config)
    }
  }
  
  static async getOptimizationResult(optimization_id: string): Promise<OptimizationResult> {
    if (tauriApiService()) {
      return await invoke('get_optimization_result', { optimization_id })
    } else {
      return await this.mockGetOptimizationResult(optimization_id)
    }
  }
  
  static async getOptimizationProgress(optimization_id: string): Promise<{
    status: string
    progress_percentage: number
    evaluations_completed: number
    total_evaluations: number
    best_score_so_far?: number
    estimated_completion?: string
  }> {
    if (tauriApiService()) {
      return await invoke('get_optimization_progress', { optimization_id })
    } else {
      return await this.mockGetOptimizationProgress(optimization_id)
    }
  }
  
  // ===== 策略管理 =====
  
  static async getAvailableStrategies(): Promise<Array<{
    id: string
    name: string
    description: string
    parameters: Record<string, any>
    status: string
  }>> {
    if (tauriApiService()) {
      return await invoke('get_available_strategies')
    } else {
      return await this.mockGetAvailableStrategies()
    }
  }
  
  static async validateStrategyConfig(config: EnhancedBacktestConfig): Promise<{
    valid: boolean
    warnings: string[]
    errors: string[]
  }> {
    if (tauriApiService()) {
      return await invoke('validate_strategy_config', { config })
    } else {
      return await this.mockValidateStrategyConfig(config)
    }
  }
  
  // ===== 數據管理 =====
  
  static async getHistoricalData(
    symbol: string, 
    timeframe: string, 
    start: string, 
    end: string
  ): Promise<Array<{
    timestamp: string
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>> {
    if (tauriApiService()) {
      return await invoke('get_historical_data', { symbol, timeframe, start, end })
    } else {
      return await this.mockGetHistoricalData(symbol, timeframe, start, end)
    }
  }
  
  static async exportBacktestData(id: string, format: 'csv' | 'json' | 'excel'): Promise<string> {
    if (tauriApiService()) {
      return await invoke('export_backtest_data', { id, format })
    } else {
      return await this.mockExportBacktestData(id, format)
    }
  }
  
  // ===== 模擬API實現 =====
  
  private static async mockCreateBacktest(config: EnhancedBacktestConfig): Promise<string> {
    await this.delay(500)
    const id = `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('[Mock] Created enhanced backtest:', id, config)
    return id
  }
  
  private static async mockStartBacktest(id: string): Promise<boolean> {
    await this.delay(300)
    console.log('[Mock] Started enhanced backtest:', id)
    return true
  }
  
  private static async mockStopBacktest(id: string): Promise<boolean> {
    await this.delay(200)
    console.log('[Mock] Stopped enhanced backtest:', id)
    return true
  }
  
  private static async mockDeleteBacktest(id: string): Promise<boolean> {
    await this.delay(200)
    console.log('[Mock] Deleted enhanced backtest:', id)
    return true
  }
  
  private static async mockGetBacktestConfig(id: string): Promise<EnhancedBacktestConfig> {
    await this.delay(300)
    
    return {
      strategy_type: 'dynamic_position',
      symbol: 'BTCUSDT',
      timeframe: '1h',
      start_date: '2024-01-01',
      end_date: '2024-07-31',
      initial_capital: 10000,
      commission: 0.001,
      slippage: 0.0001,
      strategy_params: {
        dynamic_position: {
          risk_mode: 'balanced',
          leverage_config: {
            max_leverage: 3.0,
            leverage_usage_rate: 0.8,
            dynamic_leverage: true
          },
          indicator_weights: {
            valuation_weight: 0.34,
            risk_adjusted_weight: 0.33,
            fundamental_weight: 0.33
          },
          thresholds: {
            buy_start_percentile: 20.0,
            sell_start_percentile: 80.0,
            min_buy_ratio: 0.1,
            max_buy_ratio: 0.8
          }
        }
      },
      risk_params: {
        max_position_size: 1.0,
        stop_loss: 0.05,
        take_profit: 0.10,
        max_drawdown: 0.15,
        risk_per_trade: 0.02
      },
      leverage_enabled: true,
      max_leverage: 3.0,
      leverage_config: {},
      optimization_enabled: false,
      optimization_params: {}
    }
  }
  
  private static async mockUpdateBacktestConfig(id: string, config: Partial<EnhancedBacktestConfig>): Promise<boolean> {
    await this.delay(200)
    console.log('[Mock] Updated backtest config:', id, config)
    return true
  }
  
  private static async mockGetBacktestResult(id: string): Promise<EnhancedBacktestResult> {
    await this.delay(1500) // 模擬回測計算時間
    
    // 生成模擬數據
    const days = 180
    const equityCurve = []
    const dailyReturns = []
    let currentEquity = 10000
    
    for (let i = 0; i < days; i++) {
      const dailyReturn = (Math.random() - 0.45) * 0.04 // 略微正偏的收益分佈
      dailyReturns.push(dailyReturn)
      currentEquity *= (1 + dailyReturn)
      equityCurve.push(currentEquity)
    }
    
    const totalReturn = (currentEquity - 10000) / 10000
    const sharpeRatio = this.calculateSharpeRatio(dailyReturns)
    const maxDrawdown = this.calculateMaxDrawdown(equityCurve)
    
    return {
      strategy_name: '動態倉位策略 - 平衡型',
      start_date: '2024-01-01',
      end_date: '2024-07-31',
      initial_capital: 10000,
      final_capital: currentEquity,
      total_trades: Math.floor(Math.random() * 100) + 50,
      winning_trades: Math.floor(Math.random() * 40) + 30,
      losing_trades: Math.floor(Math.random() * 30) + 15,
      total_pnl: currentEquity - 10000,
      total_return: totalReturn,
      annual_return: Math.pow(1 + totalReturn, 365 / days) - 1,
      max_drawdown: maxDrawdown,
      sharpe_ratio: sharpeRatio,
      sortino_ratio: sharpeRatio * 1.2,
      volatility: Math.sqrt(dailyReturns.reduce((sum, r) => sum + r * r, 0) / dailyReturns.length) * Math.sqrt(252),
      
      leverage_stats: {
        max_leverage_used: 2.8,
        avg_leverage_used: 2.1,
        leverage_efficiency: 0.70,
        utilization: 0.85,
        volatility: 0.3
      },
      
      var_95: -0.035,
      cvar_95: -0.048,
      calmar_ratio: totalReturn / Math.abs(maxDrawdown),
      omega_ratio: 1.25,
      
      trade_analysis: {
        total_trades: 75,
        profitable_trades: 48,
        losing_trades: 27,
        win_rate: 0.64,
        avg_profit: 185.50,
        avg_loss: -95.30,
        profit_factor: 2.18,
        largest_win: 450.80,
        largest_loss: -180.25
      },
      
      daily_returns: dailyReturns,
      monthly_returns: this.calculateMonthlyReturns(dailyReturns),
      equity_curve: equityCurve,
      drawdown_periods: [
        {
          start_date: '2024-02-15',
          end_date: '2024-03-10',
          duration_days: 23,
          max_drawdown: 0.085,
          recovery_date: '2024-03-15'
        }
      ],
      
      trades: this.generateMockTrades(),
      strategy_metrics: {
        indicator_performance: {
          rsi_accuracy: 0.72,
          bollinger_accuracy: 0.68,
          ma_deviation_accuracy: 0.65
        },
        leverage_utilization: {
          avg_leverage: 2.1,
          max_leverage: 2.8,
          efficiency_score: 0.85
        }
      }
    }
  }
  
  private static async mockGetBacktestProgress(id: string): Promise<BacktestProgress> {
    await this.delay(200)
    
    // 模擬不同階段的進度
    const stages = [
      { step: '數據準備', percentage: 15 },
      { step: '策略初始化', percentage: 25 },
      { step: '回測執行', percentage: 85 },
      { step: '結果分析', percentage: 95 },
      { step: '報告生成', percentage: 100 }
    ]
    
    const randomStage = stages[Math.floor(Math.random() * stages.length)]
    
    return {
      backtest_id: id,
      status: randomStage.percentage === 100 ? 'completed' : 'running',
      progress_percentage: randomStage.percentage,
      current_step: randomStage.step,
      steps_completed: Math.floor(randomStage.percentage / 20),
      total_steps: 5,
      start_time: new Date(Date.now() - 60000).toISOString(),
      estimated_completion: randomStage.percentage < 100 ? 
        new Date(Date.now() + (100 - randomStage.percentage) * 1000).toISOString() : 
        undefined
    }
  }
  
  private static async mockListBacktests(filters?: Record<string, any>): Promise<BacktestSummary[]> {
    await this.delay(400)
    
    return [
      {
        id: 'backtest_001',
        strategy_name: '動態倉位策略 - 保守型',
        symbol: 'BTCUSDT',
        timeframe: '1h',
        start_date: '2024-01-01',
        end_date: '2024-06-30',
        status: 'completed',
        final_return: 0.156,
        sharpe_ratio: 1.42,
        max_drawdown: 0.078,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T06:30:00Z'
      },
      {
        id: 'backtest_002',
        strategy_name: 'SMA交叉策略 10/30',
        symbol: 'ETHUSDT',
        timeframe: '4h',
        start_date: '2024-02-01',
        end_date: '2024-07-31',
        status: 'completed',
        final_return: 0.092,
        sharpe_ratio: 0.98,
        max_drawdown: 0.125,
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T04:15:00Z'
      }
    ]
  }
  
  private static async mockCompareBacktests(ids: string[]): Promise<any> {
    await this.delay(800)
    
    return {
      comparison_table: [
        {
          metric: 'Total Return',
          backtest_001: '15.6%',
          backtest_002: '9.2%',
          difference: '+6.4%'
        },
        {
          metric: 'Sharpe Ratio',
          backtest_001: '1.42',
          backtest_002: '0.98',
          difference: '+0.44'
        }
      ],
      charts_data: {
        equity_curves: [
          { date: '2024-01', backtest_001: 10000, backtest_002: 10000 },
          { date: '2024-02', backtest_001: 10250, backtest_002: 10120 }
        ]
      },
      statistical_tests: {
        t_test_p_value: 0.032,
        is_significantly_different: true
      }
    }
  }
  
  private static async mockStartOptimization(
    base_config: EnhancedBacktestConfig, 
    optimization_config: OptimizationConfig
  ): Promise<string> {
    await this.delay(600)
    const optimization_id = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('[Mock] Started optimization:', optimization_id, { base_config, optimization_config })
    return optimization_id
  }
  
  private static async mockGetOptimizationResult(optimization_id: string): Promise<OptimizationResult> {
    await this.delay(2000)
    
    return {
      best_parameters: {
        'max_leverage': 2.5,
        'strategy_params.risk_mode': 'balanced',
        'risk_params.stop_loss': 0.04,
        'risk_params.take_profit': 0.08
      },
      best_score: 1.68,
      best_backtest_result: await this.mockGetBacktestResult('best_result'),
      all_results: [],
      optimization_history: [0.85, 1.12, 1.35, 1.52, 1.68],
      convergence_info: {
        method: 'grid_search',
        total_combinations: 120
      },
      total_evaluations: 120,
      execution_time: 3600,
      method_used: 'grid_search'
    }
  }
  
  private static async mockGetOptimizationProgress(optimization_id: string): Promise<any> {
    await this.delay(300)
    
    return {
      status: 'running',
      progress_percentage: Math.floor(Math.random() * 80) + 10,
      evaluations_completed: Math.floor(Math.random() * 80) + 5,
      total_evaluations: 100,
      best_score_so_far: 1.45,
      estimated_completion: new Date(Date.now() + 1800000).toISOString()
    }
  }
  
  private static async mockGetAvailableStrategies(): Promise<any[]> {
    await this.delay(300)
    
    return [
      {
        id: 'sma_crossover',
        name: 'SMA交叉策略',
        description: '基於簡單移動平均線交叉的經典策略',
        parameters: {
          fast_period: { type: 'int', default: 10, range: [5, 50] },
          slow_period: { type: 'int', default: 20, range: [10, 100] },
          signal_threshold: { type: 'float', default: 0.001, range: [0.0001, 0.01] }
        },
        status: 'available'
      },
      {
        id: 'dynamic_position',
        name: '動態倉位策略 - 杠桿版',
        description: '基於多指標綜合分析的智能杠桿交易策略',
        parameters: {
          risk_mode: { type: 'enum', options: ['conservative', 'balanced', 'aggressive'] },
          max_leverage: { type: 'float', default: 3.0, range: [1.0, 10.0] },
          leverage_usage_rate: { type: 'float', default: 0.8, range: [0.1, 1.0] }
        },
        status: 'available'
      }
    ]
  }
  
  private static async mockValidateStrategyConfig(config: EnhancedBacktestConfig): Promise<any> {
    await this.delay(400)
    
    const warnings = []
    const errors = []
    
    if (config.leverage_enabled && config.max_leverage > 5.0) {
      warnings.push('高杠桿交易風險較大，建議謹慎使用')
    }
    
    if (config.initial_capital < 1000) {
      warnings.push('初始資金較少，可能影響策略表現')
    }
    
    return {
      valid: errors.length === 0,
      warnings,
      errors
    }
  }
  
  private static async mockGetHistoricalData(
    symbol: string, 
    timeframe: string, 
    start: string, 
    end: string
  ): Promise<any[]> {
    await this.delay(800)
    
    // 生成模擬歷史數據
    const startDate = new Date(start)
    const endDate = new Date(end)
    const data = []
    
    let currentDate = new Date(startDate)
    let currentPrice = 50000 // 起始價格
    
    while (currentDate <= endDate) {
      const change = (Math.random() - 0.5) * 0.04 // ±2% 隨機變化
      const open = currentPrice
      const close = open * (1 + change)
      const high = Math.max(open, close) * (1 + Math.random() * 0.01)
      const low = Math.min(open, close) * (1 - Math.random() * 0.01)
      const volume = Math.random() * 10000 + 1000
      
      data.push({
        timestamp: currentDate.toISOString(),
        open,
        high,
        low,
        close,
        volume
      })
      
      currentPrice = close
      
      // 增加時間間隔
      if (timeframe === '1h') {
        currentDate.setHours(currentDate.getHours() + 1)
      } else if (timeframe === '1d') {
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
    
    return data
  }
  
  private static async mockExportBacktestData(id: string, format: string): Promise<string> {
    await this.delay(1000)
    const filename = `backtest_${id}_${Date.now()}.${format}`
    console.log('[Mock] Exported backtest data:', filename)
    return filename
  }
  
  // ===== 輔助方法 =====
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  private static calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length
    const stdDev = Math.sqrt(variance)
    return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0
  }
  
  private static calculateMaxDrawdown(equityCurve: number[]): number {
    let maxDrawdown = 0
    let peak = equityCurve[0]
    
    for (const value of equityCurve) {
      if (value > peak) {
        peak = value
      }
      const drawdown = (peak - value) / peak
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }
    
    return maxDrawdown
  }
  
  private static calculateMonthlyReturns(dailyReturns: number[]): number[] {
    // 簡化實現：每30天為一個月
    const monthlyReturns = []
    for (let i = 0; i < dailyReturns.length; i += 30) {
      const monthData = dailyReturns.slice(i, i + 30)
      const monthReturn = monthData.reduce((prod, r) => prod * (1 + r), 1) - 1
      monthlyReturns.push(monthReturn)
    }
    return monthlyReturns
  }
  
  private static generateMockTrades(): Array<any> {
    const trades = []
    let timestamp = new Date('2024-01-01')
    let capital = 10000
    
    for (let i = 0; i < 20; i++) {
      const isProfit = Math.random() > 0.4
      const pnl = isProfit ? 
        Math.random() * 200 + 50 : 
        -(Math.random() * 100 + 20)
      
      capital += pnl
      
      trades.push({
        timestamp: timestamp.toISOString(),
        action: Math.random() > 0.5 ? '買入' : '賣出',
        price: 50000 + Math.random() * 10000 - 5000,
        quantity: Math.random() * 0.1 + 0.01,
        commission: Math.abs(pnl) * 0.001,
        slippage: Math.abs(pnl) * 0.0001,
        capital,
        signal_strength: Math.random() * 0.5 + 0.5,
        pnl
      })
      
      timestamp.setDate(timestamp.getDate() + Math.floor(Math.random() * 7) + 1)
    }
    
    return trades
  }
}

// ===== 默認配置生成器 =====

export const createDefaultEnhancedBacktestConfig = (
  strategy_type: 'sma_crossover' | 'dynamic_position' = 'dynamic_position'
): EnhancedBacktestConfig => {
  const baseConfig: EnhancedBacktestConfig = {
    strategy_type,
    symbol: 'BTCUSDT',
    timeframe: '1h',
    start_date: '2024-01-01',
    end_date: '2024-07-31',
    initial_capital: 10000,
    commission: 0.001,
    slippage: 0.0001,
    strategy_params: {},
    risk_params: {
      max_position_size: 1.0,
      stop_loss: 0.05,
      take_profit: 0.10,
      max_drawdown: 0.15,
      risk_per_trade: 0.02
    },
    leverage_enabled: false,
    max_leverage: 1.0,
    leverage_config: {},
    optimization_enabled: false,
    optimization_params: {}
  }
  
  if (strategy_type === 'sma_crossover') {
    baseConfig.strategy_params.sma_crossover = {
      fast_period: 10,
      slow_period: 20,
      signal_threshold: 0.001
    }
  } else if (strategy_type === 'dynamic_position') {
    baseConfig.leverage_enabled = true
    baseConfig.max_leverage = 3.0
    baseConfig.strategy_params.dynamic_position = {
      risk_mode: 'balanced',
      leverage_config: {
        max_leverage: 3.0,
        leverage_usage_rate: 0.8,
        dynamic_leverage: true
      },
      indicator_weights: {
        valuation_weight: 0.34,
        risk_adjusted_weight: 0.33,
        fundamental_weight: 0.33
      },
      thresholds: {
        buy_start_percentile: 20.0,
        sell_start_percentile: 80.0,
        min_buy_ratio: 0.1,
        max_buy_ratio: 0.8
      }
    }
  }
  
  return baseConfig
}

export const createDefaultOptimizationConfig = (
  strategy_type: 'sma_crossover' | 'dynamic_position' = 'dynamic_position'
): OptimizationConfig => {
  const baseConfig: OptimizationConfig = {
    method: 'grid_search',
    parameter_ranges: {},
    objective_function: 'sharpe_ratio',
    maximize: true,
    max_evaluations: 100,
    parallel_workers: 4,
    timeout_seconds: 3600,
    early_stopping: true,
    early_stopping_patience: 20
  }
  
  if (strategy_type === 'sma_crossover') {
    baseConfig.parameter_ranges = {
      'strategy_params.sma_crossover.fast_period': {
        name: 'strategy_params.sma_crossover.fast_period',
        min_value: 5,
        max_value: 25,
        step: 1,
        dtype: 'int'
      },
      'strategy_params.sma_crossover.slow_period': {
        name: 'strategy_params.sma_crossover.slow_period',
        min_value: 20,
        max_value: 100,
        step: 5,
        dtype: 'int'
      }
    }
  } else if (strategy_type === 'dynamic_position') {
    baseConfig.parameter_ranges = {
      'max_leverage': {
        name: 'max_leverage',
        min_value: 1.0,
        max_value: 5.0,
        step: 0.5,
        dtype: 'float'
      },
      'strategy_params.dynamic_position.risk_mode': {
        name: 'strategy_params.dynamic_position.risk_mode',
        min_value: 0,
        max_value: 0,
        values: ['conservative', 'balanced', 'aggressive'],
        dtype: 'choice'
      }
    }
  }
  
  return baseConfig
}