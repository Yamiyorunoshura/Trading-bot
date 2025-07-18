/**
 * 交易系統服務接口
 * 整合第二階段開發的交易執行系統
 */

import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'

// 訂單相關接口
export interface Order {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop_loss' | 'take_profit'
  quantity: number
  price?: number
  leverage: number
  status: 'pending' | 'partial' | 'filled' | 'cancelled' | 'failed'
  filled_quantity?: number
  filled_price?: number
  created_at: string
  updated_at?: string
  exchange_order_id?: string
  metadata?: Record<string, any>
}

// 持倉相關接口
export interface Position {
  symbol: string
  side: 'buy' | 'sell'
  size: number
  entry_price: number
  current_price: number
  leverage: number
  unrealized_pnl: number
  realized_pnl: number
  margin_used: number
  created_at: string
  updated_at?: string
}

// 賬戶相關接口
export interface Account {
  total_equity: number
  available_balance: number
  used_margin: number
  unrealized_pnl: number
  realized_pnl: number
  positions: Record<string, Position>
}

// 交易狀態接口
export interface TradingStatus {
  state: 'stopped' | 'starting' | 'running' | 'paused' | 'emergency'
  start_time?: string
  uptime?: string
  processed_signals: number
  executed_orders: number
  failed_orders: number
  last_update?: string
}

// 風險指標接口
export interface RiskMetrics {
  total_equity: number
  leverage_ratio: number
  current_drawdown: number
  max_drawdown: number
  position_count: number
  largest_position_ratio: number
  liquidity_score: number
  portfolio_correlation: number
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
}

// 風險警報接口
export interface RiskAlert {
  type: 'leverage_warning' | 'drawdown_warning' | 'position_limit' | 'margin_call' | 'stop_loss' | 'take_profit' | 'liquidity_risk' | 'correlation_risk'
  level: 'low' | 'medium' | 'high' | 'critical'
  message: string
  symbol?: string
  current_value?: number
  threshold?: number
  timestamp: string
  resolved: boolean
}

// 動態倉位策略配置接口
export interface DynamicPositionConfig {
  name: string
  symbol: string
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
  trading_config: {
    buy_threshold: number
    sell_threshold: number
    position_size_base: number
    max_position_count: number
  }
  risk_management: {
    stop_loss_percent: number
    take_profit_percent: number
    max_drawdown_percent: number
    daily_loss_limit: number
  }
}

// 策略性能指標接口
export interface StrategyPerformance {
  total_return: number
  return_percentage: number
  sharpe_ratio: number
  max_drawdown: number
  win_rate: number
  profit_factor: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  average_win: number
  average_loss: number
  volatility: number
  start_date: string
  end_date: string
}

// 市場數據接口
export interface MarketData {
  symbol: string
  price: number
  volume: number
  timestamp: number
  bid?: number
  ask?: number
  high_24h?: number
  low_24h?: number
  change_24h?: number
}

// 交易信號接口
export interface TradingSignal {
  symbol: string
  signal_type: 'buy' | 'sell' | 'hold'
  strength: number
  price: number
  timestamp: string
  metadata?: Record<string, any>
}

// 執行狀態接口
export interface ExecutionStatus {
  account: Account
  orders: {
    total_orders: number
    pending_orders: number
    filled_orders: number
    failed_orders: number
  }
  statistics: {
    total_orders: number
    successful_orders: number
    failed_orders: number
    total_volume: number
    total_fees: number
  }
  risk_status: {
    position_ratio: number
    leverage_usage: number
    drawdown: number
    risk_level: string
  }
}

// 系統狀態接口
export interface SystemStatus {
  trading_status: TradingStatus
  execution_status: ExecutionStatus
  risk_metrics: RiskMetrics
  active_alerts: RiskAlert[]
  market_data: Record<string, MarketData>
}

// 交易系統API類
export class TradingSystemAPI {
  
  // 獲取交易系統狀態
  static async getSystemStatus(): Promise<SystemStatus> {
    return await invoke('get_trading_system_status')
  }
  
