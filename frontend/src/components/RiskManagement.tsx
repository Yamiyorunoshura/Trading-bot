import React, { useState } from 'react'
import { Card, Form, Input, InputNumber, Switch, Button, Alert, Progress, Row, Col, Statistic, Table, Tag } from 'antd'
import { ExclamationCircleOutlined, SaveOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'

const RiskManagement: React.FC = () => {
  const [form] = Form.useForm()
  const [riskAlerts, setRiskAlerts] = useState([
    {
      id: 1,
      type: 'warning',
      message: '當前回撤水平接近警戒線 (7.5%)',
      timestamp: '2024-01-07 15:30:00',
      level: 'medium'
    },
    {
      id: 2,
      type: 'info',
      message: '資金使用率正常 (65%)',
      timestamp: '2024-01-07 15:25:00',
      level: 'low'
    }
  ])

  const handleSaveSettings = async () => {
    try {
      const values = await form.validateFields()
      console.log('Risk settings:', values)
      // 保存風險設置
    } catch (error) {
      console.error('Form validation failed:', error)
    }
  }

  const riskColumns = [
    {
      title: '時間',
      dataIndex: 'timestamp',
      key: 'timestamp',
    },
    {
      title: '風險類型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const color = type === 'warning' ? 'orange' : type === 'error' ? 'red' : 'blue'
        return <Tag color={color}>{type === 'warning' ? '警告' : type === 'error' ? '錯誤' : '信息'}</Tag>
      }
    },
    {
      title: '風險等級',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => {
        const color = level === 'high' ? 'red' : level === 'medium' ? 'orange' : 'green'
        return <Tag color={color}>{level === 'high' ? '高' : level === 'medium' ? '中' : '低'}</Tag>
      }
    },
    {
      title: '描述',
      dataIndex: 'message',
      key: 'message',
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="當前回撤"
              value={7.5}
              precision={1}
              valueStyle={{ color: '#faad14' }}
              suffix="%"
            />
            <Progress 
              percent={75} 
              status="active"
              strokeColor="#faad14"
              size="small"
              style={{ marginTop: '10px' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="風險敞口"
              value={6500}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              suffix="USD"
            />
            <Progress 
              percent={65} 
              status="normal"
              strokeColor="#1890ff"
              size="small"
              style={{ marginTop: '10px' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="VaR (95%)"
              value={285.50}
              precision={2}
              valueStyle={{ color: '#ff4d4f' }}
              suffix="USD"
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="夏普比率"
              value={1.85}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 風險警報 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col xs={24}>
          <Card title="風險警報">
            {riskAlerts.map(alert => (
              <Alert
                key={alert.id}
                message={alert.message}
                type={alert.type as any}
                showIcon
                style={{ marginBottom: '10px' }}
              />
            ))}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="風險參數設置">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                max_drawdown: 10,
                max_position_size: 5000,
                max_daily_loss: 500,
                max_leverage: 3,
                stop_loss_enabled: true,
                stop_loss_percentage: 2,
                take_profit_enabled: true,
                take_profit_percentage: 4,
                position_size_limit: 1000,
                correlation_limit: 0.7,
                concentration_limit: 30,
                volatility_limit: 25
              }}
            >
              <h4 style={{ color: '#ffffff', marginBottom: '16px' }}>
                <WarningOutlined style={{ marginRight: '8px' }} />
                基本風險控制
              </h4>
              
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

              <Form.Item
                label="單日最大虧損"
                name="max_daily_loss"
                rules={[{ required: true, message: '請輸入單日最大虧損' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={50}
                  addonAfter="USD"
                />
              </Form.Item>

              <Form.Item
                label="最大槓桿倍數"
                name="max_leverage"
                rules={[{ required: true, message: '請輸入最大槓桿倍數' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={10}
                  step={0.1}
                  addonAfter="倍"
                />
              </Form.Item>

              <h4 style={{ color: '#ffffff', marginBottom: '16px', marginTop: '24px' }}>
                止損止盈設置
              </h4>

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

              <h4 style={{ color: '#ffffff', marginBottom: '16px', marginTop: '24px' }}>
                高級風險控制
              </h4>

              <Form.Item
                label="倉位集中度限制"
                name="concentration_limit"
                rules={[{ required: true, message: '請輸入倉位集中度限制' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  step={1}
                  addonAfter="%"
                />
              </Form.Item>

              <Form.Item
                label="相關性限制"
                name="correlation_limit"
                rules={[{ required: true, message: '請輸入相關性限制' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </Form.Item>

              <Form.Item
                label="波動率限制"
                name="volatility_limit"
                rules={[{ required: true, message: '請輸入波動率限制' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  step={1}
                  addonAfter="%"
                />
              </Form.Item>

              <Form.Item style={{ marginTop: '24px' }}>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />}
                  onClick={handleSaveSettings}
                  style={{ width: '100%' }}
                >
                  保存設置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="風險監控記錄">
            <Table
              dataSource={riskAlerts}
              columns={riskColumns}
              size="small"
              pagination={false}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default RiskManagement