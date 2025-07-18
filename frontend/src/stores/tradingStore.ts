/**
 * 交易系統狀態管理
 * 專門管理動態倉位策略和交易執行系統的狀態
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { 
  TradingSystemAPI, 
  TradingSystemEventListener,
  SystemStatus,
  DynamicPositionConfig,
  Order,
  Position,
  RiskAlert,
  TradingSignal,
  MarketData,
  StrategyPerformance,
  RiskMetrics
} from '../services/trading'

// 交易系統狀態接口
interface TradingSystemState {
  // 系統狀態
  systemStatus: SystemStatus | null
  isConnected: boolean
  lastUpdate: number
  
  // 策略配置
  strategyConfig: DynamicPositionConfig | null
  
  // 交易數據
  orders: Order[]
  positions: Record<string, Position>
  marketData: Record<string, MarketData>
  
  // 風險管理
  riskMetrics: RiskMetrics | null
  alerts: RiskAlert[]
  
  // 交易信號
  signals: TradingSignal[]
  
  // 性能數據
  performance: StrategyPerformance | null
  historicalData: any[]
  
  // 載入狀態
  loading: boolean
  
  // 錯誤狀態
  error: string | null
  
  // Actions
  // 系統控制
  startTradingSystem: () => Promise<void>
  stopTradingSystem: () => Promise<void>
  pauseTradingSystem: () => Promise<void>
  resumeTradingSystem: () => Promise<void>
  emergencyStop: () => Promise<void>
  
  // 數據更新
  updateSystemStatus: (status: SystemStatus) => void
  updateStrategyConfig: (config: DynamicPositionConfig) => void
  updateMarketData: (symbol: string, data: MarketData) => void
  updateRiskMetrics: (metrics: RiskMetrics) => void
  
  // 訂單管理
  addOrder: (order: Order) => void
  updateOrder: (order: Order) => void
  placeManualOrder: (order: Partial<Order>) => Promise<void>
  cancelOrder: (orderId: string) => Promise<void>
  
  // 持倉管理
  updatePosition: (symbol: string, position: Position) => void
  closePosition: (symbol: string) => Promise<void>
  closeAllPositions: () => Promise<void>
  
  // 風險管理
  addAlert: (alert: RiskAlert) => void
  resolveAlert: (alertId: string) => Promise<void>
  
  // 信號管理
  addSignal: (signal: TradingSignal) => void
  
  // 數據刷新
  refreshData: () => Promise<void>
  refreshMarketData: () => Promise<void>
  
  // 初始化
  initialize: () => Promise<void>
  
  // 清理
  cleanup: () => void
  
  // 設置狀態
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setConnected: (connected: boolean) => void
}

// 創建交易系統狀態管理
export const useTradingStore = create<TradingSystemState>()(
  devtools(
    (set, get) => ({
      // 初始狀態
      systemStatus: null,
      isConnected: false,
      lastUpdate: 0,
      strategyConfig: null,
      orders: [],
      positions: {},
      marketData: {},
      riskMetrics: null,
      alerts: [],
      signals: [],
      performance: null,
      historicalData: [],
      loading: false,
      error: null,
      
      // 系統控制
      startTradingSystem: async () => {
        try {
          set({ loading: true, error: null })
          const success = await TradingSystemAPI.startTrading()
          if (success) {
            await get().refreshData()
          }
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ loading: false })
        }
      },
      
      stopTradingSystem: async () => {
        try {
          set({ loading: true, error: null })
          const success = await TradingSystemAPI.stopTrading()
          if (success) {
            await get().refreshData()
          }
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ loading: false })
        }
      },
      
      pauseTradingSystem: async () => {
        try {
          set({ loading: true, error: null })
          const success = await TradingSystemAPI.pauseTrading()
          if (success) {
            await get().refreshData()
          }
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ loading: false })
        }
      },
      
      resumeTradingSystem: async () => {
        try {
          set({ loading: true, error: null })
          const success = await TradingSystemAPI.resumeTrading()
          if (success) {
            await get().refreshData()
          }
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ loading: false })
        }
      },
      
      emergencyStop: async () => {
        try {
          set({ loading: true, error: null })
          const success = await TradingSystemAPI.emergencyStop()
          if (success) {
            await get().refreshData()
          }
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ loading: false })
        }
      },
      
      // 數據更新
      updateSystemStatus: (status: SystemStatus) => {
        set({ 
          systemStatus: status,
          lastUpdate: Date.now(),
          isConnected: true
        })
      },
      
      updateStrategyConfig: (config: DynamicPositionConfig) => {
        set({ strategyConfig: config })
      },
      
      updateMarketData: (symbol: string, data: MarketData) => {
        set(state => ({
          marketData: {
            ...state.marketData,
            [symbol]: data
          }
        }))
      },
      
      updateRiskMetrics: (metrics: RiskMetrics) => {
        set({ riskMetrics: metrics })
      },
      
      // 訂單管理
      addOrder: (order: Order) => {
        set(state => ({
          orders: [order, ...state.orders.slice(0, 99)] // 保留最近100個訂單
        }))
      },
      
      updateOrder: (order: Order) => {
        set(state => ({
          orders: state.orders.map(o => o.id === order.id ? order : o)
        }))
      },
      
      placeManualOrder: async (order: Partial<Order>) => {
        try {
          set({ loading: true, error: null })
          const placedOrder = await TradingSystemAPI.placeOrder(order)
          get().addOrder(placedOrder)
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ loading: false })
        }
      },
      
      cancelOrder: async (orderId: string) => {
        try {
          set({ loading: true, error: null })
          const success = await TradingSystemAPI.cancelOrder(orderId)
          if (success) {
            // 更新訂單狀態為已取消
            set(state => ({
              orders: state.orders.map(o => 
                o.id === orderId ? { ...o, status: 'cancelled' } : o
              )
            }))
          }
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ loading: false })
        }
      },
      
      // 持倉管理
      updatePosition: (symbol: string, position: Position) => {
        set(state => ({
          positions: {
            ...state.positions,
            [symbol]: position
          }
        }))
      },
      
      closePosition: async (symbol: string) => {
        try {
          set({ loading: true, error: null })
          const success = await TradingSystemAPI.closePosition(symbol)
          if (success) {
            // 移除持倉
            set(state => {
              const newPositions = { ...state.positions }
              delete newPositions[symbol]
              return { positions: newPositions }
            })
          }
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ loading: false })
        }
      },
      
      closeAllPositions: async () => {
        try {
          set({ loading: true, error: null })
          const count = await TradingSystemAPI.closeAllPositions()
          if (count > 0) {
            // 清空所有持倉
            set({ positions: {} })
          }
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ loading: false })
        }
      },
      
      // 風險管理
      addAlert: (alert: RiskAlert) => {
        set(state => ({
          alerts: [alert, ...state.alerts.slice(0, 49)] // 保留最近50個警報
        }))
      },
      
      resolveAlert: async (alertId: string) => {
        try {
          const success = await TradingSystemAPI.resolveRiskAlert(alertId)
          if (success) {
            set(state => ({
              alerts: state.alerts.map(alert => 
                alert.timestamp === alertId ? { ...alert, resolved: true } : alert
              )
            }))
          }
        } catch (error) {
          set({ error: (error as Error).message })
        }
      },
      
      // 信號管理
      addSignal: (signal: TradingSignal) => {
        set(state => ({
          signals: [signal, ...state.signals.slice(0, 99)] // 保留最近100個信號
        }))
      },
      
      // 數據刷新
      refreshData: async () => {
        try {
          set({ loading: true, error: null })
          
          // 並行獲取所有數據
          const [
            systemStatus,
            strategyConfig,
            orderHistory,
            positions,
            riskAlerts,
            performance,
            historicalData
          ] = await Promise.all([
            TradingSystemAPI.getSystemStatus(),
            TradingSystemAPI.getStrategyConfig(),
            TradingSystemAPI.getOrderHistory(50),
            TradingSystemAPI.getPositions(),
            TradingSystemAPI.getRiskAlerts(),
            TradingSystemAPI.getStrategyPerformance(),
            TradingSystemAPI.getHistoricalPerformance(24)
          ])
          
          set({
            systemStatus,
            strategyConfig,
            orders: orderHistory,
            positions,
            alerts: riskAlerts,
            performance,
            historicalData,
            riskMetrics: systemStatus.risk_metrics,
            isConnected: true,
            lastUpdate: Date.now()
          })
          
          // 獲取市場數據
          if (strategyConfig?.symbol) {
            const marketData = await TradingSystemAPI.getMarketData(strategyConfig.symbol)
            get().updateMarketData(strategyConfig.symbol, marketData)
            
            // 獲取交易信號
            const signals = await TradingSystemAPI.getTradingSignals(strategyConfig.symbol, 20)
            set({ signals })
          }
          
        } catch (error) {
          set({ 
            error: (error as Error).message,
            isConnected: false
          })
        } finally {
          set({ loading: false })
        }
      },
      
      refreshMarketData: async () => {
        try {
          const { strategyConfig } = get()
          if (strategyConfig?.symbol) {
            const marketData = await TradingSystemAPI.getMarketData(strategyConfig.symbol)
            get().updateMarketData(strategyConfig.symbol, marketData)
          }
        } catch (error) {
          console.error('刷新市場數據失敗:', (error as Error).message)
        }
      },
      
      // 初始化
      initialize: async () => {
        try {
          set({ loading: true, error: null })
          
          // 初始化事件監聽器
          setupEventListeners(get())
          
          // 載入初始數據
          await get().refreshData()
          
        } catch (error) {
          set({ 
            error: (error as Error).message,
            isConnected: false
          })
        } finally {
          set({ loading: false })
        }
      },
      
      // 清理
      cleanup: () => {
        // 清理事件監聽器和定時器
        set({
          systemStatus: null,
          isConnected: false,
          orders: [],
          positions: {},
          marketData: {},
          alerts: [],
          signals: [],
          error: null
        })
      },
      
      // 設置狀態
      setLoading: (loading: boolean) => set({ loading }),
      setError: (error: string | null) => set({ error }),
      setConnected: (connected: boolean) => set({ isConnected: connected })
    }),
    {
      name: 'trading-store',
      // 只在開發環境啟用devtools
      enabled: process.env.NODE_ENV === 'development'
    }
  )
)

// 事件監聽器設置
const setupEventListeners = (store: TradingSystemState) => {
  // 監聽交易狀態變化
  TradingSystemEventListener.onTradingStatusChange((status) => {
    store.updateSystemStatus({
      ...store.systemStatus!,
      trading_status: status
    })
  })
  
  // 監聽訂單執行
  TradingSystemEventListener.onOrderExecuted((order) => {
    store.addOrder(order)
  })
  
  // 監聽持倉更新
  TradingSystemEventListener.onPositionUpdated((position) => {
    store.updatePosition(position.symbol, position)
  })
  
  // 監聽風險警報
  TradingSystemEventListener.onRiskAlert((alert) => {
    store.addAlert(alert)
  })
  
  // 監聽市場數據更新
  TradingSystemEventListener.onMarketDataUpdate((data) => {
    store.updateMarketData(data.symbol, data)
  })
  
  // 監聽交易信號
  TradingSystemEventListener.onTradingSignal((signal) => {
    store.addSignal(signal)
  })
  
      // 監聽系統錯誤
    TradingSystemEventListener.onSystemError((error) => {
      store.setError(error.message)
    })
}

// 選擇器助手
export const tradingSelectors = {
  // 獲取活躍訂單
  getActiveOrders: (state: TradingSystemState) => 
    state.orders.filter(order => order.status === 'pending' || order.status === 'partial'),
  
  // 獲取已完成訂單
  getCompletedOrders: (state: TradingSystemState) => 
    state.orders.filter(order => order.status === 'filled'),
  
  // 獲取失敗訂單
  getFailedOrders: (state: TradingSystemState) => 
    state.orders.filter(order => order.status === 'failed' || order.status === 'cancelled'),
  
  // 獲取活躍警報
  getActiveAlerts: (state: TradingSystemState) => 
    state.alerts.filter(alert => !alert.resolved),
  
  // 獲取已解決警報
  getResolvedAlerts: (state: TradingSystemState) => 
    state.alerts.filter(alert => alert.resolved),
  
  // 獲取緊急警報
  getCriticalAlerts: (state: TradingSystemState) => 
    state.alerts.filter(alert => alert.level === 'critical' && !alert.resolved),
  
  // 獲取最近信號
  getRecentSignals: (state: TradingSystemState) => 
    state.signals.slice(0, 10),
  
  // 獲取交易統計
  getTradingStats: (state: TradingSystemState) => ({
    totalOrders: state.orders.length,
    activeOrders: state.orders.filter(o => o.status === 'pending' || o.status === 'partial').length,
    completedOrders: state.orders.filter(o => o.status === 'filled').length,
    failedOrders: state.orders.filter(o => o.status === 'failed' || o.status === 'cancelled').length,
    totalPositions: Object.keys(state.positions).length,
    activeAlerts: state.alerts.filter(a => !a.resolved).length,
    criticalAlerts: state.alerts.filter(a => a.level === 'critical' && !a.resolved).length
  }),
  
  // 獲取總盈虧
  getTotalPnl: (state: TradingSystemState) => {
    const unrealizedPnl = Object.values(state.positions).reduce((total, pos) => total + pos.unrealized_pnl, 0)
    const realizedPnl = Object.values(state.positions).reduce((total, pos) => total + pos.realized_pnl, 0)
    return unrealizedPnl + realizedPnl
  }
}

export default useTradingStore