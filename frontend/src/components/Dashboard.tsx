import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Button, Table, Tag, Alert } from 'antd'
import { 
  CaretUpOutlined, 
  CaretDownOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined,
  ReloadOutlined,
  DollarOutlined,
  RobotOutlined,
  LineChartOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAppStore } from '../stores/appStore'
import tauriApiService from '../services/tauri'
import './Dashboard.css'

const Dashboard: React.FC = () => {
  const [isTauriEnvironment, setIsTauriEnvironment] = useState<boolean | null>(null)
  const { 
    systemStatus, 
    strategies, 
    marketData, 
    isLoading, 
    error,
    isWebSocketConnected,
    realtimeData,
    startTradingBot, 
    stopTradingBot, 
    refreshData,
    initializeApp,
    connectWebSocket,
    disconnectWebSocket
  } = useAppStore()

  useEffect(() => {
    // 檢查Tauri環境
    const checkEnvironment = async () => {
      const isTauri = await tauriApiService.checkTauriEnvironment()
      setIsTauriEnvironment(isTauri)
    }
    
    checkEnvironment()
    
    // 初始化應用程式
    initializeApp()
    
    // 連接WebSocket
    connectWebSocket()
    
    // 組件卸載時斷開WebSocket連接
    return () => {
      disconnectWebSocket()
    }
  }, [initializeApp, connectWebSocket, disconnectWebSocket])

  // 收益趨勢數據（優先使用實時數據）
  const recentProfitData = realtimeData.recentProfits.length > 0 
    ? realtimeData.recentProfits 
    : [
        { date: '01-15', profit: 0 },
        { date: '01-16', profit: 125.5 },
        { date: '01-17', profit: 89.2 },
        { date: '01-18', profit: 234.8 },
        { date: '01-19', profit: 156.9 },
        { date: '01-20', profit: 287.3 },
        { date: '01-21', profit: 345.6 },
      ]

  // 轉換策略數據為表格格式
  const tableStrategies = strategies.map(strategy => ({
    key: strategy.id,
    name: strategy.name,
    status: strategy.status,
    todayProfit: strategy.pnl,
    winRate: (strategy.win_rate * 100).toFixed(1),
  }))

  const strategyColumns = [
    {
      title: '策略名稱',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === '運行中' ? 'green' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: '今日盈虧',
      dataIndex: 'todayProfit',
      key: 'todayProfit',
      render: (profit: number) => (
        <span style={{ color: profit >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
        </span>
      ),
    },
          {
        title: '勝率',
        dataIndex: 'winRate',
        key: 'winRate',
        render: (rate: string) => `${rate}%`,
      },
  ]

  // 計算統計數據
  const totalPnl = strategies.reduce((sum, strategy) => sum + strategy.pnl, 0)
  const avgWinRate = strategies.length > 0 
    ? strategies.reduce((sum, strategy) => sum + strategy.win_rate, 0) / strategies.length * 100
    : 0
  const btcPrice = marketData.find(data => data.symbol === 'BTCUSDT')?.price || 0
  const btcChange = marketData.find(data => data.symbol === 'BTCUSDT')?.change_24h || 0

  return (
    <div className="dashboard">
            {error && (
        <Alert 
          message="錯誤" 
          description={error} 
          type="error" 
          showIcon 
          closable 
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 環境狀態指示器 */}
      {isTauriEnvironment !== null && (
        <Alert
          message={isTauriEnvironment ? "🚀 生產模式" : "🔧 開發模式"}
          description={
            isTauriEnvironment 
              ? "已連接到 Rust 後端，使用真實交易數據"
              : "使用模擬數據進行開發測試"
          }
          type={isTauriEnvironment ? "success" : "info"}
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {!error && systemStatus && (
        <Alert
          message={systemStatus.bot_running ? "交易機器人運行中" : "交易機器人已停止"}
          description={`系統運行時間: ${Math.floor(systemStatus.uptime / 3600)}小時 | 活躍策略: ${systemStatus.active_strategies}/${systemStatus.strategies_count}`}
          type={systemStatus.bot_running ? "success" : "warning"}
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 統計卡片 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="總資產"
              value={125420.50 + totalPnl}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="USD"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日盈虧"
              value={totalPnl}
              precision={2}
              valueStyle={{ color: totalPnl >= 0 ? '#52c41a' : '#ff4d4f' }}
              prefix={totalPnl >= 0 ? <CaretUpOutlined /> : <CaretDownOutlined />}
              suffix="USD"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="運行策略"
              value={systemStatus?.active_strategies || 0}
              suffix={`/${systemStatus?.strategies_count || 0}`}
              prefix={<RobotOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均勝率"
              value={avgWinRate}
              precision={1}
              suffix="%"
              prefix={<LineChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 策略狀態表格 */}
      <Row gutter={24}>
        <Col span={24}>
          <Card
            title="策略狀態"
            extra={
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                loading={isLoading}
                onClick={refreshData}
              >
                刷新
              </Button>
            }
          >
            <Table
              columns={strategyColumns}
              dataSource={tableStrategies}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* 收益趨勢圖表 */}
      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card 
            title="最近收益趨勢"
            extra={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  color: isWebSocketConnected ? '#52c41a' : '#faad14',
                  fontSize: '12px'
                }}>
                  ● {isWebSocketConnected ? '實時數據' : '連接中'}
                </span>
                {realtimeData.lastUpdate > 0 && (
                  <span style={{ color: '#888', fontSize: '12px' }}>
                    更新: {new Date(realtimeData.lastUpdate).toLocaleTimeString()}
                  </span>
                )}
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={recentProfitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`$${value}`, '收益']}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#1890ff" 
                  strokeWidth={2}
                  dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#1890ff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="系統控制">
            {systemStatus?.bot_running ? (
              <Button
                danger
                size="large"
                icon={<PauseCircleOutlined />}
                loading={isLoading}
                onClick={stopTradingBot}
              >
                停止交易
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                loading={isLoading}
                onClick={startTradingBot}
              >
                啟動交易
              </Button>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="市場狀態">
            <div style={{ fontSize: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span>BTC/USDT: </span>
                <span style={{ 
                  color: btcChange >= 0 ? '#52c41a' : '#ff4d4f', 
                  fontWeight: 'bold' 
                }}>
                  ${btcPrice.toFixed(2)} {btcChange >= 0 ? <CaretUpOutlined /> : <CaretDownOutlined />}
                </span>
              </div>
              <div>
                <span>24h變化: </span>
                <span style={{ color: btcChange >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  {btcChange >= 0 ? '+' : ''}{btcChange.toFixed(2)}%
                </span>
              </div>
              <div>
                <span>市場狀態: </span>
                <Tag color={systemStatus?.data_healthy ? 'green' : 'red'}>
                  {systemStatus?.data_healthy ? '活躍' : '異常'}
                </Tag>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard