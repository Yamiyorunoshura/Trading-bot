/**
 * 交易系統服務接口
 * 整合第二階段開發的交易執行系統
 */

import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'

// 檢查是否在Tauri環境中運行
const isTauriAvailable = () => {
  return typeof window !== 'undefined' && window.__TAURI_IPC__;
}

// 模擬數據生成器
const generateMockData = () => {
  const mockSystemStatus = {
    trading_status: {
      state: 'running' as const,
      start_time: new Date().toISOString(),
      uptime: '2h 15m',
      processed_signals: 156,
      executed_orders: 23,
      failed_orders: 1,
      last_update: new Date().toISOString()
    },
    execution_status: {
      account: {
        total_equity: 12500.50,
        available_balance: 8500.25,
        used_margin: 4000.25,
        unrealized_pnl: 1250.75,
        realized_pnl: 850.50,
        positions: {}
      },
      orders: {
        total_orders: 45,
        pending_orders: 2,
        filled_orders: 42,
        failed_orders: 1
      },
      statistics: {
        total_orders: 45,
        successful_orders: 42,
        failed_orders: 1,
        total_volume: 125000.50,
        total_fees: 125.25
      },
      risk_status: {
        position_ratio: 0.32,
        leverage_usage: 0.15,
        drawdown: 0.08,
        risk_level: 'medium'
      }
    },
    risk_metrics: {
      total_equity: 12500.50,
      leverage_ratio: 0.15,
      current_drawdown: 0.08,
      max_drawdown: 0.12,
      position_count: 3,
      largest_position_ratio: 0.25,
      liquidity_score: 0.85,
      portfolio_correlation: 0.45,
      overall_risk_level: 'medium' as const,
      timestamp: new Date().toISOString()
    },
    active_alerts: [
      {
        type: 'leverage_warning' as const,
        level: 'medium' as const,
        message: '槓桿使用率接近限制',
        current_value: 0.15,
        threshold: 0.20,
        timestamp: new Date().toISOString(),
        resolved: false
      }
    ],
    market_data: {
      'BTCUSDT': {
        symbol: 'BTCUSDT',
        price: 43250.50,
        volume: 125000000,
        timestamp: Date.now(),
        bid: 43245.00,
        ask: 43255.00,
        high_24h: 43500.00,
        low_24h: 42800.00,
        change_24h: 2.85
      },
      'ETHUSDT': {
        symbol: 'ETHUSDT',
        price: 2850.75,
        volume: 85000000,
        timestamp: Date.now(),
        bid: 2848.00,
        ask: 2853.00,
        high_24h: 2900.00,
        low_24h: 2800.00,
        change_24h: -1.25
      }
    }
  };

  return mockSystemStatus;
};

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
    if (isTauriAvailable()) {
      return await invoke('get_trading_system_status')
    } else {
      // 返回模擬數據
      return generateMockData() as SystemStatus;
    }
  }
  
  // 啟動交易系統
  static async startTrading(): Promise<boolean> {
    if (isTauriAvailable()) {
      return await invoke('start_trading_system')
    } else {
      // 模擬成功
      return true;
    }
  }
  
  // 停止交易系統
  static async stopTrading(): Promise<boolean> {
    if (isTauriAvailable()) {
      return await invoke('stop_trading_system')
    } else {
      // 模擬成功
      return true;
    }
  }
  
  // 暫停交易系統
  static async pauseTrading(): Promise<boolean> {
    if (isTauriAvailable()) {
      return await invoke('pause_trading_system')
    } else {
      // 模擬成功
      return true;
    }
  }
  
  // 恢復交易系統
  static async resumeTrading(): Promise<boolean> {
    if (isTauriAvailable()) {
      return await invoke('resume_trading_system')
    } else {
      // 模擬成功
      return true;
    }
  }
  
  // 緊急停止
  static async emergencyStop(): Promise<boolean> {
    if (isTauriAvailable()) {
      return await invoke('emergency_stop')
    } else {
      // 模擬成功
      return true;
    }
  }
  
  // 獲取策略配置
  static async getStrategyConfig(): Promise<DynamicPositionConfig> {
    if (isTauriAvailable()) {
      return await invoke('get_strategy_config')
    } else {
      // 返回模擬配置
      return {
        name: '動態倉位策略',
        symbol: 'BTCUSDT',
        risk_mode: 'balanced',
        leverage_config: {
          max_leverage: 10,
          leverage_usage_rate: 0.15,
          dynamic_leverage: true
        },
        indicator_weights: {
          valuation_weight: 0.4,
          risk_adjusted_weight: 0.4,
          fundamental_weight: 0.2
        },
        trading_config: {
          buy_threshold: 0.6,
          sell_threshold: 0.4,
          position_size_base: 1000,
          max_position_count: 5
        },
        risk_management: {
          stop_loss_percent: 2.0,
          take_profit_percent: 4.0,
          max_drawdown_percent: 10.0,
          daily_loss_limit: 500
        }
      };
    }
  }
  
  // 更新策略配置
  static async updateStrategyConfig(config: DynamicPositionConfig): Promise<boolean> {
    if (isTauriAvailable()) {
      return await invoke('update_strategy_config', { config })
    } else {
      // 模擬成功
      return true;
    }
  }
  
  // 獲取賬戶信息
  static async getAccountInfo(): Promise<Account> {
    if (isTauriAvailable()) {
      return await invoke('get_account_info')
    } else {
      // 返回模擬數據
      const mockData = generateMockData();
      return mockData.execution_status.account;
    }
  }
  
  // 獲取持倉信息
  static async getPositions(): Promise<Record<string, Position>> {
    if (isTauriAvailable()) {
      return await invoke('get_positions')
    } else {
      // 返回模擬數據
      return {
        'BTCUSDT': {
          symbol: 'BTCUSDT',
          side: 'buy',
          size: 0.023,
          entry_price: 42800.00,
          current_price: 43250.50,
          leverage: 5,
          unrealized_pnl: 103.65,
          realized_pnl: 0,
          margin_used: 196.88,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
    }
  }
  
  // 獲取訂單歷史
  static async getOrderHistory(limit: number = 20): Promise<Order[]> {
    if (isTauriAvailable()) {
      return await invoke('get_order_history', { limit })
    } else {
      // 返回模擬數據
      return [
        {
          id: 'order_001',
          symbol: 'BTCUSDT',
          side: 'buy',
          type: 'market',
          quantity: 0.023,
          price: 43250.50,
          leverage: 5,
          status: 'filled',
          filled_quantity: 0.023,
          filled_price: 43250.50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
  }
  
  // 下單
  static async placeOrder(order: Partial<Order>): Promise<Order> {
    if (isTauriAvailable()) {
      return await invoke('place_order', { order })
    } else {
      // 模擬下單成功
      return {
        id: `order_${Date.now()}`,
        symbol: order.symbol || 'BTCUSDT',
        side: order.side || 'buy',
        type: order.type || 'market',
        quantity: order.quantity || 0.01,
        price: order.price || 43250.50,
        leverage: order.leverage || 1,
        status: 'filled',
        filled_quantity: order.quantity || 0.01,
        filled_price: order.price || 43250.50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Order;
    }
  }
  
  // 取消訂單
  static async cancelOrder(orderId: string): Promise<boolean> {
    if (isTauriAvailable()) {
      return await invoke('cancel_order', { orderId })
    } else {
      // 模擬成功
      return true;
    }
  }
  
  // 平倉
  static async closePosition(symbol: string): Promise<boolean> {
    if (isTauriAvailable()) {
      return await invoke('close_position', { symbol })
    } else {
      // 模擬成功
      return true;
    }
  }
  
  // 平掉所有持倉
  static async closeAllPositions(): Promise<number> {
    if (isTauriAvailable()) {
      return await invoke('close_all_positions')
    } else {
      // 模擬成功
      return 1;
    }
  }
  
  // 獲取策略性能
  static async getStrategyPerformance(): Promise<StrategyPerformance> {
    if (isTauriAvailable()) {
      return await invoke('get_strategy_performance')
    } else {
      // 返回模擬數據
      return {
        total_return: 1250.75,
        return_percentage: 10.0,
        sharpe_ratio: 1.85,
        max_drawdown: 0.08,
        win_rate: 0.68,
        profit_factor: 2.15,
        total_trades: 45,
        winning_trades: 31,
        losing_trades: 14,
        average_win: 85.50,
        average_loss: 35.25,
        volatility: 0.12,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      };
    }
  }
  
  // 獲取風險指標
  static async getRiskMetrics(): Promise<RiskMetrics> {
    if (isTauriAvailable()) {
      return await invoke('get_risk_metrics')
    } else {
      // 返回模擬數據
      const mockData = generateMockData();
      return mockData.risk_metrics;
    }
  }
  
  // 獲取風險警報
  static async getRiskAlerts(): Promise<RiskAlert[]> {
    if (isTauriAvailable()) {
      return await invoke('get_risk_alerts')
    } else {
      // 返回模擬數據
      const mockData = generateMockData();
      return mockData.active_alerts;
    }
  }
  
  // 解決風險警報
  static async resolveRiskAlert(alertId: string): Promise<boolean> {
    if (isTauriAvailable()) {
      return await invoke('resolve_risk_alert', { alertId })
    } else {
      // 模擬成功
      return true;
    }
  }
  
  // 獲取市場數據
  static async getMarketData(symbol: string): Promise<MarketData> {
    if (isTauriAvailable()) {
      return await invoke('get_market_data', { symbol })
    } else {
      // 返回模擬數據
      const mockData = generateMockData();
      const marketData = mockData.market_data as Record<string, MarketData>;
      return marketData[symbol] || {
        symbol,
        price: 43250.50,
        volume: 125000000,
        timestamp: Date.now(),
        bid: 43245.00,
        ask: 43255.00,
        high_24h: 43500.00,
        low_24h: 42800.00,
        change_24h: 2.85
      };
    }
  }
  
  // 獲取交易信號
  static async getTradingSignals(symbol: string, limit: number = 10): Promise<TradingSignal[]> {
    if (isTauriAvailable()) {
      return await invoke('get_trading_signals', { symbol, limit })
    } else {
      // 返回模擬數據
      return [
        {
          symbol,
          signal_type: 'buy',
          strength: 0.75,
          price: 43250.50,
          timestamp: new Date().toISOString(),
          metadata: { indicator: 'SMA_CROSS' }
        }
      ];
    }
  }
  
  // 獲取歷史性能數據
  static async getHistoricalPerformance(hours: number = 24): Promise<any[]> {
    if (isTauriAvailable()) {
      return await invoke('get_historical_performance', { hours })
    } else {
      // 返回模擬數據
      const data = [];
      const now = Date.now();
      for (let i = hours; i >= 0; i--) {
        data.push({
          time: new Date(now - i * 60 * 60 * 1000).toISOString(),
          equity: 10000 + Math.random() * 2500,
          pnl: (Math.random() - 0.5) * 200,
          drawdown: Math.random() * 0.1
        });
      }
      return data;
    }
  }
  
  // 運行回測
  static async runBacktest(config: DynamicPositionConfig, startDate: string, endDate: string): Promise<any> {
    if (isTauriAvailable()) {
      return await invoke('run_backtest', { config, startDate, endDate })
    } else {
      // 返回模擬回測結果
      return {
        total_return: 1250.75,
        sharpe_ratio: 1.85,
        max_drawdown: 0.08,
        win_rate: 0.68,
        trades: 45
      };
    }
  }
  
  // 驗證策略配置
  static async validateStrategyConfig(config: DynamicPositionConfig): Promise<boolean> {
    if (isTauriAvailable()) {
      return await invoke('validate_strategy_config', { config })
    } else {
      // 模擬驗證成功
      return true;
    }
  }
  
  // 重置系統
  static async resetSystem(): Promise<boolean> {
    if (isTauriAvailable()) {
      return await invoke('reset_system')
    } else {
      // 模擬成功
      return true;
    }
  }
  
  // 導出交易數據
  static async exportTradingData(format: 'csv' | 'json' = 'csv'): Promise<string> {
    if (isTauriAvailable()) {
      return await invoke('export_trading_data', { format })
    } else {
      // 模擬成功
      return 'trading_data.csv';
    }
  }
  
  // 導入策略配置
  static async importStrategyConfig(configData: string): Promise<DynamicPositionConfig> {
    if (isTauriAvailable()) {
      return await invoke('import_strategy_config', { configData })
    } else {
      // 返回默認配置
      return this.getStrategyConfig();
    }
  }
}

// 交易系統事件監聽器
export class TradingSystemEventListener {
  
  static async onTradingStatusChange(callback: (status: TradingStatus) => void) {
    if (isTauriAvailable()) {
      await listen('trading_status_change', (event) => {
        callback(event.payload as TradingStatus);
      });
    } else {
      // 模擬事件監聽
      console.log('Trading status change listener registered (mock mode)');
    }
  }
  
  static async onOrderExecuted(callback: (order: Order) => void) {
    if (isTauriAvailable()) {
      await listen('order_executed', (event) => {
        callback(event.payload as Order);
      });
    } else {
      // 模擬事件監聽
      console.log('Order executed listener registered (mock mode)');
    }
  }
  
  static async onPositionUpdated(callback: (position: Position) => void) {
    if (isTauriAvailable()) {
      await listen('position_updated', (event) => {
        callback(event.payload as Position);
      });
    } else {
      // 模擬事件監聽
      console.log('Position updated listener registered (mock mode)');
    }
  }
  
  static async onRiskAlert(callback: (alert: RiskAlert) => void) {
    if (isTauriAvailable()) {
      await listen('risk_alert', (event) => {
        callback(event.payload as RiskAlert);
      });
    } else {
      // 模擬事件監聽
      console.log('Risk alert listener registered (mock mode)');
    }
  }
  
  static async onMarketDataUpdate(callback: (data: MarketData) => void) {
    if (isTauriAvailable()) {
      await listen('market_data_update', (event) => {
        callback(event.payload as MarketData);
      });
    } else {
      // 模擬事件監聽
      console.log('Market data update listener registered (mock mode)');
    }
  }
  
  static async onTradingSignal(callback: (signal: TradingSignal) => void) {
    if (isTauriAvailable()) {
      await listen('trading_signal', (event) => {
        callback(event.payload as TradingSignal);
      });
    } else {
      // 模擬事件監聽
      console.log('Trading signal listener registered (mock mode)');
    }
  }
  
  static async onSystemError(callback: (error: { message: string; timestamp: string }) => void) {
    if (isTauriAvailable()) {
      await listen('system_error', (event) => {
        callback(event.payload as { message: string; timestamp: string });
      });
    } else {
      // 模擬事件監聽
      console.log('System error listener registered (mock mode)');
    }
  }
}

// 交易系統工具類
export class TradingSystemUtils {
  
  // 格式化價格
  static formatPrice(price: number, precision: number = 2): string {
    return price.toFixed(precision);
  }
  
  // 格式化百分比
  static formatPercentage(value: number, precision: number = 2): string {
    return `${(value * 100).toFixed(precision)}%`;
  }
  
  // 格式化時間
  static formatTime(timestamp: string | number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  // 獲取盈虧顏色
  static getPnlColor(pnl: number): string {
    if (pnl > 0) return '#52c41a';
    if (pnl < 0) return '#f5222d';
    return '#1890ff';
  }
  
  // 獲取風險等級顏色
  static getRiskLevelColor(level: string): string {
    switch (level) {
      case 'low': return '#52c41a';
      case 'medium': return '#faad14';
      case 'high': return '#fa8c16';
      case 'critical': return '#f5222d';
      default: return '#1890ff';
    }
  }
  
  // 獲取風險等級圖標
  static getRiskLevelIcon(level: string): string {
    switch (level) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🟠';
      case 'critical': return '🔴';
      default: return '🔵';
    }
  }
  
  // 驗證交易參數
  static validateTradingParams(params: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!params.symbol) errors.push('交易對不能為空');
    if (!params.quantity || params.quantity <= 0) errors.push('數量必須大於0');
    if (params.price && params.price <= 0) errors.push('價格必須大於0');
    if (params.leverage && (params.leverage < 1 || params.leverage > 100)) {
      errors.push('槓桿倍數必須在1-100之間');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // 計算保證金
  static calculateMargin(quantity: number, price: number, leverage: number): number {
    return (quantity * price) / leverage;
  }
  
  // 計算盈虧
  static calculatePnl(side: string, entryPrice: number, currentPrice: number, quantity: number): number {
    if (side === 'buy') {
      return (currentPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - currentPrice) * quantity;
    }
  }
  
  // 計算收益率
  static calculateReturnRate(pnl: number, initialCapital: number): number {
    return pnl / initialCapital;
  }
}