/**
 * 實時交易監控組件
 * 展示實時交易數據、圖表和性能指標
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  Tabs,
  Progress,
  Alert,
  Button,
  Tooltip,
  Avatar,
  List,
  Timeline,
  notification
} from 'antd'
import {
  LineChartOutlined,
  DollarOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  BellOutlined,
  SignalFilled,
  ThunderboltOutlined,
  AlertOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { Line, Column, Gauge, Liquid } from '@ant-design/plots'
import { 
  TradingSystemAPI, 
  TradingSystemEventListener, 
  TradingSystemUtils,
  SystemStatus,
  MarketData,
  TradingSignal,
  Order,
  RiskAlert,
  StrategyPerformance
} from '../services/trading'

const { TabPane } = Tabs

interface RealTimeTradingProps {
  // 可以從父組件傳入的配置
  symbol?: string
  updateInterval?: number
}

const RealTimeTrading: React.FC<RealTimeTradingProps> = ({ 
  symbol = 'BTCUSDT', 
  updateInterval = 1000 
}) => {
  // 狀態管理
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [priceHistory, setPriceHistory] = useState<any[]>([])
  const [performanceData, setPerformanceData] = useState<StrategyPerformance | null>(null)
  const [recentSignals, setRecentSignals] = useState<TradingSignal[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [recentAlerts, setRecentAlerts] = useState<RiskAlert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // 引用
  const priceHistoryRef = useRef<any[]>([])
  const updateTimerRef = useRef<NodeJS.Timeout>()
  
  // 初始化
  useEffect(() => {
    initializeMonitoring()
    setupEventListeners()
    startRealTimeUpdates()
    
    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current)
      }
    }
  }, [symbol, updateInterval])
  
  // 初始化監控
  const initializeMonitoring = async () => {
    try {
      setLoading(true)
      
      // 獲取系統狀態
      const status = await TradingSystemAPI.getSystemStatus()
      setSystemStatus(status)
      
      // 獲取市場數據
      const market = await TradingSystemAPI.getMarketData(symbol)
      setMarketData(market)
      
      // 獲取策略性能
      const performance = await TradingSystemAPI.getStrategyPerformance()
      setPerformanceData(performance)
      
      // 獲取最近信號
      const signals = await TradingSystemAPI.getTradingSignals(symbol, 20)
      setRecentSignals(signals)
      
      // 獲取最近訂單
      const orders = await TradingSystemAPI.getOrderHistory(20)
      setRecentOrders(orders)
      
      // 獲取風險警報
      const alerts = await TradingSystemAPI.getRiskAlerts()
      setRecentAlerts(alerts.slice(0, 10))
      
      // 獲取歷史價格數據
      const history = await TradingSystemAPI.getHistoricalPerformance(24)
      setPriceHistory(history)
      priceHistoryRef.current = history
      
      setIsConnected(true)
      
    } catch (error) {
      console.error('初始化監控失敗:', error)
      setIsConnected(false)
      notification.error({
        message: '連接失敗',
        description: '無法連接到交易系統，請檢查系統狀態'
      })
    } finally {
      setLoading(false)
    }
  }
  
  // 設置事件監聽器
  const setupEventListeners = () => {
    // 監聽市場數據更新
    TradingSystemEventListener.onMarketDataUpdate((data) => {
      if (data.symbol === symbol) {
        setMarketData(data)
        
        // 更新價格歷史
        const newPricePoint = {
          time: TradingSystemUtils.formatTime(data.timestamp),
          price: data.price,
          volume: data.volume,
          timestamp: data.timestamp
        }
        
        priceHistoryRef.current = [...priceHistoryRef.current.slice(-99), newPricePoint]
        setPriceHistory([...priceHistoryRef.current])
      }
    })
    
    // 監聽交易信號
    TradingSystemEventListener.onTradingSignal((signal) => {
      if (signal.symbol === symbol) {
        setRecentSignals(prev => [signal, ...prev.slice(0, 19)])
        
        // 顯示信號通知
        const color = signal.signal_type === 'buy' ? '#52c41a' : 
                     signal.signal_type === 'sell' ? '#f5222d' : '#1890ff'
        
        notification.info({
          message: '新交易信號',
          description: `${signal.symbol} ${signal.signal_type} 強度: ${(signal.strength * 100).toFixed(1)}%`,
          style: { borderLeft: `4px solid ${color}` }
        })
      }
    })
    
    // 監聽訂單執行
    TradingSystemEventListener.onOrderExecuted((order) => {
      setRecentOrders(prev => [order, ...prev.slice(0, 19)])
    })
    
    // 監聽風險警報
    TradingSystemEventListener.onRiskAlert((alert) => {
      setRecentAlerts(prev => [alert, ...prev.slice(0, 9)])
    })
    
    // 監聽系統狀態變化
    TradingSystemEventListener.onTradingStatusChange((status) => {
      setSystemStatus(prev => prev ? { ...prev, trading_status: status } : null)
    })
  }
  
  // 開始實時更新
  const startRealTimeUpdates = () => {
    updateTimerRef.current = setInterval(async () => {
      try {
        // 更新系統狀態
        const status = await TradingSystemAPI.getSystemStatus()
        setSystemStatus(status)
        
        // 更新市場數據
        const market = await TradingSystemAPI.getMarketData(symbol)
        setMarketData(market)
        
        // 更新策略性能
        const performance = await TradingSystemAPI.getStrategyPerformance()
        setPerformanceData(performance)
        
        setIsConnected(true)
        
      } catch (error) {
        console.error('實時更新失敗:', error)
        setIsConnected(false)
      }
    }, updateInterval)
  }
  
  // 渲染市場數據卡片
  const renderMarketDataCard = () => {
    if (!marketData) return null
    
    const changeColor = marketData.change_24h >= 0 ? '#52c41a' : '#f5222d'
    const changeIcon = marketData.change_24h >= 0 ? <TrendingUpOutlined /> : <TrendingDownOutlined />
    
    return (
      <Card title={`${marketData.symbol} 市場數據`} size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="當前價格"
              value={marketData.price}
              precision={2}
              prefix={<DollarOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="24h漲跌"
              value={marketData.change_24h}
              precision={2}
              valueStyle={{ color: changeColor }}
              prefix={changeIcon}
              suffix="%"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="24h成交量"
              value={marketData.volume}
              precision={0}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="連接狀態"
              value={isConnected ? '已連接' : '斷開'}
              valueStyle={{ color: isConnected ? '#52c41a' : '#f5222d' }}
              prefix={isConnected ? <SignalFilled /> : <AlertOutlined />}
            />
          </Col>
        </Row>
      </Card>
    )
  }
  
  // 渲染性能指標卡片
  const renderPerformanceCard = () => {
    if (!performanceData) return null
    
    const returnColor = performanceData.return_percentage >= 0 ? '#52c41a' : '#f5222d'
    const winRateColor = performanceData.win_rate >= 0.5 ? '#52c41a' : '#faad14'
    
    return (
      <Card title="策略性能" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="總收益率"
              value={performanceData.return_percentage}
              precision={2}
              valueStyle={{ color: returnColor }}
              suffix="%"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="勝率"
              value={performanceData.win_rate * 100}
              precision={1}
              valueStyle={{ color: winRateColor }}
              suffix="%"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="夏普比率"
              value={performanceData.sharpe_ratio}
              precision={2}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="最大回撤"
              value={performanceData.max_drawdown * 100}
              precision={2}
              valueStyle={{ color: '#f5222d' }}
              suffix="%"
            />
          </Col>
        </Row>
      </Card>
    )
  }
  
  // 渲染價格圖表
  const renderPriceChart = () => {
    if (!priceHistory.length) return null
    
    const config = {
      data: priceHistory,
      xField: 'time',
      yField: 'price',
      height: 300,
      smooth: true,
      point: {
        size: 2,
        shape: 'circle',
        style: {
          fill: '#1890ff',
          stroke: '#1890ff',
          lineWidth: 1,
        },
      },
      line: {
        style: {
          stroke: '#1890ff',
          lineWidth: 2,
        },
      },
      tooltip: {
        formatter: (datum: any) => {
          return {
            name: '價格',
            value: `$${TradingSystemUtils.formatPrice(datum.price)}`,
          }
        },
      },
      xAxis: {
        type: 'time',
        label: {
          formatter: (value: string) => {
            return new Date(value).toLocaleTimeString('zh-TW', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          },
        },
      },
      yAxis: {
        label: {
          formatter: (value: number) => `$${TradingSystemUtils.formatPrice(value)}`,
        },
      },
      animation: {
        appear: {
          animation: 'wave-in',
          duration: 1000,
        },
      },
    }
    
    return (
      <Card title="價格走勢" size="small">
        <Line {...config} />
      </Card>
    )
  }
  
  // 渲染風險儀表板
  const renderRiskGauge = () => {
    if (!systemStatus) return null
    
    const { risk_metrics } = systemStatus
    
    // 計算風險分數
    const riskScore = risk_metrics.overall_risk_level === 'low' ? 0.2 :
                     risk_metrics.overall_risk_level === 'medium' ? 0.5 :
                     risk_metrics.overall_risk_level === 'high' ? 0.8 : 1.0
    
    const config = {
      percent: riskScore,
      height: 200,
      range: {
        ticks: [0, 1/3, 2/3, 1],
        color: ['#52c41a', '#faad14', '#fa8c16', '#f5222d'],
      },
      indicator: {
        pointer: {
          style: {
            stroke: '#D0D0D0',
          },
        },
        pin: {
          style: {
            stroke: '#D0D0D0',
          },
        },
      },
      statistic: {
        content: {
          style: {
            fontSize: '36px',
            lineHeight: '36px',
            color: TradingSystemUtils.getRiskLevelColor(risk_metrics.overall_risk_level),
          },
          formatter: () => risk_metrics.overall_risk_level.toUpperCase(),
        },
      },
    }
    
    return (
      <Card title="風險等級" size="small">
        <Gauge {...config} />
      </Card>
    )
  }
  
  // 渲染信號列表
  const renderSignalsList = () => {
    const signalColumns = [
      {
        title: '時間',
        dataIndex: 'timestamp',
        key: 'timestamp',
        render: (timestamp: string) => TradingSystemUtils.formatTime(timestamp),
        width: 150,
      },
      {
        title: '信號類型',
        dataIndex: 'signal_type',
        key: 'signal_type',
        render: (type: string) => {
          const color = type === 'buy' ? 'green' : type === 'sell' ? 'red' : 'blue'
          return <Tag color={color}>{type.toUpperCase()}</Tag>
        },
        width: 100,
      },
      {
        title: '強度',
        dataIndex: 'strength',
        key: 'strength',
        render: (strength: number) => (
          <Progress
            percent={strength * 100}
            size="small"
            showInfo={false}
            strokeColor={strength > 0.7 ? '#52c41a' : strength > 0.4 ? '#faad14' : '#f5222d'}
          />
        ),
        width: 100,
      },
      {
        title: '價格',
        dataIndex: 'price',
        key: 'price',
        render: (price: number) => `$${TradingSystemUtils.formatPrice(price)}`,
        width: 100,
      },
    ]
    
    return (
      <Card title="最近信號" size="small">
        <Table
          dataSource={recentSignals}
          columns={signalColumns}
          rowKey="timestamp"
          size="small"
          pagination={{ pageSize: 10 }}
          scroll={{ y: 300 }}
        />
      </Card>
    )
  }
  
  // 渲染訂單列表
  const renderOrdersList = () => {
    const orderColumns = [
      {
        title: '時間',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (time: string) => TradingSystemUtils.formatTime(time),
        width: 150,
      },
      {
        title: '方向',
        dataIndex: 'side',
        key: 'side',
        render: (side: string) => {
          const color = side === 'buy' ? 'green' : 'red'
          return <Tag color={color}>{side.toUpperCase()}</Tag>
        },
        width: 80,
      },
      {
        title: '類型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => <Tag>{type.toUpperCase()}</Tag>,
        width: 100,
      },
      {
        title: '數量',
        dataIndex: 'quantity',
        key: 'quantity',
        render: (quantity: number) => TradingSystemUtils.formatPrice(quantity, 4),
        width: 100,
      },
      {
        title: '價格',
        dataIndex: 'filled_price',
        key: 'filled_price',
        render: (price: number) => price ? `$${TradingSystemUtils.formatPrice(price)}` : '-',
        width: 100,
      },
      {
        title: '狀態',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          const color = status === 'filled' ? 'green' : 
                       status === 'failed' ? 'red' : 
                       status === 'cancelled' ? 'orange' : 'blue'
          return <Tag color={color}>{status.toUpperCase()}</Tag>
        },
        width: 100,
      },
    ]
    
    return (
      <Card title="最近訂單" size="small">
        <Table
          dataSource={recentOrders}
          columns={orderColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          scroll={{ y: 300 }}
        />
      </Card>
    )
  }
  
  // 渲染警報時間線
  const renderAlertsTimeline = () => {
    const timelineItems = recentAlerts.map((alert, index) => ({
      key: index,
      color: TradingSystemUtils.getRiskLevelColor(alert.level),
      children: (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {TradingSystemUtils.getRiskLevelIcon(alert.level)} {alert.type}
          </div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {TradingSystemUtils.formatTime(alert.timestamp)}
          </div>
          <div style={{ marginTop: '4px' }}>
            {alert.message}
          </div>
        </div>
      ),
    }))
    
    return (
      <Card title="風險警報" size="small">
        <Timeline items={timelineItems} />
      </Card>
    )
  }
  
  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <SyncOutlined spin style={{ fontSize: '24px' }} />
        <div style={{ marginTop: '16px' }}>正在加載實時數據...</div>
      </div>
    )
  }
  
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 頁面標題 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>實時交易監控</h2>
            <p>實時監控市場數據、交易信號和系統狀態</p>
          </div>
          <Button icon={<SyncOutlined />} onClick={initializeMonitoring}>
            刷新數據
          </Button>
        </div>
        
        {/* 市場數據 */}
        {renderMarketDataCard()}
        
        {/* 性能指標 */}
        {renderPerformanceCard()}
        
        {/* 圖表區域 */}
        <Row gutter={16}>
          <Col span={18}>
            {renderPriceChart()}
          </Col>
          <Col span={6}>
            {renderRiskGauge()}
          </Col>
        </Row>
        
        {/* 數據表格 */}
        <Tabs defaultActiveKey="signals">
          <TabPane tab="交易信號" key="signals">
            {renderSignalsList()}
          </TabPane>
          <TabPane tab="訂單歷史" key="orders">
            {renderOrdersList()}
          </TabPane>
          <TabPane tab="風險警報" key="alerts">
            {renderAlertsTimeline()}
          </TabPane>
        </Tabs>
      </Space>
    </div>
  )
}

export default RealTimeTrading