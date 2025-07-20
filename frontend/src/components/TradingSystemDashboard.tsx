/**
 * 交易系統綜合儀表板
 * 整合所有功能的主頁面，展示第三階段的完整成果
 */

import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Button,
  Space,
  Tabs,
  Tag,
  Table,
  Timeline,
  notification,
  Spin,
  Badge
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  MonitorOutlined,
  BarChartOutlined,
  BellOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { Line, Column, Gauge, Liquid } from '@ant-design/plots'
import { useTradingStore, tradingSelectors } from '../stores/tradingStore'
import { TradingSystemUtils } from '../services/trading'

const { TabPane } = Tabs

interface TradingSystemDashboardProps {
  // 可以從父組件傳入的配置
  autoRefresh?: boolean
  refreshInterval?: number
}

const TradingSystemDashboard: React.FC<TradingSystemDashboardProps> = ({
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  // 狀態管理
  const {
    systemStatus,
    strategyConfig,
    orders,
    positions,
    alerts,
    signals,
    performance,
    marketData,
    riskMetrics,
    historicalData,
    loading,
    error,
    isConnected,
    lastUpdate,
    startTradingSystem,
    stopTradingSystem,
    pauseTradingSystem,
    resumeTradingSystem,
    emergencyStop,
    refreshData,
    initialize
  } = useTradingStore()
  
  // 本地狀態
  const [activeTab, setActiveTab] = useState('overview')
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh)
  
  // 初始化和自動刷新
  useEffect(() => {
    initialize()
    
    let intervalId: NodeJS.Timeout
    if (autoRefreshEnabled) {
      intervalId = setInterval(() => {
        refreshData()
      }, refreshInterval)
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [autoRefreshEnabled, refreshInterval, initialize, refreshData])
  
  // 錯誤處理
  useEffect(() => {
    if (error) {
      notification.error({
        message: '系統錯誤',
        description: error,
        duration: 0
      })
    }
  }, [error])
  
  // 交易統計
  const tradingStats = tradingSelectors.getTradingStats(useTradingStore.getState())
  const totalPnl = tradingSelectors.getTotalPnl(useTradingStore.getState())
  const activeAlerts = tradingSelectors.getActiveAlerts(useTradingStore.getState())
  const criticalAlerts = tradingSelectors.getCriticalAlerts(useTradingStore.getState())
  
  // 渲染系統狀態概覽 - 霓虹未來風格
  const renderCoreMetrics = () => {
    if (!systemStatus) return null
    
    const { trading_status, execution_status, risk_metrics } = systemStatus
    
    return (
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card 
            className="neon-panel trading-card"
            size="small"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              transition: 'all var(--animation-normal) ease'
            }}
          >
            <Statistic
              title={
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <MonitorOutlined style={{ marginRight: '8px' }} />
                  活躍訂單
                </span>
              }
              value={tradingStats.totalOrders}
              valueStyle={{ 
                color: 'var(--profit-green)',
                fontSize: '24px',
                fontWeight: 'var(--font-weight-semibold)',
                textShadow: trading_status.state === 'running' ? 
                  '0 0 8px rgba(41, 221, 196, 0.5)' : 'none'
              }}
              prefix={
                trading_status.state === 'running' ? 
                <span className="neon-status-indicator online pulse"></span> : null
              }
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card 
            className="neon-panel trading-card"
            size="small"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              transition: 'all var(--animation-normal) ease'
            }}
          >
            <Statistic
              title={
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <DollarOutlined style={{ marginRight: '8px' }} />
                  賬戶權益
                </span>
              }
              value={execution_status.account.total_equity}
              precision={2}
              valueStyle={{ 
                color: 'var(--accent-color)',
                fontSize: '24px',
                fontWeight: 'var(--font-weight-semibold)',
                textShadow: '0 0 8px rgba(0, 245, 212, 0.3)'
              }}
              suffix={
                <span style={{ color: 'var(--text-secondary)' }}>USDT</span>
              }
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card 
            className={`neon-panel trading-card ${totalPnl !== 0 ? 'active' : ''}`}
            size="small"
            style={{
              background: 'var(--bg-panel)',
              border: `1px solid ${totalPnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'}`,
              transition: 'all var(--animation-normal) ease',
              boxShadow: totalPnl !== 0 ? 
                (totalPnl >= 0 ? 'var(--neon-shadow)' : '0 0 10px rgba(255, 77, 109, 0.2)') 
                : 'none'
            }}
          >
            <Statistic
              title={
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {totalPnl >= 0 ? <RiseOutlined style={{ marginRight: '8px' }} /> : <FallOutlined style={{ marginRight: '8px' }} />}
                  總盈虧
                </span>
              }
              value={totalPnl}
              precision={2}
              valueStyle={{ 
                color: totalPnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)',
                fontSize: '24px',
                fontWeight: 'var(--font-weight-semibold)',
                textShadow: totalPnl >= 0 ? 
                  '0 0 8px rgba(41, 221, 196, 0.5)' : 
                  '0 0 8px rgba(255, 77, 109, 0.5)'
              }}
              className={totalPnl !== 0 ? (totalPnl >= 0 ? 'flash-green' : 'flash-red') : ''}
              suffix={
                <span style={{ color: 'var(--text-secondary)' }}>USDT</span>
              }
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card 
            className="neon-panel trading-card"
            size="small"
            style={{
              background: 'var(--bg-panel)',
              border: `1px solid ${TradingSystemUtils.getRiskLevelColor(risk_metrics.overall_risk_level)}`,
              transition: 'all var(--animation-normal) ease',
              boxShadow: risk_metrics.overall_risk_level === 'high' ? 
                '0 0 10px rgba(255, 77, 109, 0.3)' : 'none'
            }}
          >
            <Statistic
              title={
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <SafetyOutlined style={{ marginRight: '8px' }} />
                  風險等級
                </span>
              }
              value={risk_metrics.overall_risk_level}
              valueStyle={{ 
                color: TradingSystemUtils.getRiskLevelColor(risk_metrics.overall_risk_level),
                fontSize: '20px',
                fontWeight: 'var(--font-weight-semibold)',
                textTransform: 'uppercase'
              }}
              prefix={TradingSystemUtils.getRiskLevelIcon(risk_metrics.overall_risk_level)}
            />
          </Card>
        </Col>
      </Row>
    )
  }
  
  // 渲染控制面板 - 霓虹未來風格
  const renderControlPanel = () => {
    if (!systemStatus) return null
    
    const { trading_status } = systemStatus
    const isRunning = trading_status.state === 'running'
    const isPaused = trading_status.state === 'paused'
    const isStopped = trading_status.state === 'stopped'
    
    return (
      <Card 
        className="neon-panel"
        title={
          <span style={{ 
            color: 'var(--text-primary)', 
            fontSize: '16px',
            fontWeight: 'var(--font-weight-semibold)'
          }}>
            <ThunderboltOutlined style={{ marginRight: '8px', color: 'var(--accent-color)' }} />
            系統控制中心
          </span>
        }
        size="small"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)'
        }}
      >
        <Space size="large" wrap>
          <Button
            className={`neon-button ${isRunning ? 'pulse' : ''}`}
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={startTradingSystem}
            disabled={isRunning || loading}
            loading={loading}
            style={{
              background: isRunning ? 'var(--profit-green)' : 'var(--accent-color)',
              borderColor: isRunning ? 'var(--profit-green)' : 'var(--accent-color)',
              boxShadow: isRunning ? '0 0 15px rgba(41, 221, 196, 0.4)' : 'var(--neon-shadow)',
              height: '42px',
              padding: '0 20px',
              fontWeight: 'var(--font-weight-medium)'
            }}
          >
            啟動交易
          </Button>
          
          <Button
            className="neon-button"
            size="large"
            icon={<PauseCircleOutlined />}
            onClick={isPaused ? resumeTradingSystem : pauseTradingSystem}
            disabled={isStopped || loading}
            loading={loading}
            style={{
              borderColor: isPaused ? 'var(--accent-color)' : 'var(--text-secondary)',
              color: isPaused ? 'var(--accent-color)' : 'var(--text-secondary)',
              height: '42px',
              padding: '0 20px',
              fontWeight: 'var(--font-weight-medium)'
            }}
          >
            {isPaused ? '恢復交易' : '暫停交易'}
          </Button>
          
          <Button
            className="neon-button"
            size="large"
            icon={<StopOutlined />}
            onClick={stopTradingSystem}
            disabled={isStopped || loading}
            loading={loading}
            style={{
              borderColor: '#FFA726',
              color: '#FFA726',
              height: '42px',
              padding: '0 20px',
              fontWeight: 'var(--font-weight-medium)'
            }}
          >
            停止交易
          </Button>
          
          <Button
            className="neon-button"
            danger
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={emergencyStop}
            disabled={isStopped || loading}
            loading={loading}
            style={{
              background: 'transparent',
              borderColor: 'var(--loss-red)',
              color: 'var(--loss-red)',
              height: '42px',
              padding: '0 20px',
              fontWeight: 'var(--font-weight-medium)',
              boxShadow: '0 0 10px rgba(255, 77, 109, 0.2)'
            }}
          >
            緊急停止
          </Button>
          
          <Button
            className="neon-button"
            size="large"
            icon={<ReloadOutlined />}
            onClick={refreshData}
            loading={loading}
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              height: '42px',
              padding: '0 20px',
              fontWeight: 'var(--font-weight-medium)'
            }}
          >
            刷新數據
          </Button>
        </Space>
        
        {/* 系統狀態指示器 */}
        <div style={{ 
          marginTop: '16px', 
          padding: '12px 0',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>交易狀態:</span>
            <Tag 
              color={isRunning ? 'success' : isPaused ? 'warning' : 'default'}
              style={{
                fontSize: '12px',
                fontWeight: 'var(--font-weight-medium)',
                border: 'none',
                background: isRunning ? 
                  'rgba(41, 221, 196, 0.1)' : 
                  isPaused ? 'rgba(255, 167, 38, 0.1)' : 
                  'rgba(125, 125, 125, 0.1)'
              }}
            >
              {isRunning ? '運行中' : isPaused ? '已暫停' : '已停止'}
            </Tag>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Badge
              status={isConnected ? 'success' : 'error'}
              text={
                <span style={{ 
                  color: isConnected ? 'var(--profit-green)' : 'var(--loss-red)',
                  fontSize: '14px',
                  fontWeight: 'var(--font-weight-medium)'
                }}>
                  {isConnected ? '系統連接正常' : '系統連接異常'}
                </span>
              }
            />
          </div>
        </div>
      </Card>
    )
  }
  
  // 渲染關鍵指標
  const renderKeyMetrics = () => {
    if (!systemStatus) return null
    
    const { execution_status, risk_metrics } = systemStatus
    
    return (
      <Card title="關鍵指標" size="small">
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {tradingStats.totalOrders}
              </div>
              <div style={{ color: '#666' }}>總訂單數</div>
            </div>
          </Col>
          
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {tradingStats.totalPositions}
              </div>
              <div style={{ color: '#666' }}>持倉數量</div>
            </div>
          </Col>
          
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {tradingStats.activeAlerts}
              </div>
              <div style={{ color: '#666' }}>活躍警報</div>
            </div>
          </Col>
          
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {TradingSystemUtils.formatPercentage(risk_metrics.leverage_ratio)}
              </div>
              <div style={{ color: '#666' }}>杠桿使用率</div>
            </div>
          </Col>
        </Row>
      </Card>
    )
  }
  
  // 渲染性能圖表
  const renderPerformanceChart = () => {
    if (!historicalData.length) return null
    
    const config = {
      data: historicalData,
      xField: 'timestamp',
      yField: 'equity',
      height: 300,
      smooth: true,
      point: {
        size: 2,
        shape: 'circle',
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
            name: '賬戶權益',
            value: `$${TradingSystemUtils.formatPrice(datum.equity)}`,
          }
        },
      },
    }
    
    return (
      <Card title="權益曲線" size="small">
        <Line {...config} />
      </Card>
    )
  }
  
  // 渲染風險儀表板
  const renderRiskGauge = () => {
    if (!riskMetrics) return null
    
    const riskScore = riskMetrics.overall_risk_level === 'low' ? 0.2 :
                     riskMetrics.overall_risk_level === 'medium' ? 0.5 :
                     riskMetrics.overall_risk_level === 'high' ? 0.8 : 1.0
    
    const config = {
      percent: riskScore,
      height: 200,
      range: {
        ticks: [0, 1/3, 2/3, 1],
        color: ['#52c41a', '#faad14', '#fa8c16', '#f5222d'],
      },
      statistic: {
        content: {
          style: {
            fontSize: '24px',
            lineHeight: '24px',
            color: TradingSystemUtils.getRiskLevelColor(riskMetrics.overall_risk_level),
          },
          formatter: () => riskMetrics.overall_risk_level.toUpperCase(),
        },
      },
    }
    
    return (
      <Card title="風險等級" size="small">
        <Gauge {...config} />
      </Card>
    )
  }
  
  // 渲染最近訂單
  const renderRecentOrders = () => {
    const recentOrders = orders.slice(0, 5)
    
    const columns = [
      {
        title: '時間',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (time: string) => TradingSystemUtils.formatTime(time),
        width: 120,
      },
      {
        title: '交易對',
        dataIndex: 'symbol',
        key: 'symbol',
        render: (symbol: string) => <Tag color="blue">{symbol}</Tag>,
        width: 100,
      },
      {
        title: '方向',
        dataIndex: 'side',
        key: 'side',
        render: (side: string) => (
          <Tag color={side === 'buy' ? 'green' : 'red'}>
            {side === 'buy' ? '買入' : '賣出'}
          </Tag>
        ),
        width: 80,
      },
      {
        title: '數量',
        dataIndex: 'quantity',
        key: 'quantity',
        render: (quantity: number) => TradingSystemUtils.formatPrice(quantity, 4),
        width: 100,
      },
      {
        title: '狀態',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          const color = status === 'filled' ? 'green' : 
                       status === 'failed' ? 'red' : 'blue'
          return <Tag color={color}>{status.toUpperCase()}</Tag>
        },
        width: 80,
      },
    ]
    
    return (
      <Card title="最近訂單" size="small">
        <Table
          dataSource={recentOrders}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ y: 200 }}
        />
      </Card>
    )
  }
  
  // 渲染風險警報
  const renderRiskAlerts = () => {
    const recentAlerts = activeAlerts.slice(0, 5)
    
    return (
      <Card title="風險警報" size="small">
        <Timeline>
          {recentAlerts.map((alert: any, index: number) => (
            <Timeline.Item
              key={index}
              color={TradingSystemUtils.getRiskLevelColor(alert.level)}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                {TradingSystemUtils.getRiskLevelIcon(alert.level)} {alert.type}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {TradingSystemUtils.formatTime(alert.timestamp)}
              </div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>
                {alert.message}
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    )
  }
  
  // 渲染策略配置
  const renderStrategyConfig = () => {
    if (!strategyConfig) return null
    
    return (
      <Card title="策略配置" size="small">
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div><strong>策略名稱:</strong> {strategyConfig.name}</div>
            <div><strong>交易對:</strong> {strategyConfig.symbol}</div>
            <div><strong>風險模式:</strong> {strategyConfig.risk_mode}</div>
          </Col>
          <Col span={12}>
            <div><strong>最大杠桿:</strong> {strategyConfig.leverage_config.max_leverage}x</div>
            <div><strong>杠桿使用率:</strong> {TradingSystemUtils.formatPercentage(strategyConfig.leverage_config.leverage_usage_rate)}</div>
            <div><strong>動態杠桿:</strong> {strategyConfig.leverage_config.dynamic_leverage ? '啟用' : '禁用'}</div>
          </Col>
        </Row>
      </Card>
    )
  }
  
  if (loading && !systemStatus) {
    return (
      <div style={{ padding: '100px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px', fontSize: '16px' }}>
          正在加載交易系統...
        </div>
      </div>
    )
  }
  
  return (
    <div className="neon-dashboard fadeInUp" style={{ padding: '24px', minHeight: '100vh' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 頁面標題 - 霓虹未來風格 */}
        <div className="fadeInUp" style={{ marginBottom: '20px', animationDelay: '0.1s' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'var(--font-weight-semibold)', 
            margin: 0,
            color: 'var(--text-primary)',
            textShadow: '0 0 20px rgba(0, 245, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '36px' }}>🚀</span>
            動態倉位策略交易系統
          </h1>
          <div style={{ 
            marginTop: '8px', 
            color: 'var(--text-secondary)',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <Badge
              status={isConnected ? 'success' : 'error'}
              text={isConnected ? '系統已連接' : '連接已斷開'}
              style={{ fontSize: '14px' }}
            />
            {lastUpdate && (
              <span style={{ fontSize: '14px' }}>
                最後更新: {TradingSystemUtils.formatTime(lastUpdate)}
              </span>
            )}
          </div>
        </div>
        
        {/* 緊急警報 - 增強視覺效果 */}
        {criticalAlerts.length > 0 && (
          <div className="fadeInUp" style={{ animationDelay: '0.2s' }}>
            <Alert
              message={`⚠️ 檢測到 ${criticalAlerts.length} 個緊急風險警報`}
              description="系統存在高風險狀況，請立即檢查並採取措施"
              type="error"
              showIcon
              closable
              style={{
                background: 'rgba(255, 77, 109, 0.1)',
                border: '1px solid var(--loss-red)',
                borderRadius: 'var(--panel-radius)',
                boxShadow: '0 0 20px rgba(255, 77, 109, 0.2)'
              }}
            />
          </div>
        )}
        
        {/* 系統狀態概覽 - 霓虹面板 */}
        <div className="fadeInUp" style={{ animationDelay: '0.3s' }}>
          {renderCoreMetrics()}
        </div>
        
        {/* 控制面板 - 霓虹按鈕 */}
        <div className="fadeInUp" style={{ animationDelay: '0.4s' }}>
          {renderControlPanel()}
        </div>
        
        {/* 關鍵指標 */}
        <div className="fadeInUp" style={{ animationDelay: '0.5s' }}>
          {renderKeyMetrics()}
        </div>
        
        {/* 主要內容區域 */}
        <Row gutter={[16, 16]} className="fadeInUp" style={{ animationDelay: '0.6s' }}>
          <Col span={18}>
            {/* 性能圖表 */}
            <div className="neon-panel">
              {renderPerformanceChart()}
            </div>
          </Col>
          <Col span={6}>
            {/* 風險儀表板 */}
            <div className="neon-panel">
              {renderRiskGauge()}
            </div>
          </Col>
        </Row>
        
        {/* 詳細數據 */}
        <Row gutter={[16, 16]} className="fadeInUp" style={{ animationDelay: '0.7s' }}>
          <Col span={8}>
            <div className="neon-panel">
              {renderRecentOrders()}
            </div>
          </Col>
          <Col span={8}>
            <div className="neon-panel">
              {renderRiskAlerts()}
            </div>
          </Col>
          <Col span={8}>
            <div className="neon-panel">
              {renderStrategyConfig()}
            </div>
          </Col>
        </Row>
        
      </Space>
      
      {/* 背景裝飾效果 */}
      <div className="neon-background-effect" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: -1,
        background: 'radial-gradient(circle at 20% 80%, rgba(0, 245, 212, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 77, 109, 0.02) 0%, transparent 50%)'
      }} />
    </div>
  )
}

export default TradingSystemDashboard