  // 啟動交易系統
  static async startTrading(): Promise<boolean> {
    return await invoke('start_trading_system')
  }
  
  // 停止交易系統
  static async stopTrading(): Promise<boolean> {
    return await invoke('stop_trading_system')
  }
  
  // 暫停交易
  static async pauseTrading(): Promise<boolean> {
    return await invoke('pause_trading')
  }
  
  // 恢復交易
  static async resumeTrading(): Promise<boolean> {
    return await invoke('resume_trading')
  }
  
  // 緊急停止
  static async emergencyStop(): Promise<boolean> {
    return await invoke('emergency_stop')
  }
  
  // 獲取策略配置
  static async getStrategyConfig(): Promise<DynamicPositionConfig> {
    return await invoke('get_strategy_config')
  }
  
  // 更新策略配置
  static async updateStrategyConfig(config: DynamicPositionConfig): Promise<boolean> {
    return await invoke('update_strategy_config', { config })
  }
  
  // 獲取賬戶信息
  static async getAccountInfo(): Promise<Account> {
    return await invoke('get_account_info')
  }
  
  // 獲取持倉信息
  static async getPositions(): Promise<Record<string, Position>> {
    return await invoke('get_positions')
  }
  
  // 獲取訂單歷史
  static async getOrderHistory(limit?: number): Promise<Order[]> {
    return await invoke('get_order_history', { limit })
  }
  
  // 手動下單
  static async placeOrder(order: Partial<Order>): Promise<Order> {
    return await invoke('place_manual_order', { order })
  }
  
  // 取消訂單
  static async cancelOrder(orderId: string): Promise<boolean> {
    return await invoke('cancel_order', { orderId })
  }
  
  // 平倉
  static async closePosition(symbol: string): Promise<boolean> {
    return await invoke('close_position', { symbol })
  }
  
  // 平倉所有持倉
  static async closeAllPositions(): Promise<number> {
    return await invoke('close_all_positions')
  }
  
  // 獲取策略性能指標
  static async getStrategyPerformance(): Promise<StrategyPerformance> {
    return await invoke('get_strategy_performance')
  }
  
  // 獲取風險指標
  static async getRiskMetrics(): Promise<RiskMetrics> {
    return await invoke('get_risk_metrics')
  }
  
  // 獲取風險警報
  static async getRiskAlerts(): Promise<RiskAlert[]> {
    return await invoke('get_risk_alerts')
  }
  
  // 解決風險警報
  static async resolveRiskAlert(alertId: string): Promise<boolean> {
    return await invoke('resolve_risk_alert', { alertId })
  }
  
  // 獲取市場數據
  static async getMarketData(symbol: string): Promise<MarketData> {
    return await invoke('get_market_data', { symbol })
  }
  
  // 獲取交易信號
  static async getTradingSignals(symbol: string, limit?: number): Promise<TradingSignal[]> {
    return await invoke('get_trading_signals', { symbol, limit })
  }
  
  // 獲取歷史性能數據
  static async getHistoricalPerformance(hours: number = 24): Promise<any[]> {
    return await invoke('get_historical_performance', { hours })
  }
  
  // 獲取回測結果
  static async runBacktest(config: DynamicPositionConfig, startDate: string, endDate: string): Promise<any> {
    return await invoke('run_backtest', { config, startDate, endDate })
  }
  
  // 驗證策略配置
  static async validateStrategyConfig(config: DynamicPositionConfig): Promise<boolean> {
    return await invoke('validate_strategy_config', { config })
  }
  
  // 重置系統
  static async resetSystem(): Promise<boolean> {
    return await invoke('reset_trading_system')
  }
  
  // 導出交易數據
  static async exportTradingData(format: 'csv' | 'json' = 'csv'): Promise<string> {
    return await invoke('export_trading_data', { format })
  }
  
