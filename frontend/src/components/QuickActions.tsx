import React, { useState } from 'react'
import { Card, Row, Col, Button, Badge, Tooltip, Dropdown, Menu, Space } from 'antd'
import { 
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  RobotOutlined,
  LineChartOutlined,
  SafetyOutlined,
  SettingOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  ReloadOutlined,
  AlertOutlined
} from '@ant-design/icons'

interface QuickActionItem {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  action: () => void
  badge?: number
  disabled?: boolean
  tooltip?: string
  dropdown?: boolean
  dropdownItems?: Array<{
    key: string
    label: string
    icon?: React.ReactNode
    action: () => void
  }>
}

interface QuickActionsProps {
  actions: QuickActionItem[]
  title?: string
}

const QuickActions: React.FC<QuickActionsProps> = ({ 
  actions = [], 
  title = "快速操作" 
}) => {
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set())

  const handleAction = async (actionKey: string, actionFn: () => void) => {
    setLoadingActions(prev => new Set([...prev, actionKey]))
    
    try {
      await actionFn()
    } catch (error) {
      console.error(`Action ${actionKey} failed:`, error)
    } finally {
      setTimeout(() => {
        setLoadingActions(prev => {
          const newSet = new Set(prev)
          newSet.delete(actionKey)
          return newSet
        })
      }, 1000)
    }
  }

  const defaultActions: QuickActionItem[] = [
    {
      key: 'emergency-stop',
      label: '緊急停止',
      icon: <StopOutlined />,
      color: '#ff4d4f',
      action: () => console.log('Emergency stop'),
      tooltip: '立即停止所有交易活動',
    },
    {
      key: 'trading-control',
      label: '交易控制',
      icon: <PlayCircleOutlined />,
      color: '#52c41a',
      action: () => console.log('Trading control'),
      dropdown: true,
      dropdownItems: [
        {
          key: 'start-all',
          label: '啟動所有策略',
          icon: <PlayCircleOutlined />,
          action: () => console.log('Start all strategies')
        },
        {
          key: 'pause-all',
          label: '暫停所有策略',
          icon: <PauseCircleOutlined />,
          action: () => console.log('Pause all strategies')
        },
        {
          key: 'restart-system',
          label: '重啟系統',
          icon: <ReloadOutlined />,
          action: () => console.log('Restart system')
        }
      ]
    },
    {
      key: 'strategy-management',
      label: '策略管理',
      icon: <RobotOutlined />,
      color: '#1890ff',
      action: () => console.log('Strategy management'),
      dropdown: true,
      dropdownItems: [
        {
          key: 'new-strategy',
          label: '新建策略',
          icon: <PlusOutlined />,
          action: () => console.log('Create new strategy')
        },
        {
          key: 'edit-strategy',
          label: '編輯策略',
          icon: <EditOutlined />,
          action: () => console.log('Edit strategy')
        },
        {
          key: 'clone-strategy',
          label: '複製策略',
          icon: <ExportOutlined />,
          action: () => console.log('Clone strategy')
        },
        {
          key: 'import-strategy',
          label: '導入策略',
          icon: <ImportOutlined />,
          action: () => console.log('Import strategy')
        }
      ]
    },
    {
      key: 'analysis-tools',
      label: '分析工具',
      icon: <LineChartOutlined />,
      color: '#13c2c2',
      action: () => console.log('Analysis tools'),
      dropdown: true,
      dropdownItems: [
        {
          key: 'profit-analysis',
          label: '收益分析',
          icon: <LineChartOutlined />,
          action: () => console.log('Profit analysis')
        },
        {
          key: 'backtest-analysis',
          label: '回測分析',
          icon: <EyeOutlined />,
          action: () => console.log('Backtest analysis')
        },
        {
          key: 'risk-analysis',
          label: '風險分析',
          icon: <SafetyOutlined />,
          action: () => console.log('Risk analysis')
        }
      ]
    },
    {
      key: 'risk-control',
      label: '風險控制',
      icon: <SafetyOutlined />,
      color: '#eb2f96',
      action: () => console.log('Risk control'),
      badge: 2,
      tooltip: '檢測到2個風險警告',
    },
    {
      key: 'system-config',
      label: '系統配置',
      icon: <SettingOutlined />,
      color: '#722ed1',
      action: () => console.log('System config'),
      dropdown: true,
      dropdownItems: [
        {
          key: 'general-settings',
          label: '常規設置',
          icon: <SettingOutlined />,
          action: () => console.log('General settings')
        },
        {
          key: 'api-config',
          label: 'API配置',
          icon: <EditOutlined />,
          action: () => console.log('API config')
        },
        {
          key: 'notification-settings',
          label: '通知設置',
          icon: <AlertOutlined />,
          action: () => console.log('Notification settings')
        }
      ]
    }
  ]

  const allActions = actions.length > 0 ? actions : defaultActions

  const renderActionButton = (action: QuickActionItem) => {
    const isLoading = loadingActions.has(action.key)
    
    const button = (
      <Button
        key={action.key}
        type="primary"
        size="large"
        loading={isLoading}
        disabled={action.disabled}
        className={`action-button neon-button-${action.color.replace('#', '')}`}
        style={{ 
          backgroundColor: action.color,
          borderColor: action.color,
          height: '80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          position: 'relative'
        }}
        onClick={() => !action.dropdown && handleAction(action.key, action.action)}
      >
        <Badge 
          count={action.badge || 0} 
          size="small"
          style={{ position: 'absolute', top: '8px', right: '8px' }}
        >
          <div className="action-content">
            <span style={{ fontSize: '24px' }}>{action.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: 'normal' }}>
              {action.label}
            </span>
          </div>
        </Badge>
      </Button>
    )

    if (action.dropdown && action.dropdownItems) {
      const dropdownMenu = (
        <Menu
          items={action.dropdownItems.map(item => ({
            key: item.key,
            label: item.label,
            icon: item.icon,
            onClick: () => handleAction(item.key, item.action)
          }))}
        />
      )
      
      return (
        <Dropdown 
          key={action.key}
          overlay={dropdownMenu} 
          trigger={['click']}
          placement="bottomCenter"
        >
          {action.tooltip ? (
            <Tooltip title={action.tooltip} placement="top">
              {button}
            </Tooltip>
          ) : button}
        </Dropdown>
      )
    }

    return action.tooltip ? (
      <Tooltip key={action.key} title={action.tooltip} placement="top">
        {button}
      </Tooltip>
    ) : button
  }

  return (
    <Card 
      title={
        <div className="quick-actions-title">
          <PlayCircleOutlined className="title-icon" />
          {title}
        </div>
      }
      className="quick-actions-card neon-card"
      extra={
        <Space>
          <Button 
            type="text" 
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => console.log('Refresh actions')}
          >
            刷新
          </Button>
        </Space>
      }
    >
      <Row gutter={[12, 12]} className="actions-grid">
        {allActions.map((action, index) => (
          <Col 
            key={action.key || index}
            xs={12} 
            sm={8} 
            md={6} 
            lg={4} 
            xl={4}
          >
            {renderActionButton(action)}
          </Col>
        ))}
      </Row>

      {/* 快捷鍵提示 */}
      <div className="shortcuts-hint">
        <Space size="large" wrap>
          <span className="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>S</kbd> 緊急停止
          </span>
          <span className="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>R</kbd> 重啟系統
          </span>
          <span className="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>N</kbd> 新建策略
          </span>
        </Space>
      </div>
    </Card>
  )
}

export default QuickActions