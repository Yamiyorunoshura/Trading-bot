/**
 * 統一風險管理組件
 * 整合並簡化原有的 RiskManagement 和 EnhancedRiskManagement 功能
 * 第四階段：風險管理系統界面簡化
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
  Button,
  Form,
  InputNumber,
  Switch,
  Modal,
  notification,
  Tooltip,
  Badge,
  Timeline
} from 'antd'
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  SafetyOutlined,
  SettingOutlined,
  ReloadOutlined,
  StopOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  SaveOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { Gauge, Line } from '@ant-design/plots'

interface RiskMetrics {
  overall_risk_level: string
  current_drawdown: number
  leverage_ratio: number
  position_exposure: number
  var_95: number
  sharpe_ratio: number
  margin_ratio: number
  daily_pnl: number
  timestamp: string
}

interface RiskAlert {
  id: string
  timestamp: string
  level: 'critical' | 'high' | 'medium' | 'low'
  type: string
  message: string
  resolved: boolean
}

interface RiskLimitsConfig {
  max_drawdown: number
  max_position_size: number
  max_leverage: number
  daily_loss_limit: number
  stop_loss_enabled: boolean
  stop_loss_percentage: number
  take_profit_enabled: boolean
  take_profit_percentage: number
  margin_call_ratio: number
}

const UnifiedRiskManagement: React.FC = () => {
  // 狀態管理
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    overall_risk_level: 'medium',
    current_drawdown: 0.075,
    leverage_ratio: 0.65,
    position_exposure: 6500,
    var_95: 285.50,
    sharpe_ratio: 1.85,
    margin_ratio: 0.85,
    daily_pnl: -125.30,
    timestamp: new Date().toISOString()
  })

  const [alerts, setAlerts] = useState<RiskAlert[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      level: 'medium',
      type: 'drawdown_warning',
      message: '當前回撤水平接近警戒線 (7.5%)',
      resolved: false
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      level: 'low',
      type: 'margin_info',
      message: '保證金比率正常 (85%)',
      resolved: true
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      level: 'high',
      type: 'leverage_warning',
      message: '杠桿使用率較高 (65%)',
      resolved: false
    }
  ])

  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  // 初始化風險配置
  const defaultRiskConfig: RiskLimitsConfig = {
    max_drawdown: 10,
    max_position_size: 5000,
    max_leverage: 3,
    daily_loss_limit: 500,
    stop_loss_enabled: true,
    stop_loss_percentage: 2,
    take_profit_enabled: true,
    take_profit_percentage: 4,
    margin_call_ratio: 0.5
  }

  useEffect(() => {
    // 初始化表單
    form.setFieldsValue(defaultRiskConfig)

    // 模擬實時數據更新
    const interval = setInterval(() => {
      setRiskMetrics(prev => ({
        ...prev,
        current_drawdown: Math.max(0, prev.current_drawdown + (Math.random() - 0.5) * 0.01),
        leverage_ratio: Math.max(0, Math.min(1, prev.leverage_ratio + (Math.random() - 0.5) * 0.05)),
        position_exposure: prev.position_exposure + (Math.random() - 0.5) * 100,
        daily_pnl: prev.daily_pnl + (Math.random() - 0.5) * 10,
        timestamp: new Date().toISOString()
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [form])

  // 獲取風險等級顏色
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return '#f5222d'
      case 'high': return '#fa8c16'
      case 'medium': return '#faad14'
      case 'low': return '#52c41a'
      default: return '#1890ff'
    }
  }

  // 獲取風險等級圖標
  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <ExclamationCircleOutlined />
      case 'high': return <WarningOutlined />
      case 'medium': return <AlertOutlined />
      case 'low': return <SafetyOutlined />
      default: return <CheckCircleOutlined />
    }
  }

  // 保存風險配置
  const handleSaveRiskConfig = async () => {
    try {
      const values = await form.validateFields()
      console.log('Risk configuration saved:', values)
      notification.success({ message: '風險配置已保存' })
      setConfigModalVisible(false)
    } catch (error) {
      notification.error({ message: '保存失敗', description: '請檢查輸入參數' })
    }
  }

  // 緊急停止
  const handleEmergencyStop = () => {
    Modal.confirm({
      title: '確認緊急停止',
      content: '這將立即停止所有交易活動，確定要執行嗎？',
      okText: '確認',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        notification.warning({ message: '緊急停止已執行' })
      }
    })
  }

  // 清除警報
  const handleClearAlerts = () => {
    setAlerts(alerts.map(alert => ({ ...alert, resolved: true })))
    notification.success({ message: '所有警報已清除' })
  }

  // 刷新數據
  const handleRefreshData = () => {
    setLoading(true)
    setTimeout(() => {
      setRiskMetrics(prev => ({
        ...prev,
        timestamp: new Date().toISOString()
      }))
      setLoading(false)
      notification.success({ message: '數據已刷新' })
    }, 1000)
  }

  // 渲染風險等級卡片
  const renderRiskLevelCard = () => {
    const level = riskMetrics.overall_risk_level
    const color = getRiskLevelColor(level)
    const icon = getRiskLevelIcon(level)

    const gaugeConfig = {
      percent: level === 'critical' ? 0.9 : level === 'high' ? 0.7 : level === 'medium' ? 0.5 : 0.3,
      range: {
        color: ['#30BF78', '#FAAD14', '#F4664A'],
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
            fontSize: '24px',
            lineHeight: '24px',
            color: color,
          },
          formatter: () => level.toUpperCase(),
        },
      },
    }

    return (
      <Card title="整體風險等級" size="small">
        <div style={{ textAlign: 'center' }}>
          <Gauge {...gaugeConfig} height={200} />
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
            最後更新: {new Date(riskMetrics.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </Card>
    )
  }

  // 渲染關鍵指標
  const renderKeyMetrics = () => {
    return (
      <Card title="關鍵風險指標" size="small">
        <Row gutter={16}>
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
              title="杠桿使用率"
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
              title="風險敞口"
              value={riskMetrics.position_exposure}
              precision={0}
              suffix="USD"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          
          <Col span={6}>
            <Statistic
              title="VaR (95%)"
              value={riskMetrics.var_95}
              precision={2}
              suffix="USD"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
        </Row>
      </Card>
    )
  }

  // 渲染控制面板
  const renderControlPanel = () => {
    const unresolvedAlerts = alerts.filter(alert => !alert.resolved)
    const criticalAlerts = unresolvedAlerts.filter(alert => alert.level === 'critical')

    return (
      <Card title="風險管理控制" size="small">
        <Row gutter={16}>
          <Col span={16}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshData}
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
                onClick={handleClearAlerts}
                disabled={unresolvedAlerts.length === 0}
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
          </Col>
          
          <Col span={8} style={{ textAlign: 'right' }}>
            <Space>
              <Badge count={unresolvedAlerts.length} offset={[10, 0]}>
                <Button type="text">
                  總警報: {unresolvedAlerts.length}
                </Button>
              </Badge>
              
              {criticalAlerts.length > 0 && (
                <Badge count={criticalAlerts.length} offset={[10, 0]} color="red">
                  <Button type="text" danger>
                    嚴重警報: {criticalAlerts.length}
                  </Button>
                </Badge>
              )}
            </Space>
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
        render: (timestamp: string) => new Date(timestamp).toLocaleTimeString(),
        width: 100
      },
      {
        title: '等級',
        dataIndex: 'level',
        key: 'level',
        render: (level: string) => {
          const color = getRiskLevelColor(level)
          const icon = getRiskLevelIcon(level)
          return (
            <Tag color={level === 'critical' ? 'red' : level === 'high' ? 'orange' : level === 'medium' ? 'yellow' : 'green'}>
              {icon} {level.toUpperCase()}
            </Tag>
          )
        },
        width: 100
      },
      {
        title: '類型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => type.replace('_', ' ').toUpperCase(),
        width: 120
      },
      {
        title: '描述',
        dataIndex: 'message',
        key: 'message'
      },
      {
        title: '狀態',
        dataIndex: 'resolved',
        key: 'resolved',
        render: (resolved: boolean) => (
          <Tag color={resolved ? 'green' : 'red'}>
            {resolved ? '已解決' : '待處理'}
          </Tag>
        ),
        width: 80
      }
    ]

    return (
      <Card title="風險警報記錄" size="small">
        <Table
          dataSource={alerts}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          scroll={{ y: 300 }}
          rowClassName={(record) => 
            record.level === 'critical' && !record.resolved ? 'risk-critical' : 
            record.level === 'high' && !record.resolved ? 'risk-high' : ''
          }
        />
      </Card>
    )
  }

  // 渲染風險配置模態框
  const renderConfigModal = () => {
    return (
      <Modal
        title="風險管理配置"
        open={configModalVisible}
        onOk={handleSaveRiskConfig}
        onCancel={() => setConfigModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="最大回撤限制"
                name="max_drawdown"
                rules={[{ required: true, message: '請輸入最大回撤限制' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={50}
                  step={0.1}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="最大單倉位"
                name="max_position_size"
                rules={[{ required: true, message: '請輸入最大單倉位' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={100}
                  addonAfter="USD"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="最大杠桿倍數"
                name="max_leverage"
                rules={[{ required: true, message: '請輸入最大杠桿倍數' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={10}
                  step={0.1}
                  addonAfter="倍"
                />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="單日最大虧損"
                name="daily_loss_limit"
                rules={[{ required: true, message: '請輸入單日最大虧損' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={50}
                  addonAfter="USD"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="啟用止損"
                name="stop_loss_enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              
              <Form.Item
                label="止損百分比"
                name="stop_loss_percentage"
                rules={[{ required: true, message: '請輸入止損百分比' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={20}
                  step={0.1}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="啟用止盈"
                name="take_profit_enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              
              <Form.Item
                label="止盈百分比"
                name="take_profit_percentage"
                rules={[{ required: true, message: '請輸入止盈百分比' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={50}
                  step={0.1}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="保證金警戒比率"
            name="margin_call_ratio"
            rules={[{ required: true, message: '請輸入保證金警戒比率' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={1}
              step={0.01}
            />
          </Form.Item>
        </Form>
      </Modal>
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
          <h2>
            <ThunderboltOutlined style={{ marginRight: '8px' }} />
            統一風險管理系統
          </h2>
          <p>實時監控和管理交易風險，確保資金安全</p>
        </div>
        
        {/* 控制面板 */}
        {renderControlPanel()}
        
        {/* 風險等級和關鍵指標 */}
        <Row gutter={16}>
          <Col span={8}>
            {renderRiskLevelCard()}
          </Col>
          <Col span={16}>
            {renderKeyMetrics()}
          </Col>
        </Row>
        
        {/* 風險警報表格 */}
        {renderAlertsTable()}
        
        {/* 風險配置模態框 */}
        {renderConfigModal()}
      </Space>
    </div>
  )
}

export default UnifiedRiskManagement 