  // 導入策略配置
  static async importStrategyConfig(configData: string): Promise<DynamicPositionConfig> {
    return await invoke('import_strategy_config', { configData })
  }
}

// 交易系統事件監聽器
export class TradingSystemEventListener {
  
  // 監聽交易狀態變化
  static async onTradingStatusChange(callback: (status: TradingStatus) => void) {
    return await listen('trading_status_changed', (event) => {
      callback(event.payload as TradingStatus)
    })
  }
  
  // 監聽訂單執行
  static async onOrderExecuted(callback: (order: Order) => void) {
    return await listen('order_executed', (event) => {
      callback(event.payload as Order)
    })
  }
  
  // 監聽持倉更新
  static async onPositionUpdated(callback: (position: Position) => void) {
    return await listen('position_updated', (event) => {
      callback(event.payload as Position)
    })
  }
  
  // 監聽風險警報
  static async onRiskAlert(callback: (alert: RiskAlert) => void) {
    return await listen('risk_alert', (event) => {
      callback(event.payload as RiskAlert)
    })
  }
  
  // 監聽市場數據更新
  static async onMarketDataUpdate(callback: (data: MarketData) => void) {
    return await listen('market_data_updated', (event) => {
      callback(event.payload as MarketData)
    })
  }
  
  // 監聽交易信號
  static async onTradingSignal(callback: (signal: TradingSignal) => void) {
    return await listen('trading_signal', (event) => {
      callback(event.payload as TradingSignal)
    })
  }
  
  // 監聽系統錯誤
  static async onSystemError(callback: (error: { message: string; timestamp: string }) => void) {
    return await listen('system_error', (event) => {
      callback(event.payload as { message: string; timestamp: string })
    })
  }
}

// 交易系統工具函數
export class TradingSystemUtils {
  
  // 格式化價格
  static formatPrice(price: number, precision: number = 2): string {
    return price.toFixed(precision)
  }
  
  // 格式化百分比
  static formatPercentage(value: number, precision: number = 2): string {
    return `${(value * 100).toFixed(precision)}%`
  }
  
  // 格式化時間
  static formatTime(timestamp: string | number): string {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  // 計算盈虧顏色
  static getPnlColor(pnl: number): string {
    if (pnl > 0) return '#52c41a'
    if (pnl < 0) return '#f5222d'
    return '#666666'
  }
  
  // 計算風險等級顏色
  static getRiskLevelColor(level: string): string {
    switch (level) {
      case 'low': return '#52c41a'
      case 'medium': return '#faad14'
      case 'high': return '#fa8c16'
      case 'critical': return '#f5222d'
      default: return '#666666'
    }
  }
  
  // 計算風險等級圖標
  static getRiskLevelIcon(level: string): string {
    switch (level) {
      case 'low': return '🟢'
      case 'medium': return '🟡'
      case 'high': return '🟠'
      case 'critical': return '🔴'
      default: return '⚪'
    }
  }
  
  // 驗證交易參數
  static validateTradingParams(params: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!params.symbol || typeof params.symbol !== 'string') {
      errors.push('交易對不能為空')
    }
    
    if (!params.quantity || params.quantity <= 0) {
      errors.push('交易數量必須大於0')
    }
    
    if (params.leverage && (params.leverage < 1 || params.leverage > 10)) {
      errors.push('杠桿倍數必須在1-10之間')
    }
    
    if (params.price && params.price <= 0) {
      errors.push('價格必須大於0')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  // 計算保證金
  static calculateMargin(quantity: number, price: number, leverage: number): number {
    return (quantity * price) / leverage
  }
  
  // 計算盈虧
  static calculatePnl(side: string, entryPrice: number, currentPrice: number, quantity: number): number {
    if (side === 'buy') {
      return (currentPrice - entryPrice) * quantity
    } else {
      return (entryPrice - currentPrice) * quantity
    }
  }
  
  // 計算收益率
  static calculateReturnRate(pnl: number, initialCapital: number): number {
    return pnl / initialCapital
  }
}

export default TradingSystemAPI