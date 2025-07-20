import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'

// 系統狀態相關API
export interface SystemStatusResponse {
  bot_running: boolean
  data_healthy: boolean
  trading_healthy: boolean
  api_healthy: boolean
  uptime: number
  strategies_count: number
  active_strategies: number
}

// 策略相關API
export interface StrategyConfig {
  name: string
  symbol: string
  strategy_type: string
  parameters: Record<string, any>
  risk_management: {
    max_position_size: number
    stop_loss_percent: number
    take_profit_percent: number
    max_drawdown: number
  }
}

export interface StrategyStatus {
  id: string
  name: string
  symbol: string
  status: 'running' | 'stopped' | 'error'
  pnl: number
  win_rate: number
  max_drawdown: number
  running_time: number
  last_update: number
}

// 市場數據相關API
export interface MarketDataRequest {
  symbol: string
  interval: string
  limit?: number
}

export interface MarketDataResponse {
  symbol: string
  price: number
  change_24h: number
  volume: number
  timestamp: number
}

// 交易相關API
export interface TradeRequest {
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price?: number
  order_type: 'market' | 'limit'
}

export interface TradeResponse {
  order_id: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  status: 'pending' | 'filled' | 'cancelled'
  timestamp: number
}

class TauriApiService {
  private eventListeners: Map<string, Set<Function>> = new Map()

  constructor() {
    this.initializeEventListeners()
  }

  private async initializeEventListeners() {
    // 監聽系統狀態更新
    await listen('system_status_update', (event) => {
      this.emit('system_status_update', event.payload)
    })

    // 監聽策略狀態更新
    await listen('strategy_status_update', (event) => {
      this.emit('strategy_status_update', event.payload)
    })

    // 監聽市場數據更新
    await listen('market_data_update', (event) => {
      this.emit('market_data_update', event.payload)
    })

    // 監聽交易事件
    await listen('trade_event', (event) => {
      this.emit('trade_event', event.payload)
    })
  }

  // 系統控制API
  async startTradingBot(): Promise<boolean> {
    try {
      const result = await invoke<boolean>('start_trading_system')
      return result
    } catch (error) {
      console.error('Failed to start trading bot:', error)
      throw error
    }
  }

  async stopTradingBot(): Promise<boolean> {
    try {
      const result = await invoke<boolean>('stop_trading_system')
      return result
    } catch (error) {
      console.error('Failed to stop trading bot:', error)
      throw error
    }
  }

  async getSystemStatus(): Promise<SystemStatusResponse> {
    try {
      const result = await invoke<SystemStatusResponse>('get_trading_system_status')
      return result
    } catch (error) {
      console.error('Failed to get system status:', error)
      throw error
    }
  }

  // 策略管理API
  async createStrategy(config: StrategyConfig): Promise<string> {
    try {
      const result = await invoke<string>('create_strategy', { config })
      return result
    } catch (error) {
      console.error('Failed to create strategy:', error)
      throw error
    }
  }

  async startStrategy(strategyId: string): Promise<boolean> {
    try {
      const result = await invoke<boolean>('start_strategy', { strategyId })
      return result
    } catch (error) {
      console.error('Failed to start strategy:', error)
      throw error
    }
  }

  async stopStrategy(strategyId: string): Promise<boolean> {
    try {
      const result = await invoke<boolean>('stop_strategy', { strategyId })
      return result
    } catch (error) {
      console.error('Failed to stop strategy:', error)
      throw error
    }
  }

  async getStrategies(): Promise<StrategyStatus[]> {
    try {
      const result = await invoke<StrategyStatus[]>('get_strategies')
      return result
    } catch (error) {
      console.error('Failed to get strategies:', error)
      throw error
    }
  }

  async deleteStrategy(strategyId: string): Promise<boolean> {
    try {
      const result = await invoke<boolean>('delete_strategy', { strategyId })
      return result
    } catch (error) {
      console.error('Failed to delete strategy:', error)
      throw error
    }
  }

  // 市場數據API
  async getMarketData(request: MarketDataRequest): Promise<MarketDataResponse[]> {
    try {
      const result = await invoke<MarketDataResponse[]>('get_market_data', { request })
      return result
    } catch (error) {
      console.error('Failed to get market data:', error)
      throw error
    }
  }

  async subscribeMarketData(symbols: string[]): Promise<boolean> {
    try {
      const result = await invoke<boolean>('subscribe_market_data', { symbols })
      return result
    } catch (error) {
      console.error('Failed to subscribe market data:', error)
      throw error
    }
  }

  async unsubscribeMarketData(symbols: string[]): Promise<boolean> {
    try {
      const result = await invoke<boolean>('unsubscribe_market_data', { symbols })
      return result
    } catch (error) {
      console.error('Failed to unsubscribe market data:', error)
      throw error
    }
  }

  // 交易API
  async placeOrder(request: TradeRequest): Promise<TradeResponse> {
    try {
      const result = await invoke<TradeResponse>('place_order', { request })
      return result
    } catch (error) {
      console.error('Failed to place order:', error)
      throw error
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const result = await invoke<boolean>('cancel_order', { orderId })
      return result
    } catch (error) {
      console.error('Failed to cancel order:', error)
      throw error
    }
  }

  async getOpenOrders(): Promise<TradeResponse[]> {
    try {
      const result = await invoke<TradeResponse[]>('get_open_orders')
      return result
    } catch (error) {
      console.error('Failed to get open orders:', error)
      throw error
    }
  }

  async getOrderHistory(limit?: number): Promise<TradeResponse[]> {
    try {
      const result = await invoke<TradeResponse[]>('get_order_history', { limit })
      return result
    } catch (error) {
      console.error('Failed to get order history:', error)
      throw error
    }
  }

  // 回測API
  async runBacktest(config: any): Promise<any> {
    try {
      const result = await invoke<any>('run_backtest', { config })
      return result
    } catch (error) {
      console.error('Failed to run backtest:', error)
      throw error
    }
  }

  // 風險管理API
  async updateRiskParameters(parameters: any): Promise<boolean> {
    try {
      const result = await invoke<boolean>('update_risk_parameters', { parameters })
      return result
    } catch (error) {
      console.error('Failed to update risk parameters:', error)
      throw error
    }
  }

  async getRiskStatus(): Promise<any> {
    try {
      const result = await invoke<any>('get_risk_status')
      return result
    } catch (error) {
      console.error('Failed to get risk status:', error)
      throw error
    }
  }

  // 事件監聽管理
  public subscribe(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  public unsubscribe(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  // 檢查Tauri環境
  async checkTauriEnvironment(): Promise<boolean> {
    try {
      await invoke('ping')
      return true
    } catch (error) {
      console.warn('Tauri environment not available, running in development mode')
      return false
    }
  }
}

export const tauriApiService = new TauriApiService()
export default tauriApiService 