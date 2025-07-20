import React, { useState, useEffect } from 'react'
import { Card, Progress, Row, Col, Statistic, Timeline, Badge, Tag, Tabs, Table } from 'antd'
import { 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  DashboardOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  FireOutlined
} from '@ant-design/icons'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SystemOverviewProps {
  systemHealth: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  healthColor: string
  riskColor: string
}

interface SystemMetric {
  name: string
  value: number
  unit: string
  status: 'normal' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
}

interface PerformanceData {
  time: string
  profit: number
  drawdown: number
  volume: number
}

const SystemOverview: React.FC<SystemOverviewProps> = ({
  systemHealth,
  riskLevel,
  healthColor,
  riskColor
}) => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [activeTab, setActiveTab] = useState<string>('1')

  useEffect(() => {
    // 模擬系統指標數據
    setSystemMetrics([
      {
        name: 'CPU使用率',
        value: 45,
        unit: '%',
        status: 'normal',
        trend: 'stable'
      },
      {
        name: '內存使用率',
        value: 68,
        unit: '%',
        status: 'normal',
        trend: 'up'
      },
      {
        name: '網絡延遲',
        value: 12,
        unit: 'ms',
        status: 'normal',
        trend: 'down'
      },
      {
        name: '活躍連接',
        value: 8,
        unit: '個',
        status: 'normal',
        trend: 'stable'
      }
    ])

    // 模擬性能數據
    const generatePerformanceData = () => {
      const data: PerformanceData[] = []
      const now = new Date()
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000)
        data.push({
          time: time.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
          profit: Math.random() * 500 + 200,
          drawdown: Math.random() * 50,
          volume: Math.random() * 1000 + 500
        })
      }
      
      return data
    }

    setPerformanceData(generatePerformanceData())
  }, [])

  const systemActivities = [
    {
      time: '09:30',
      status: 'success',
      title: '策略啟動',
      description: '動態倉位策略已成功啟動'
    },
    {
      time: '09:15',
      status: 'warning',
      title: '風險警告',
      description: '檢測到市場波動率上升'
    },
    {
      time: '09:00',
      status: 'success',
      title: '市場開盤',
      description: '系統已連接至交易所API'
    },
    {
      time: '08:45',
      status: 'info',
      title: '數據更新',
      description: '歷史數據同步完成'
    }
  ]

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'EXCELLENT': return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'GOOD': return <CheckCircleOutlined style={{ color: '#13c2c2' }} />
      case 'WARNING': return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      case 'CRITICAL': return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      default: return <LoadingOutlined />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return '#52c41a'
      case 'warning': return '#faad14'
      case 'critical': return '#ff4d4f'
      default: return '#1890ff'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <RiseOutlined style={{ color: '#52c41a' }} />
      case 'down': return <FallOutlined style={{ color: '#ff4d4f' }} />
      default: return <DashboardOutlined style={{ color: '#1890ff' }} />
    }
  }

  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <DashboardOutlined />
          系統狀態
        </span>
      ),
      children: (
        <div className="system-status-tab">
          <Row gutter={[16, 16]}>
            {systemMetrics.map((metric, index) => (
              <Col xs={12} lg={6} key={index}>
                <Card className="metric-card neon-border">
                  <div className="metric-header">
                    <span className="metric-name">{metric.name}</span>
                    {getTrendIcon(metric.trend)}
                  </div>
                  <div className="metric-value">
                    <span className="value" style={{ color: getStatusColor(metric.status) }}>
                      {metric.value}
                    </span>
                    <span className="unit">{metric.unit}</span>
                  </div>
                  <Progress 
                    percent={metric.name === '網絡延遲' ? 100 - metric.value : metric.value}
                    strokeColor={getStatusColor(metric.status)}
                    size="small"
                    showInfo={false}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )
    },
    {
      key: '2',
      label: (
        <span>
          <TrophyOutlined />
          性能監控
        </span>
      ),
      children: (
        <div className="performance-tab">
          <Card className="neon-border">
            <h4>24小時性能趨勢</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#52c41a" 
                  fill="#52c41a20"
                  name="收益"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )
    },
    {
      key: '3',
      label: (
        <span>
          <ClockCircleOutlined />
          系統活動
        </span>
      ),
      children: (
        <div className="activity-tab">
          <Timeline mode="left">
            {systemActivities.map((activity, index) => (
              <Timeline.Item
                key={index}
                dot={
                  activity.status === 'success' ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : activity.status === 'warning' ? (
                    <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                  ) : (
                    <ClockCircleOutlined style={{ color: '#1890ff' }} />
                  )
                }
              >
                <div className="activity-item">
                  <div className="activity-header">
                    <span className="activity-time">{activity.time}</span>
                    <span className="activity-title">{activity.title}</span>
                  </div>
                  <p className="activity-description">{activity.description}</p>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </div>
      )
    }
  ]

  return (
    <div className="system-overview">
      <Card 
        title={
          <div className="overview-title">
            <ThunderboltOutlined className="title-icon" />
            系統總覽面板
          </div>
        }
        className="neon-card overview-card"
        extra={
          <div className="status-indicators">
            <Badge 
              color={healthColor}
              text={`系統健康: ${systemHealth}`}
            />
            <Badge 
              color={riskColor}
              text={`風險等級: ${riskLevel}`}
            />
          </div>
        }
      >
        {/* Health Status Summary */}
        <Row gutter={[16, 16]} className="health-summary">
          <Col xs={24} sm={8}>
            <Card className="health-card neon-border" size="small">
              <div className="health-content">
                {getHealthIcon(systemHealth)}
                <div className="health-info">
                  <h4>系統健康</h4>
                  <Tag color={healthColor} className="health-tag">
                    {systemHealth}
                  </Tag>
                </div>
              </div>
            </Card>
          </Col>
          
          <Col xs={24} sm={8}>
            <Card className="health-card neon-border" size="small">
              <div className="health-content">
                <SafetyOutlined style={{ color: riskColor, fontSize: '24px' }} />
                <div className="health-info">
                  <h4>風險等級</h4>
                  <Tag color={riskColor} className="health-tag">
                    {riskLevel}
                  </Tag>
                </div>
              </div>
            </Card>
          </Col>
          
          <Col xs={24} sm={8}>
            <Card className="health-card neon-border" size="small">
              <div className="health-content">
                <FireOutlined style={{ color: '#fa541c', fontSize: '24px' }} />
                <div className="health-info">
                  <h4>運行時間</h4>
                  <Tag color="#fa541c" className="health-tag">
                    8h 32m
                  </Tag>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Detailed Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="overview-tabs"
        />
      </Card>
    </div>
  )
}

export default SystemOverview