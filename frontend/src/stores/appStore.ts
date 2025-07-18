import { create } from 'zustand'
import webSocketService, { WebSocketEventType } from '../services/websocket'
import tauriApiService from '../services/tauri'

// 系統狀態接口
export interface SystemStatus {
  bot_running: boolean
  data_healthy: boolean
  trading_healthy: boolean
  api_healthy: boolean
  uptime: number
  strategies_count: number
  active_strategies: number
}

// 策略信息接口
export interface StrategyInfo {
  id: string
  name: string
  symbol: string
  status: string
  pnl: number
  win_rate: number
  max_drawdown: number
  running_time: number
}

// 市場數據接口
export interface MarketData {
  symbol: string
  price: number
  change_24h: number
  volume: number
  timestamp: number
}

// 應用程式狀態接口
interface AppState {
  // 系統狀態
  systemStatus: SystemStatus | null
  updateSystemStatus: (status: SystemStatus) => void
  
  // 策略管理
  strategies: StrategyInfo[]
  updateStrategies: (strategies: StrategyInfo[]) => void
  
  // 市場數據
  marketData: MarketData[]
  updateMarketData: (data: MarketData[]) => void
  
  // 載入狀態
  isLoading: boolean
  setLoading: (loading: boolean) => void
  
  // 錯誤狀態
  error: string | null
  setError: (error: string | null) => void
  
  // WebSocket 相關狀態
  isWebSocketConnected: boolean
  webSocketReconnectAttempts: number
  realtimeData: {
    recentProfits: Array<{ date: string; profit: number }>
    priceUpdates: Record<string, number>
    lastUpdate: number
  }
  
  // 動作
  startTradingBot: () => Promise<void>
  stopTradingBot: () => Promise<void>
  refreshData: () => Promise<void>
  
  // 初始化
  initializeApp: () => Promise<void>
  
  // WebSocket 方法
  connectWebSocket: () => void
  disconnectWebSocket: () => void
  updateRealtimeData: (type: string, data: any) => void
  setWebSocketConnectionStatus: (connected: boolean, attempts: number) => void
}

// 模擬數據
const mockSystemStatus: SystemStatus = {
  bot_running: true,
  data_healthy: true,
  trading_healthy: true,
  api_healthy: true,
  uptime: 86400,
  strategies_count: 5,
  active_strategies: 3
}

const mockStrategies: StrategyInfo[] = [
  {
    id: '1',
    name: '量化策略A',
    symbol: 'BTCUSDT',
    status: '運行中',
    pnl: 1250.50,
    win_rate: 0.685,
    max_drawdown: 0.125,
    running_time: 3600
  },
  {
    id: '2',
    name: '均線策略B',
    symbol: 'ETHUSDT',
    status: '已停止',
    pnl: -150.20,
    win_rate: 0.623,
    max_drawdown: 0.089,
    running_time: 1800
  },
  {
    id: '3',
    name: '動量策略C',
    symbol: 'ADAUSDT',
    status: '運行中',
    pnl: 850.75,
    win_rate: 0.734,
    max_drawdown: 0.156,
    running_time: 7200
  }
]

const mockMarketData: MarketData[] = [
  {
    symbol: 'BTCUSDT',
    price: 43250.50,
    change_24h: 2.85,
    volume: 125000000,
    timestamp: Date.now()
  },
  {
    symbol: 'ETHUSDT',
    price: 2850.75,
    change_24h: -1.25,
    volume: 85000000,
    timestamp: Date.now()
  },
  {
    symbol: 'ADAUSDT',
    price: 0.485,
    change_24h: 5.62,
    volume: 45000000,
    timestamp: Date.now()
  }
]

