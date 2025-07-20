import React, { useState } from 'react'
import { Form, Input, Select, InputNumber, Card, Row, Col, Divider, Alert, Space } from 'antd'
import { ThunderboltOutlined, SafetyOutlined, BarChartOutlined } from '@ant-design/icons'

const { Option } = Select

interface DynamicPositionConfigProps {
  form: any
  isEditing?: boolean
}

const DynamicPositionConfig: React.FC<DynamicPositionConfigProps> = ({ form, isEditing = false }) => {
  const [riskMode, setRiskMode] = useState<string>('balanced')

  const handleRiskModeChange = (value: string) => {
    setRiskMode(value)
    
    // 根據風險模式設置默認值
    const defaultValues = {
      conservative: {
        max_leverage: 2.0,
        leverage_usage_rate: 0.6,
        stop_loss_percent: 3.0,
        take_profit_percent: 6.0,
        max_drawdown: 10.0
      },
      balanced: {
        max_leverage: 3.0,
        leverage_usage_rate: 0.8,
        stop_loss_percent: 5.0,
        take_profit_percent: 10.0,
        max_drawdown: 15.0
      },
      aggressive: {
        max_leverage: 5.0,
        leverage_usage_rate: 0.9,
        stop_loss_percent: 8.0,
        take_profit_percent: 15.0,
        max_drawdown: 20.0
      }
    }
    
    const values = defaultValues[value as keyof typeof defaultValues]
    form.setFieldsValue(values)
  }

  return (
    <div className="neon-dashboard fadeInUp" style={{ padding: '20px', minHeight: '100vh' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 霓虹未來風格頁面標題 */}
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
            <ThunderboltOutlined style={{ fontSize: '36px', color: 'var(--accent-color)' }} />
            動態倉位策略配置
          </h1>
          <div style={{ 
            marginTop: '8px', 
            color: 'var(--text-secondary)',
            fontSize: '16px'
          }}>
            基於多指標綜合分析的智能杠桿交易策略配置界面
          </div>
        </div>

      <Alert
        message="🚀 動態倉位策略 - 杠桿版"
        description="基於多指標綜合分析的智能杠桿交易策略，支持1-10倍動態杠桿調整，實現風險與收益的最佳平衡"
        type="info"
        showIcon
        icon={<ThunderboltOutlined style={{ color: 'var(--accent-color)' }} />}
        className="fadeInUp"
        style={{ 
          marginBottom: 16,
          animationDelay: '0.2s',
          background: 'rgba(0, 245, 212, 0.1)',
          border: '1px solid var(--accent-color)',
          borderRadius: 'var(--panel-radius)',
          boxShadow: '0 0 10px rgba(0, 245, 212, 0.2)'
        }}
      />

      {/* 基本配置 - 霓虹面板 */}
      <Card 
        className="neon-panel fadeInUp"
        title={
          <span style={{ 
            color: 'var(--text-primary)', 
            fontSize: '16px',
            fontWeight: 'var(--font-weight-semibold)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <BarChartOutlined style={{ color: 'var(--accent-color)' }} />
            基本配置
          </span>
        }
        size="small" 
        style={{ 
          marginBottom: 16,
          animationDelay: '0.3s',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)'
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="策略名稱"
              name="name"
              rules={[{ required: true, message: '請輸入策略名稱' }]}
            >
              <Input placeholder="請輸入策略名稱" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="交易對"
              name="symbol"
              rules={[{ required: true, message: '請選擇交易對' }]}
            >
              <Select placeholder="請選擇交易對">
                <Option value="BTCUSDT">BTCUSDT</Option>
                <Option value="ETHUSDT">ETHUSDT</Option>
                <Option value="BNBUSDT">BNBUSDT</Option>
                <Option value="ADAUSDT">ADAUSDT</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 風險模式配置 */}
      <Card title="風險模式配置" size="small" style={{ marginBottom: 16 }}>
        <Alert
          message="風險模式說明"
          description={
            <div>
              <p><strong>保守型：</strong> 適合穩定收益，風險控制嚴格，最大杠桿2倍</p>
              <p><strong>平衡型：</strong> 平衡風險與收益，適合大多數用戶，最大杠桿3倍</p>
              <p><strong>激進型：</strong> 追求高收益，承受較高風險，最大杠桿5倍</p>
            </div>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />
        
        <Form.Item
          label="風險模式"
          name="risk_mode"
          rules={[{ required: true, message: '請選擇風險模式' }]}
        >
          <Select 
            placeholder="請選擇風險模式" 
            onChange={handleRiskModeChange}
            defaultValue="balanced"
          >
            <Option value="conservative">
              <Space>
                <SafetyOutlined style={{ color: '#52c41a' }} />
                保守型 (最大杠桿 2x, 止損 3%, 回撤控制 10%)
              </Space>
            </Option>
            <Option value="balanced">
              <Space>
                <BarChartOutlined style={{ color: '#1890ff' }} />
                平衡型 (最大杠桿 3x, 止損 5%, 回撤控制 15%)
              </Space>
            </Option>
            <Option value="aggressive">
              <Space>
                <ThunderboltOutlined style={{ color: '#faad14' }} />
                激進型 (最大杠桿 5x, 止損 8%, 回撤控制 20%)
              </Space>
            </Option>
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="最大杠桿倍數"
              name="max_leverage"
              rules={[{ required: true, message: '請輸入最大杠桿倍數' }]}
            >
              <InputNumber 
                min={1.0} 
                max={10.0} 
                step={0.5} 
                placeholder="1.0-10.0"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="杠桿使用率"
              name="leverage_usage_rate"
              rules={[{ required: true, message: '請輸入杠桿使用率' }]}
            >
              <InputNumber 
                min={0.1} 
                max={1.0} 
                step={0.1} 
                placeholder="0.1-1.0"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 風險管理配置 */}
      <Card title="風險管理配置" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="最大倉位大小"
              name="max_position_size"
              rules={[{ required: true, message: '請輸入最大倉位大小' }]}
            >
              <InputNumber 
                min={100} 
                max={100000} 
                step={100} 
                placeholder="USDT"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="止損百分比"
              name="stop_loss_percent"
              rules={[{ required: true, message: '請輸入止損百分比' }]}
            >
              <InputNumber 
                min={0.5} 
                max={20} 
                step={0.1} 
                placeholder="%"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="止盈百分比"
              name="take_profit_percent"
              rules={[{ required: true, message: '請輸入止盈百分比' }]}
            >
              <InputNumber 
                min={1} 
                max={50} 
                step={0.1} 
                placeholder="%"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="最大回撤限制"
          name="max_drawdown"
          rules={[{ required: true, message: '請輸入最大回撤限制' }]}
        >
          <InputNumber 
            min={5} 
            max={50} 
            step={1} 
            placeholder="%"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Card>

      {/* 技術指標配置 */}
      <Card title="技術指標配置" size="small" style={{ marginBottom: 16 }}>
        <Alert
          message="指標權重配置"
          description="估值指標34% + 風險調整指標33% + 基本面指標33%"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="RSI權重"
              name="rsi_weight"
              rules={[{ required: true, message: '請輸入RSI權重' }]}
            >
              <InputNumber 
                min={0} 
                max={1} 
                step={0.1} 
                placeholder="0.0-1.0"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="布林帶權重"
              name="bollinger_weight"
              rules={[{ required: true, message: '請輸入布林帶權重' }]}
            >
              <InputNumber 
                min={0} 
                max={1} 
                step={0.1} 
                placeholder="0.0-1.0"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="均線偏離權重"
              name="ma_deviation_weight"
              rules={[{ required: true, message: '請輸入均線偏離權重' }]}
            >
              <InputNumber 
                min={0} 
                max={1} 
                step={0.1} 
                placeholder="0.0-1.0"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="夏普比率權重"
              name="sharpe_weight"
              rules={[{ required: true, message: '請輸入夏普比率權重' }]}
            >
              <InputNumber 
                min={0} 
                max={1} 
                step={0.1} 
                placeholder="0.0-1.0"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="ATR效率權重"
              name="atr_efficiency_weight"
              rules={[{ required: true, message: '請輸入ATR效率權重' }]}
            >
              <InputNumber 
                min={0} 
                max={1} 
                step={0.1} 
                placeholder="0.0-1.0"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="成交量權重"
              name="volume_weight"
              rules={[{ required: true, message: '請輸入成交量權重' }]}
            >
              <InputNumber 
                min={0} 
                max={1} 
                step={0.1} 
                placeholder="0.0-1.0"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 高級配置 */}
      <Card title="高級配置" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Z-Score窗口"
              name="zscore_window"
              rules={[{ required: true, message: '請輸入Z-Score窗口' }]}
            >
              <InputNumber 
                min={30} 
                max={1000} 
                step={10} 
                placeholder="天數"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="百分位窗口"
              name="percentile_window"
              rules={[{ required: true, message: '請輸入百分位窗口' }]}
            >
              <InputNumber 
                min={60} 
                max={2000} 
                step={10} 
                placeholder="天數"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="買入開始百分位"
              name="buy_start_percentile"
              rules={[{ required: true, message: '請輸入買入開始百分位' }]}
            >
              <InputNumber 
                min={0.05} 
                max={0.5} 
                step={0.01} 
                placeholder="0.05-0.5"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="賣出開始百分位"
              name="sell_start_percentile"
              rules={[{ required: true, message: '請輸入賣出開始百分位' }]}
            >
              <InputNumber 
                min={0.5} 
                max={0.95} 
                step={0.01} 
                placeholder="0.5-0.95"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="動態杠桿"
              name="dynamic_leverage"
              valuePropName="checked"
            >
              <Select defaultValue={true}>
                <Option value={true}>啟用</Option>
                <Option value={false}>禁用</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>
      
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

export default DynamicPositionConfig