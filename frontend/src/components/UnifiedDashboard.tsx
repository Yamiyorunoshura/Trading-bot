import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Button, Dropdown, Space, Alert, Badge, Menu } from 'antd'
import { 
  DashboardOutlined, 
  RobotOutlined, 
  LineChartOutlined,
  SafetyOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  MoreOutlined,
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import SystemOverview from './SystemOverview'
import QuickActions from './QuickActions'
import { useAppStore } from '../stores/appStore'
import './UnifiedDashboard.css'

interface DashboardStats {
  totalStrategies: number
  activeStrategies: number
  totalProfit: number
  dailyProfit: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  systemHealth: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL'
}

interface QuickActionItem {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  action: () => void
  badge?: number
}

const UnifiedDashboard: React.FC = () => {
  const { systemStatus, isWebSocketConnected } = useAppStore()
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalStrategies: 0,
    activeStrategies: 0,
    totalProfit: 0,
    dailyProfit: 0,
    riskLevel: 'LOW',
    systemHealth: 'GOOD'
  })

  const [selectedModule, setSelectedModule] = useState<string>('overview')

  // 模擬數據更新
  useEffect(() => {
    const updateStats = () => {
      setDashboardStats({
        totalStrategies: 5,
        activeStrategies: 2,
        totalProfit: 15420.50,
        dailyProfit: 245.80,
        riskLevel: 'MEDIUM',
        systemHealth: 'EXCELLENT'
      })
    }

    updateStats()
    const interval = setInterval(updateStats, 10000) // 10秒更新一次

    return () => clearInterval(interval)
  }, [])

  const quickActions: QuickActionItem[] = [
    {
      key: 'start-trading',
      label: '開始交易',
      icon: <PlayCircleOutlined />,
      color: '#52c41a',
      action: () => console.log('Start trading'),
      badge: systemStatus?.bot_running ? 0 : 1
    },
    {
      key: 'pause-trading', 
      label: '暫停交易',
      icon: <PauseCircleOutlined />,
      color: '#faad14',
      action: () => console.log('Pause trading')
    },
    {
      key: 'new-strategy',
      label: '新建策略',
      icon: <RobotOutlined />,
      color: '#1890ff',
      action: () => console.log('Create new strategy')
    },
    {
      key: 'view-profit',
      label: '查看收益',
      icon: <TrophyOutlined />,
      color: '#13c2c2',
      action: () => console.log('View profit')
    },
    {
      key: 'risk-check',
      label: '風險檢查',
      icon: <SafetyOutlined />,
      color: '#eb2f96',
      action: () => console.log('Risk check'),
      badge: dashboardStats.riskLevel === 'HIGH' ? 1 : 0
    },
    {
      key: 'system-settings',
      label: '系統設置',
      icon: <SettingOutlined />,
      color: '#722ed1',
      action: () => console.log('System settings')
    }
  ]

  const navigationModules = [
    {
      key: 'overview',
      title: '系統總覽',
      icon: <DashboardOutlined />,
      description: '查看系統整體狀態和關鍵指標',
      color: '#1890ff'
    },
    {
      key: 'strategies',
      title: '策略管理中心',
      icon: <RobotOutlined />,
      description: '管理和配置交易策略',
      color: '#52c41a',
      badge: dashboardStats.activeStrategies
    },
    {
      key: 'trading',
      title: '交易管理中心', 
      icon: <FireOutlined />,
      description: '實時交易監控和風險控制',
      color: '#fa541c'
    },
    {
      key: 'analysis',
      title: '分析報告中心',
      icon: <LineChartOutlined />,
      description: '回測分析和收益報告',
      color: '#13c2c2'
    },
    {
      key: 'system',
      title: '系統管理中心',
      icon: <SettingOutlined />,
      description: '系統設置和性能監控',
      color: '#722ed1'
    }
  ]

  const getHealthStatusColor = (health: string) => {
    switch (health) {
      case 'EXCELLENT': return '#52c41a'
      case 'GOOD': return '#13c2c2'
      case 'WARNING': return '#faad14'
      case 'CRITICAL': return '#ff4d4f'
      default: return '#1890ff'
    }
  }

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return '#52c41a'
      case 'MEDIUM': return '#faad14'
      case 'HIGH': return '#ff4d4f'
      default: return '#1890ff'
    }
  }

  const refreshDashboard = () => {
    console.log('Refreshing dashboard...')
    // 重新獲取數據邏輯
  }

  const moreActionsMenu = (
    <Menu
      items={[
        {
          key: 'export-data',
          label: '導出數據',
        },
        {
          key: 'import-config',
          label: '導入配置',
        },
        {
          key: 'backup-system',
          label: '系統備份',
        },
        {
          key: 'performance-test',
          label: '性能測試',
        },
      ]}
    />
  )

  return (
    <div className="unified-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="dashboard-title">
              <ThunderboltOutlined className="title-icon" />
              量化交易統一控制台
            </h1>
            <p className="dashboard-subtitle">
              v1.03 統一用戶面板 | 智能策略管理平台
            </p>
          </div>
          
          <div className="header-right">
            <Space size="middle">
              <Badge 
                status={isWebSocketConnected ? 'success' : 'error'}
                text={isWebSocketConnected ? '實時連接' : '連接斷開'}
              />
              <Badge 
                status={systemStatus?.bot_running ? 'processing' : 'default'}
                text={systemStatus?.bot_running ? '交易運行中' : '系統待機'}
              />
              <Button 
                icon={<ReloadOutlined />}
                onClick={refreshDashboard}
                type="text"
                className="neon-button"
              >
                刷新
              </Button>
              <Dropdown overlay={moreActionsMenu} trigger={['click']}>
                <Button 
                  icon={<MoreOutlined />}
                  type="text"
                  className="neon-button"
                />
              </Dropdown>
            </Space>
          </div>
        </div>
      </div>

      {/* System Status Alert */}
      {dashboardStats.systemHealth === 'CRITICAL' && (
        <Alert
          message="系統警告"
          description="檢測到系統異常，請立即檢查相關設置"
          type="error"
          showIcon
          closable
          className="system-alert"
        />
      )}

      {/* Dashboard Statistics */}
      <Row gutter={[16, 16]} className="dashboard-stats">
        <Col xs={24} sm={12} lg={6}>
          <Card className="neon-stat-card">
            <Statistic
              title="策略總數"
              value={dashboardStats.totalStrategies}
              prefix={<RobotOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="neon-stat-card">
            <Statistic
              title="運行策略"
              value={dashboardStats.activeStrategies}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={`/ ${dashboardStats.totalStrategies}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="neon-stat-card">
            <Statistic
              title="總收益 (USD)"
              value={dashboardStats.totalProfit}
              precision={2}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: dashboardStats.totalProfit >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="neon-stat-card">
            <Statistic
              title="日收益 (USD)"
              value={dashboardStats.dailyProfit}
              precision={2}
              prefix={<LineChartOutlined />}
              valueStyle={{ color: dashboardStats.dailyProfit >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions Panel */}
      <QuickActions 
        actions={quickActions}
        title="快速操作"
      />

      {/* Main Content Area */}
      <Row gutter={[16, 16]} className="main-content">
        {/* Navigation Modules */}
        <Col xs={24} lg={8}>
          <Card 
            title="功能中心導航" 
            className="neon-card navigation-card"
            extra={
              <Badge 
                count={dashboardStats.activeStrategies} 
                style={{ backgroundColor: '#52c41a' }}
              />
            }
          >
            <div className="navigation-modules">
              {navigationModules.map((module) => (
                <Card
                  key={module.key}
                  className={`module-card ${selectedModule === module.key ? 'active' : ''}`}
                  size="small"
                  hoverable
                  onClick={() => setSelectedModule(module.key)}
                >
                  <div className="module-content">
                    <div className="module-header">
                      <span 
                        className="module-icon"
                        style={{ color: module.color }}
                      >
                        {module.icon}
                      </span>
                      <div className="module-info">
                        <h4 className="module-title">{module.title}</h4>
                        {module.badge && (
                          <Badge 
                            count={module.badge} 
                            size="small"
                            style={{ backgroundColor: module.color }}
                          />
                        )}
                      </div>
                    </div>
                    <p className="module-description">
                      {module.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </Col>

        {/* System Overview */}
        <Col xs={24} lg={16}>
          <SystemOverview 
            systemHealth={dashboardStats.systemHealth}
            riskLevel={dashboardStats.riskLevel}
            healthColor={getHealthStatusColor(dashboardStats.systemHealth)}
            riskColor={getRiskLevelColor(dashboardStats.riskLevel)}
          />
        </Col>
      </Row>
    </div>
  )
}

export default UnifiedDashboard