// 創建store
export const useAppStore = create<AppState>((set, get) => ({
  // 初始狀態
  systemStatus: null,
  strategies: [],
  marketData: [],
  isLoading: false,
  error: null,
  
  // WebSocket 相關狀態
  isWebSocketConnected: false,
  webSocketReconnectAttempts: 0,
  realtimeData: {
    recentProfits: [],
    priceUpdates: {},
    lastUpdate: 0
  },
  
  // 更新函數
  updateSystemStatus: (status) => set({ systemStatus: status }),
  updateStrategies: (strategies) => set({ strategies }),
  updateMarketData: (data) => set({ marketData: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // 動作
  startTradingBot: async () => {
    try {
      set({ isLoading: true, error: null })
      
      // 檢查Tauri環境
      const isTauriAvailable = await tauriApiService.checkTauriEnvironment()
      
      if (isTauriAvailable) {
        // 調用Tauri API
        const result = await tauriApiService.startTradingBot()
        if (result) {
          // 獲取更新後的系統狀態
          const systemStatus = await tauriApiService.getSystemStatus()
          set({ systemStatus, isLoading: false })
          console.log('交易機器人已啟動')
        } else {
          throw new Error('Failed to start trading bot')
        }
      } else {
        // 開發環境：使用模擬數據
        await new Promise(resolve => setTimeout(resolve, 1000))
        set(state => ({
          systemStatus: state.systemStatus ? {
            ...state.systemStatus,
            bot_running: true
          } : mockSystemStatus,
          isLoading: false
        }))
        console.log('交易機器人已啟動（開發模式）')
      }
    } catch (error) {
      set({ error: '啟動交易機器人失敗', isLoading: false })
      console.error('啟動失敗:', error)
    }
  },
  
  stopTradingBot: async () => {
    try {
      set({ isLoading: true, error: null })
      
      // 檢查Tauri環境
      const isTauriAvailable = await tauriApiService.checkTauriEnvironment()
      
      if (isTauriAvailable) {
        // 調用Tauri API
        const result = await tauriApiService.stopTradingBot()
        if (result) {
          // 獲取更新後的系統狀態
          const systemStatus = await tauriApiService.getSystemStatus()
          set({ systemStatus, isLoading: false })
          console.log('交易機器人已停止')
        } else {
          throw new Error('Failed to stop trading bot')
        }
      } else {
        // 開發環境：使用模擬數據
        await new Promise(resolve => setTimeout(resolve, 1000))
        set(state => ({
          systemStatus: state.systemStatus ? {
            ...state.systemStatus,
            bot_running: false
          } : { ...mockSystemStatus, bot_running: false },
          isLoading: false
        }))
        console.log('交易機器人已停止（開發模式）')
      }
    } catch (error) {
      set({ error: '停止交易機器人失敗', isLoading: false })
      console.error('停止失敗:', error)
    }
  },
  
  refreshData: async () => {
    try {
      set({ isLoading: true, error: null })
      
      // 檢查Tauri環境
      const isTauriAvailable = await tauriApiService.checkTauriEnvironment()
      
      if (isTauriAvailable) {
        // 調用Tauri API獲取真實數據
        const marketDataRequest = { symbol: 'BTCUSDT', interval: '1m', limit: 10 }
        const marketData = await tauriApiService.getMarketData(marketDataRequest)
        const systemStatus = await tauriApiService.getSystemStatus()
        const strategies = await tauriApiService.getStrategies()
        
        set({ 
          marketData,
          systemStatus,
          strategies: strategies.map(s => ({
            id: s.id,
            name: s.name,
            symbol: s.symbol,
            status: s.status === 'running' ? '運行中' : '已停止',
            pnl: s.pnl,
            win_rate: s.win_rate,
            max_drawdown: s.max_drawdown,
            running_time: s.running_time
          })),
          isLoading: false
        })
        
        console.log('數據已刷新')
      } else {
        // 開發環境：使用模擬數據
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const updatedMarketData = mockMarketData.map(data => ({
          ...data,
          price: data.price * (1 + (Math.random() - 0.5) * 0.02),
          change_24h: (Math.random() - 0.5) * 10,
          timestamp: Date.now()
        }))
        
        set({ 
          marketData: updatedMarketData,
          isLoading: false
        })
        
        console.log('數據已刷新（開發模式）')
      }
    } catch (error) {
      set({ error: '刷新數據失敗', isLoading: false })
      console.error('刷新失敗:', error)
    }
  },
  
  initializeApp: async () => {
    try {
      set({ isLoading: true, error: null })
      
      // 檢查Tauri環境
      const isTauriAvailable = await tauriApiService.checkTauriEnvironment()
      
      if (isTauriAvailable) {
        // 調用Tauri API初始化
        const systemStatus = await tauriApiService.getSystemStatus()
        const strategies = await tauriApiService.getStrategies()
        const marketDataRequest = { symbol: 'BTCUSDT', interval: '1m', limit: 10 }
        const marketData = await tauriApiService.getMarketData(marketDataRequest)
        
        // 設置Tauri事件監聽
        tauriApiService.subscribe('system_status_update', (data: any) => {
          set({ systemStatus: data })
        })
        
        tauriApiService.subscribe('strategy_status_update', (data: any) => {
          set(state => ({
            strategies: state.strategies.map(s => 
              s.id === data.id ? {
                ...s,
                status: data.status === 'running' ? '運行中' : '已停止',
                pnl: data.pnl,
                win_rate: data.win_rate
              } : s
            )
          }))
        })
        
        tauriApiService.subscribe('market_data_update', (data: any) => {
          set({ marketData: data })
        })
        
        set({
          systemStatus,
          strategies: strategies.map(s => ({
            id: s.id,
            name: s.name,
            symbol: s.symbol,
            status: s.status === 'running' ? '運行中' : '已停止',
            pnl: s.pnl,
            win_rate: s.win_rate,
            max_drawdown: s.max_drawdown,
            running_time: s.running_time
          })),
          marketData,
          isLoading: false
        })
        
        console.log('應用程式初始化完成（Tauri模式）')
      } else {
        // 開發環境：使用模擬數據
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        set({
          systemStatus: mockSystemStatus,
          strategies: mockStrategies,
          marketData: mockMarketData,
          isLoading: false
        })
        
        console.log('應用程式初始化完成（開發模式）')
      }
    } catch (error) {
      set({ error: '初始化失敗', isLoading: false })
      console.error('初始化失敗:', error)
    }
  },
  
  // WebSocket 方法
  connectWebSocket: () => {
    const state = get()
    if (!state.isWebSocketConnected) {
      webSocketService.connect()
      
      // 設置WebSocket事件監聽
      webSocketService.subscribe('marketData', (data) => {
        set(state => ({
          marketData: data,
          realtimeData: {
            ...state.realtimeData,
            lastUpdate: Date.now()
          }
        }))
      })
      
      webSocketService.subscribe('systemUpdate', (data) => {
        set(state => ({
          systemStatus: state.systemStatus ? {
            ...state.systemStatus,
            bot_running: data.bot_running,
            strategies_count: data.strategies_count,
            active_strategies: data.active_strategies
          } : null,
          realtimeData: {
            ...state.realtimeData,
            lastUpdate: data.timestamp
          }
        }))
      })
      
      webSocketService.subscribe('strategyUpdate', (data) => {
        set(state => ({
          strategies: state.strategies.map(strategy => 
            strategy.id === data.id ? {
              ...strategy,
              status: data.status === 'running' ? '運行中' : '已停止',
              pnl: data.pnl,
              win_rate: data.win_rate
            } : strategy
          )
        }))
      })
      
      set({ isWebSocketConnected: true })
    }
  },
  
  disconnectWebSocket: () => {
    webSocketService.disconnect()
    set({ isWebSocketConnected: false, webSocketReconnectAttempts: 0 })
  },
  
  updateRealtimeData: (type: string, data: any) => {
    set(state => ({
      realtimeData: {
        ...state.realtimeData,
        [type]: data,
        lastUpdate: Date.now()
      }
    }))
  },
  
  setWebSocketConnectionStatus: (connected: boolean, attempts: number) => {
    set({ 
      isWebSocketConnected: connected,
      webSocketReconnectAttempts: attempts
    })
  }
}))