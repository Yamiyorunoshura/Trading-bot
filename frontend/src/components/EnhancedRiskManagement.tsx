/**
 * 增強版風險管理組件
 * 整合第二階段開發的風險管理系統
 */

import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Table,
  Tag,
  Space,
  Tabs,
  Modal,
  Form,
  InputNumber,
  Switch,
  Button,
  Tooltip,
  notification,
  Descriptions,
  Timeline,
  Badge,
  Popconfirm
} from 'antd'
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  ShieldOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  DollarOutlined,
  PercentageOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  ReloadOutlined,
  StopOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { Gauge, Liquid, Column, Line } from '@ant-design/plots'
import { 
  TradingSystemAPI, 
  TradingSystemEventListener, 
  TradingSystemUtils,
  RiskMetrics,
  RiskAlert,
  SystemStatus
} from '../services/trading'

const { TabPane } = Tabs

interface RiskLimitsConfig {
  max_leverage: number
  max_position_size: number
  max_total_exposure: number
  max_drawdown: number
  daily_loss_limit: number
  min_margin_ratio: number
  margin_call_ratio: number
  default_stop_loss: number
  default_take_profit: number
}

interface EnhancedRiskManagementProps {
  // 可以從父組件傳入的配置
  autoRefresh?: boolean
  refreshInterval?: number
}

