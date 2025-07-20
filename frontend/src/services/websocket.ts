import { io, Socket } from 'socket.io-client'
import { notification } from 'antd'

// 檢查是否在Tauri環境中運行
const isTauriAvailable = () => {
  return typeof window !== 'undefined' && window.__TAURI_IPC__;
}

// WebSocket服務類
export class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000
  private isConnected = false
  private messageHandlers: Map<string, Function[]> = new Map()

  constructor() {
    // 在瀏覽器環境中，不嘗試連接WebSocket
    if (!isTauriAvailable()) {
      console.log('WebSocket service running in mock mode');
      this.setupMockData();
      return;
    }

    this.connect()
  }

  // 設置模擬數據
  private setupMockData() {
    // 模擬實時數據更新
    setInterval(() => {
      this.emitMockData();
    }, 5000);
  }

  // 發送模擬數據
  private emitMockData() {
    const mockData = {
      market_data: {
        'BTCUSDT': {
          symbol: 'BTCUSDT',
          price: 43250.50 + (Math.random() - 0.5) * 100,
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
          price: 2850.75 + (Math.random() - 0.5) * 50,
          volume: 85000000,
          timestamp: Date.now(),
          bid: 2848.00,
          ask: 2853.00,
          high_24h: 2900.00,
          low_24h: 2800.00,
          change_24h: -1.25
        }
      },
      trading_signals: [
        {
          symbol: 'BTCUSDT',
          signal_type: 'buy',
          strength: 0.75,
          price: 43250.50,
          timestamp: new Date().toISOString(),
          metadata: { indicator: 'SMA_CROSS' }
        }
      ],
      risk_alerts: [
        {
          type: 'leverage_warning',
          level: 'medium',
          message: '槓桿使用率接近限制',
          current_value: 0.15,
          threshold: 0.20,
          timestamp: new Date().toISOString(),
          resolved: false
        }
      ]
    };

    // 觸發事件處理器
    this.triggerHandlers('market_data_update', mockData.market_data);
    this.triggerHandlers('trading_signal', mockData.trading_signals[0]);
    this.triggerHandlers('risk_alert', mockData.risk_alerts[0]);
  }

  // 觸發事件處理器
  private triggerHandlers(event: string, data: any) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  // 連接到WebSocket服務器
  private connect() {
    if (!isTauriAvailable()) {
      console.log('WebSocket connection skipped in mock mode');
      return;
    }

    try {
      this.socket = io('ws://localhost:8080', {
        transports: ['websocket'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval
      })

      this.setupEventListeners()
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.handleReconnect()
    }
  }

  // 設置事件監聽器
  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0
      notification.success({
        message: '連接成功',
        description: '實時數據連接已建立'
      })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      this.isConnected = false
      notification.warning({
        message: '連接中斷',
        description: '實時數據連接已中斷，正在嘗試重連...'
      })
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.handleReconnect()
    })

    this.socket.on('market_data_update', (data) => {
      this.triggerHandlers('market_data_update', data)
    })

    this.socket.on('trading_signal', (data) => {
      this.triggerHandlers('trading_signal', data)
    })

    this.socket.on('risk_alert', (data) => {
      this.triggerHandlers('risk_alert', data)
      notification.warning({
        message: '風險警報',
        description: data.message
      })
    })

    this.socket.on('order_executed', (data) => {
      this.triggerHandlers('order_executed', data)
      notification.success({
        message: '訂單執行',
        description: `${data.symbol} ${data.side} 訂單已執行`
      })
    })

    this.socket.on('position_updated', (data) => {
      this.triggerHandlers('position_updated', data)
    })

    this.socket.on('trading_status_change', (data) => {
      this.triggerHandlers('trading_status_change', data)
    })

    this.socket.on('system_error', (data) => {
      this.triggerHandlers('system_error', data)
      notification.error({
        message: '系統錯誤',
        description: data.message
      })
    })
  }

  // 處理重連
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached')
      notification.error({
        message: '連接失敗',
        description: '無法連接到實時數據服務器'
      })
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

    setTimeout(() => {
      this.connect()
    }, this.reconnectInterval)
  }

  // 添加消息處理器
  on(event: string, handler: Function) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, [])
    }
    this.messageHandlers.get(event)!.push(handler)
  }

  // 移除消息處理器
  off(event: string, handler: Function) {
    const handlers = this.messageHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // 發送消息
  emit(event: string, data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data)
    } else {
      console.log(`Mock emit: ${event}`, data)
    }
  }

  // 斷開連接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnected = false
    this.messageHandlers.clear()
  }

  // 獲取連接狀態
  getConnectionStatus(): boolean {
    return this.isConnected
  }

  // 獲取重連嘗試次數
  getReconnectAttempts(): number {
    return this.reconnectAttempts
  }
}

// 創建WebSocket服務實例
export const websocketService = new WebSocketService()

// 導出默認實例
export default websocketService 