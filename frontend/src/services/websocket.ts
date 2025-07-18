import { io, Socket } from 'socket.io-client'

interface MarketData {
  symbol: string
  price: number
  change_24h: number
  volume: number
  timestamp: number
}

interface StrategyUpdate {
  id: string
  status: 'running' | 'stopped' | 'error'
  pnl: number
  trades: number
  win_rate: number
  timestamp: number
}

interface SystemUpdate {
  bot_running: boolean
  strategies_count: number
  active_strategies: number
  total_pnl: number
  daily_pnl: number
  timestamp: number
}

export interface WebSocketData {
  marketData: MarketData[]
  strategyUpdate: StrategyUpdate
  systemUpdate: SystemUpdate
  priceUpdate: { symbol: string; price: number; timestamp: number }
}

export type WebSocketEventType = keyof WebSocketData
export type WebSocketCallback<T extends WebSocketEventType> = (data: WebSocketData[T]) => void

class WebSocketService {
  private socket: Socket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<WebSocketEventType, Set<WebSocketCallback<any>>> = new Map()

  constructor() {
    this.initializeSocket()
  }

  private initializeSocket() {
    // 在開發環境中使用模擬數據，生產環境中連接到實際的WebSocket服務器
    const wsUrl = 'ws://localhost:8080' // 開發環境WebSocket URL

    this.socket = io(wsUrl, {
      transports: ['websocket'],
      timeout: 5000,
      autoConnect: false
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.startMockDataSimulation() // 開發環境下啟動模擬數據
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      this.isConnected = false
      this.handleReconnect()
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.isConnected = false
      this.handleReconnect()
    })

    // 監聽各種數據更新事件
    this.socket.on('marketData', (data: MarketData[]) => {
      this.emit('marketData', data)
    })

    this.socket.on('strategyUpdate', (data: StrategyUpdate) => {
      this.emit('strategyUpdate', data)
    })

    this.socket.on('systemUpdate', (data: SystemUpdate) => {
      this.emit('systemUpdate', data)
    })

    this.socket.on('priceUpdate', (data: { symbol: string; price: number; timestamp: number }) => {
      this.emit('priceUpdate', data)
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      
      setTimeout(() => {
        this.connect()
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  private startMockDataSimulation() {
    // 在開發環境中生成模擬實時數據
    this.simulateMarketData()
    this.simulateStrategyUpdates()
    this.simulateSystemUpdates()
  }

  private simulateMarketData() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT']
    
    setInterval(() => {
      const marketData: MarketData[] = symbols.map(symbol => ({
        symbol,
        price: 45000 + Math.random() * 10000,
        change_24h: (Math.random() - 0.5) * 5,
        volume: Math.random() * 1000000,
        timestamp: Date.now()
      }))
      
      this.emit('marketData', marketData)
    }, 2000)
  }

  private simulateStrategyUpdates() {
    const strategies = ['strategy_1', 'strategy_2', 'strategy_3']
    
    setInterval(() => {
      const strategyId = strategies[Math.floor(Math.random() * strategies.length)]
      const update: StrategyUpdate = {
        id: strategyId,
        status: Math.random() > 0.8 ? 'error' : 'running',
        pnl: (Math.random() - 0.3) * 1000,
        trades: Math.floor(Math.random() * 10),
        win_rate: 0.5 + Math.random() * 0.4,
        timestamp: Date.now()
      }
      
      this.emit('strategyUpdate', update)
    }, 3000)
  }

  private simulateSystemUpdates() {
    setInterval(() => {
      const update: SystemUpdate = {
        bot_running: Math.random() > 0.1,
        strategies_count: 4,
        active_strategies: Math.floor(Math.random() * 4) + 1,
        total_pnl: 2000 + (Math.random() - 0.5) * 500,
        daily_pnl: (Math.random() - 0.3) * 200,
        timestamp: Date.now()
      }
      
      this.emit('systemUpdate', update)
    }, 5000)
  }

  public connect() {
    if (this.socket && !this.isConnected) {
      this.socket.connect()
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.isConnected = false
    }
  }

  public subscribe<T extends WebSocketEventType>(
    event: T,
    callback: WebSocketCallback<T>
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  public unsubscribe<T extends WebSocketEventType>(
    event: T,
    callback: WebSocketCallback<T>
  ) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(callback)
    }
  }

  private emit<T extends WebSocketEventType>(event: T, data: WebSocketData[T]) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data))
    }
  }

  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    }
  }
}

export const webSocketService = new WebSocketService()
export default webSocketService 