const EnhancedRiskManagement: React.FC<EnhancedRiskManagementProps> = ({ 
  autoRefresh = true, 
  refreshInterval = 5000 
}) => {
  // 狀態管理
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [historicalRisk, setHistoricalRisk] = useState<any[]>([])
  const [riskLimits, setRiskLimits] = useState<RiskLimitsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [emergencyMode, setEmergencyMode] = useState(false)
  
  // 表單
  const [form] = Form.useForm()
  
  // 初始化
  useEffect(() => {
    initializeRiskManagement()
    setupEventListeners()
    
    let intervalId: NodeJS.Timeout
    if (autoRefresh) {
      intervalId = setInterval(updateRiskData, refreshInterval)
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [autoRefresh, refreshInterval])
  
  // 初始化風險管理
  const initializeRiskManagement = async () => {
    try {
      setLoading(true)
      
      // 獲取系統狀態
      const status = await TradingSystemAPI.getSystemStatus()
      setSystemStatus(status)
      setRiskMetrics(status.risk_metrics)
      
      // 獲取風險警報
      const riskAlerts = await TradingSystemAPI.getRiskAlerts()
      setAlerts(riskAlerts)
      
      // 獲取歷史風險數據
      const history = await TradingSystemAPI.getHistoricalPerformance(24)
      setHistoricalRisk(history)
      
      // 檢查是否處於緊急模式
      const criticalAlerts = riskAlerts.filter(alert => 
        alert.level === 'critical' && !alert.resolved
      )
      setEmergencyMode(criticalAlerts.length > 0)
      
    } catch (error) {
      console.error('初始化風險管理失敗:', error)
      notification.error({
        message: '初始化失敗',
        description: '無法加載風險管理數據'
      })
    } finally {
      setLoading(false)
    }
  }
  
  // 設置事件監聽器
  const setupEventListeners = () => {
    // 監聽風險警報
    TradingSystemEventListener.onRiskAlert((alert) => {
      setAlerts(prev => [alert, ...prev])
      
      // 檢查是否是緊急警報
      if (alert.level === 'critical') {
        setEmergencyMode(true)
        notification.error({
          message: '緊急風險警報',
          description: alert.message,
          duration: 0,
        })
      } else if (alert.level === 'high') {
        notification.warning({
          message: '高風險警報',
          description: alert.message,
        })
      }
    })
    
    // 監聽交易狀態變化
    TradingSystemEventListener.onTradingStatusChange((status) => {
      if (status.state === 'emergency') {
        setEmergencyMode(true)
      }
    })
  }
  
  // 更新風險數據
  const updateRiskData = async () => {
    try {
      const status = await TradingSystemAPI.getSystemStatus()
      setSystemStatus(status)
      setRiskMetrics(status.risk_metrics)
      
      // 更新歷史數據
      const history = await TradingSystemAPI.getHistoricalPerformance(24)
      setHistoricalRisk(history)
      
    } catch (error) {
      console.error('更新風險數據失敗:', error)
    }
  }
  
  // 解決風險警報
  const handleResolveAlert = async (alertId: string) => {
    try {
      await TradingSystemAPI.resolveRiskAlert(alertId)
      setAlerts(prev => prev.map(alert => 
        alert.timestamp === alertId ? { ...alert, resolved: true } : alert
      ))
      notification.success({ message: '警報已解決' })
    } catch (error) {
      notification.error({ message: '解決警報失敗', description: error.message })
    }
  }
  
  // 緊急停止
  const handleEmergencyStop = async () => {
    try {
      await TradingSystemAPI.emergencyStop()
      setEmergencyMode(false)
      notification.warning({ message: '緊急停止已執行' })
    } catch (error) {
      notification.error({ message: '緊急停止失敗', description: error.message })
    }
  }
  
  // 重置風險管理
  const handleResetRiskManagement = async () => {
    try {
      await TradingSystemAPI.resetSystem()
      setEmergencyMode(false)
      setAlerts([])
      await initializeRiskManagement()
      notification.success({ message: '風險管理已重置' })
    } catch (error) {
      notification.error({ message: '重置失敗', description: error.message })
    }
  }
  
  // 渲染風險等級卡片
  const renderRiskLevelCard = () => {
    if (!riskMetrics) return null
    
    const riskLevel = riskMetrics.overall_risk_level
    const riskColor = TradingSystemUtils.getRiskLevelColor(riskLevel)
    const riskIcon = TradingSystemUtils.getRiskLevelIcon(riskLevel)
    
    return (
      <Card title="整體風險等級" size="small">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            {riskIcon}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: riskColor, marginBottom: '8px' }}>
            {riskLevel.toUpperCase()}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {TradingSystemUtils.formatTime(riskMetrics.timestamp)}
          </div>
        </div>
      </Card>
    )
  }
  
  // 渲染關鍵指標
  const renderKeyMetrics = () => {
    if (!riskMetrics) return null
    
    return (
      <Card title="關鍵風險指標" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="杠桿比率"
              value={riskMetrics.leverage_ratio * 100}
              precision={1}
              suffix="%"
              valueStyle={{ 
                color: riskMetrics.leverage_ratio > 0.8 ? '#f5222d' : 
                       riskMetrics.leverage_ratio > 0.5 ? '#fa8c16' : '#52c41a'
              }}
            />
            <Progress
              percent={riskMetrics.leverage_ratio * 100}
              size="small"
              strokeColor={
                riskMetrics.leverage_ratio > 0.8 ? '#f5222d' : 
                riskMetrics.leverage_ratio > 0.5 ? '#fa8c16' : '#52c41a'
              }
              showInfo={false}
              style={{ marginTop: '8px' }}
            />
          </Col>
          
          <Col span={6}>
            <Statistic
              title="當前回撤"
              value={riskMetrics.current_drawdown * 100}
              precision={2}
              suffix="%"
              valueStyle={{ 
                color: riskMetrics.current_drawdown > 0.1 ? '#f5222d' : 
                       riskMetrics.current_drawdown > 0.05 ? '#fa8c16' : '#52c41a'
              }}
            />
            <Progress
              percent={riskMetrics.current_drawdown * 100}
              size="small"
              strokeColor={
                riskMetrics.current_drawdown > 0.1 ? '#f5222d' : 
                riskMetrics.current_drawdown > 0.05 ? '#fa8c16' : '#52c41a'
              }
              showInfo={false}
              style={{ marginTop: '8px' }}
            />
          </Col>
          
          <Col span={6}>
            <Statistic
              title="最大持倉比例"
              value={riskMetrics.largest_position_ratio * 100}
              precision={1}
              suffix="%"
              valueStyle={{ 
                color: riskMetrics.largest_position_ratio > 0.3 ? '#f5222d' : 
                       riskMetrics.largest_position_ratio > 0.2 ? '#fa8c16' : '#52c41a'
              }}
            />
            <Progress
              percent={riskMetrics.largest_position_ratio * 100}
              size="small"
              strokeColor={
                riskMetrics.largest_position_ratio > 0.3 ? '#f5222d' : 
                riskMetrics.largest_position_ratio > 0.2 ? '#fa8c16' : '#52c41a'
              }
              showInfo={false}
              style={{ marginTop: '8px' }}
            />
          </Col>
          
          <Col span={6}>
            <Statistic
              title="流動性評分"
              value={riskMetrics.liquidity_score}
              precision={2}
              valueStyle={{ 
                color: riskMetrics.liquidity_score < 0.3 ? '#f5222d' : 
                       riskMetrics.liquidity_score < 0.6 ? '#fa8c16' : '#52c41a'
              }}
            />
            <Progress
              percent={riskMetrics.liquidity_score * 100}
              size="small"
              strokeColor={
                riskMetrics.liquidity_score < 0.3 ? '#f5222d' : 
                riskMetrics.liquidity_score < 0.6 ? '#fa8c16' : '#52c41a'
              }
              showInfo={false}
              style={{ marginTop: '8px' }}
            />
          </Col>
        </Row>
      </Card>
    )
  }
  
  // 渲染風險儀表板
  const renderRiskGauges = () => {
    if (!riskMetrics) return null
    
    const leverageGaugeConfig = {
      percent: riskMetrics.leverage_ratio,
      height: 200,
      range: {
        ticks: [0, 0.5, 0.8, 1],
        color: ['#52c41a', '#faad14', '#fa8c16', '#f5222d'],
      },
      statistic: {
        title: {
          formatter: () => '杠桿比率',
          style: { fontSize: '12px' },
        },
        content: {
          formatter: (datum: any) => `${(datum.percent * 100).toFixed(1)}%`,
          style: { fontSize: '16px' },
        },
      },
    }
    
    const drawdownGaugeConfig = {
      percent: riskMetrics.current_drawdown,
      height: 200,
      range: {
        ticks: [0, 0.05, 0.1, 0.2],
        color: ['#52c41a', '#faad14', '#fa8c16', '#f5222d'],
      },
      statistic: {
        title: {
          formatter: () => '當前回撤',
          style: { fontSize: '12px' },
        },
        content: {
          formatter: (datum: any) => `${(datum.percent * 100).toFixed(2)}%`,
          style: { fontSize: '16px' },
        },
      },
    }
    
    return (
      <Card title="風險儀表板" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Gauge {...leverageGaugeConfig} />
          </Col>
          <Col span={12}>
            <Gauge {...drawdownGaugeConfig} />
          </Col>
        </Row>
      </Card>
    )
  }
  
  // 渲染風險警報表格
  const renderAlertsTable = () => {
    const columns = [
      {
        title: '時間',
        dataIndex: 'timestamp',
        key: 'timestamp',
        render: (timestamp: string) => TradingSystemUtils.formatTime(timestamp),
        width: 150,
      },
      {
        title: '等級',
        dataIndex: 'level',
        key: 'level',
        render: (level: string) => {
          const color = TradingSystemUtils.getRiskLevelColor(level)
          const icon = TradingSystemUtils.getRiskLevelIcon(level)
          return (
            <Tag color={color}>
              {icon} {level.toUpperCase()}
            </Tag>
          )
        },
        width: 100,
      },
      {
        title: '類型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => <Tag>{type.replace('_', ' ').toUpperCase()}</Tag>,
        width: 120,
      },
      {
        title: '交易對',
        dataIndex: 'symbol',
        key: 'symbol',
        render: (symbol: string) => symbol ? <Tag color="blue">{symbol}</Tag> : '-',
        width: 100,
      },
      {
        title: '警報信息',
        dataIndex: 'message',
        key: 'message',
        ellipsis: true,
      },
      {
        title: '當前值',
        dataIndex: 'current_value',
        key: 'current_value',
        render: (value: number) => value ? TradingSystemUtils.formatPrice(value) : '-',
        width: 100,
      },
      {
        title: '閾值',
        dataIndex: 'threshold',
        key: 'threshold',
        render: (threshold: number) => threshold ? TradingSystemUtils.formatPrice(threshold) : '-',
        width: 100,
      },
      {
        title: '狀態',
        dataIndex: 'resolved',
        key: 'resolved',
        render: (resolved: boolean) => (
          <Badge
            status={resolved ? 'success' : 'error'}
            text={resolved ? '已解決' : '待處理'}
          />
        ),
        width: 100,
      },
      {
        title: '操作',
        key: 'actions',
        render: (record: RiskAlert) => (
          !record.resolved && (
            <Popconfirm
              title="確認解決此警報？"
              onConfirm={() => handleResolveAlert(record.timestamp)}
            >
              <Button size="small" type="link">
                解決
              </Button>
            </Popconfirm>
          )
        ),
        width: 80,
      },
    ]
    
    const activeAlerts = alerts.filter(alert => !alert.resolved)
    const resolvedAlerts = alerts.filter(alert => alert.resolved)
    
    return (
      <Card title="風險警報管理" size="small">
        <Tabs defaultActiveKey="active">
          <TabPane tab={`活躍警報 (${activeAlerts.length})`} key="active">
            <Table
              dataSource={activeAlerts}
              columns={columns}
              rowKey="timestamp"
              size="small"
              pagination={{ pageSize: 10 }}
              rowClassName={(record) => {
                if (record.level === 'critical') return 'risk-critical'
                if (record.level === 'high') return 'risk-high'
                return ''
              }}
            />
          </TabPane>
          <TabPane tab={`已解決 (${resolvedAlerts.length})`} key="resolved">
            <Table
              dataSource={resolvedAlerts}
              columns={columns}
              rowKey="timestamp"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>
    )
  }
  
  // 渲染歷史風險圖表
  const renderHistoricalRiskChart = () => {
    if (!historicalRisk.length) return null
    
    const config = {
      data: historicalRisk,
      xField: 'timestamp',
      yField: 'risk_level',
      height: 300,
      smooth: true,
      point: {
        size: 3,
        shape: 'circle',
      },
      tooltip: {
        formatter: (datum: any) => {
          return {
            name: '風險等級',
            value: datum.risk_level,
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
    }
    
    return (
      <Card title="風險等級歷史" size="small">
        <Line {...config} />
      </Card>
    )
  }
  
  // 渲染緊急操作面板
  const renderEmergencyPanel = () => {
    if (!emergencyMode) return null
    
    return (
      <Alert
        message="系統處於緊急狀態"
        description="檢測到高風險或緊急情況，請立即採取行動"
        type="error"
        showIcon
        action={
          <Space>
            <Button
              danger
              size="small"
              onClick={handleEmergencyStop}
              icon={<StopOutlined />}
            >
              緊急停止
            </Button>
            <Button
              size="small"
              onClick={handleResetRiskManagement}
              icon={<ReloadOutlined />}
            >
              重置系統
            </Button>
          </Space>
        }
        style={{ marginBottom: '16px' }}
      />
    )
  }
  
  // 渲染控制面板
  const renderControlPanel = () => {
    return (
      <Card title="風險管理控制" size="small">
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={updateRiskData}
            loading={loading}
          >
            刷新數據
          </Button>
          
          <Button
            icon={<SettingOutlined />}
            onClick={() => setConfigModalVisible(true)}
          >
            風險設置
          </Button>
          
          <Button
            icon={<AlertOutlined />}
            onClick={() => setAlerts([])}
          >
            清除警報
          </Button>
          
          <Button
            danger
            icon={<StopOutlined />}
            onClick={handleEmergencyStop}
          >
            緊急停止
          </Button>
        </Space>
      </Card>
    )
  }
  
  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <SyncOutlined spin style={{ fontSize: '24px' }} />
        <div style={{ marginTop: '16px' }}>正在加載風險管理數據...</div>
      </div>
    )
  }
  
  return (
    <div style={{ padding: '24px' }}>
      <style>{`
        .risk-critical {
          background-color: #fff2f0;
          border-left: 4px solid #f5222d;
        }
        .risk-high {
          background-color: #fff7e6;
          border-left: 4px solid #fa8c16;
        }
      `}</style>
      
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 頁面標題 */}
        <div>
          <h2>風險管理系統</h2>
          <p>實時監控和管理交易風險，確保資金安全</p>
        </div>
        
        {/* 緊急操作面板 */}
        {renderEmergencyPanel()}
        
        {/* 控制面板 */}
        {renderControlPanel()}
        
        {/* 風險等級和關鍵指標 */}
        <Row gutter={16}>
          <Col span={6}>
            {renderRiskLevelCard()}
          </Col>
          <Col span={18}>
            {renderKeyMetrics()}
          </Col>
        </Row>
        
        {/* 風險儀表板 */}
        {renderRiskGauges()}
        
        {/* 歷史風險圖表 */}
        {renderHistoricalRiskChart()}
        
        {/* 風險警報表格 */}
        {renderAlertsTable()}
      </Space>
    </div>
  )
}

export default EnhancedRiskManagement