import React, { useState } from 'react'
import { 
  Card, 
  Form, 
  Input, 
  InputNumber, 
  Switch, 
  Button, 
  Select, 
  Divider, 
  Space,
  Row,
  Col,
  Alert,
  Modal,
  Table,
  Tag,
  message
} from 'antd'
import { 
  SettingOutlined, 
  SaveOutlined, 
  ReloadOutlined, 
  PlayCircleOutlined,
  KeyOutlined,
  BellOutlined,
  DatabaseOutlined,
  CloudUploadOutlined,
  HistoryOutlined
} from '@ant-design/icons'

const { Option } = Select
const { TextArea } = Input

const SystemSettings: React.FC = () => {
  const [form] = Form.useForm()
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null)

  const handleSaveSettings = async () => {
    try {
      const values = await form.validateFields()
      console.log('System settings:', values)
      message.success('設置保存成功')
    } catch (error) {
      console.error('Form validation failed:', error)
    }
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    // 模擬連接測試
    setTimeout(() => {
      setConnectionStatus('success')
      setIsTestingConnection(false)
      message.success('連接測試成功')
    }, 2000)
  }

  const handleResetSettings = () => {
    Modal.confirm({
      title: '確定要重置所有設置嗎？',
      content: '此操作將清除所有自定義設置，恢復到默認配置。',
      okText: '確定',
      cancelText: '取消',
      onOk() {
        form.resetFields()
        message.success('設置已重置')
      },
    })
  }

  // 系統日誌數據
  const logData = [
    {
      key: 1,
      timestamp: '2024-01-07 15:30:15',
      level: 'INFO',
      module: 'TradingEngine',
      message: '策略 SMA_CROSSOVER 已啟動'
    },
    {
      key: 2,
      timestamp: '2024-01-07 15:29:45',
      level: 'WARNING',
      module: 'RiskManager',
      message: '當前回撤水平接近警戒線'
    },
    {
      key: 3,
      timestamp: '2024-01-07 15:28:30',
      level: 'ERROR',
      module: 'DataCollector',
      message: 'Binance API 連接暫時中斷'
    },
  ]

  const logColumns = [
    {
      title: '時間',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
    },
    {
      title: '級別',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => {
        const color = level === 'ERROR' ? 'red' : level === 'WARNING' ? 'orange' : 'blue'
        return <Tag color={color}>{level}</Tag>
      }
    },
    {
      title: '模組',
      dataIndex: 'module',
      key: 'module',
      width: 120,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
    },
  ]

  return (
    <div className="system-settings">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#ffffff', margin: 0 }}>
          <SettingOutlined style={{ marginRight: '8px' }} />
          系統設置
        </h2>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card title="交易所設置" style={{ marginBottom: '20px' }}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                exchange: 'binance',
                api_key: '',
                api_secret: '',
                testnet: false,
                auto_reconnect: true,
                connection_timeout: 30
              }}
            >
              <h4 style={{ color: '#ffffff', marginBottom: '16px' }}>
                <KeyOutlined style={{ marginRight: '8px' }} />
                API 配置
              </h4>

              <Form.Item
                label="交易所"
                name="exchange"
                rules={[{ required: true, message: '請選擇交易所' }]}
              >
                <Select>
                  <Option value="binance">Binance</Option>
                  <Option value="okx">OKX</Option>
                  <Option value="huobi">Huobi</Option>
                  <Option value="bybit">Bybit</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="API Key"
                name="api_key"
                rules={[{ required: true, message: '請輸入 API Key' }]}
              >
                <Input.Password placeholder="請輸入 API Key" />
              </Form.Item>

              <Form.Item
                label="API Secret"
                name="api_secret"
                rules={[{ required: true, message: '請輸入 API Secret' }]}
              >
                <Input.Password placeholder="請輸入 API Secret" />
              </Form.Item>

              <Form.Item
                label="測試環境"
                name="testnet"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="自動重連"
                name="auto_reconnect"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="連接超時"
                name="connection_timeout"
                rules={[{ required: true, message: '請輸入連接超時時間' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={5}
                  max={120}
                  step={5}
                  addonAfter="秒"
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button 
                    type="default" 
                    icon={<PlayCircleOutlined />}
                    onClick={handleTestConnection}
                    loading={isTestingConnection}
                  >
                    測試連接
                  </Button>
                  
                  {connectionStatus === 'success' && (
                    <span style={{ color: '#52c41a' }}>✓ 連接成功</span>
                  )}
                  
                  {connectionStatus === 'error' && (
                    <span style={{ color: '#ff4d4f' }}>✗ 連接失敗</span>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>

          <Card title="通知設置">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                discord_enabled: true,
                discord_webhook: '',
                email_enabled: false,
                email_smtp: '',
                email_username: '',
                email_password: '',
                notify_on_trade: true,
                notify_on_profit: true,
                notify_on_loss: true,
                notify_on_risk: true
              }}
            >
              <h4 style={{ color: '#ffffff', marginBottom: '16px' }}>
                <BellOutlined style={{ marginRight: '8px' }} />
                通知配置
              </h4>

              <Form.Item
                label="Discord 通知"
                name="discord_enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="Discord Webhook URL"
                name="discord_webhook"
                rules={[{ type: 'url', message: '請輸入有效的 URL' }]}
              >
                <Input placeholder="請輸入 Discord Webhook URL" />
              </Form.Item>

              <Form.Item
                label="郵件通知"
                name="email_enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Divider>通知事件</Divider>

              <Form.Item
                label="交易執行通知"
                name="notify_on_trade"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="盈利通知"
                name="notify_on_profit"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="虧損通知"
                name="notify_on_loss"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="風險警報"
                name="notify_on_risk"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="數據庫設置" style={{ marginBottom: '20px' }}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                postgres_host: 'localhost',
                postgres_port: 5432,
                postgres_db: 'trading_bot',
                postgres_user: 'postgres',
                postgres_password: '',
                redis_host: 'localhost',
                redis_port: 6379,
                redis_password: '',
                backup_enabled: true,
                backup_interval: 24
              }}
            >
              <h4 style={{ color: '#ffffff', marginBottom: '16px' }}>
                <DatabaseOutlined style={{ marginRight: '8px' }} />
                PostgreSQL 配置
              </h4>

              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    label="主機地址"
                    name="postgres_host"
                    rules={[{ required: true, message: '請輸入主機地址' }]}
                  >
                    <Input placeholder="localhost" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="端口"
                    name="postgres_port"
                    rules={[{ required: true, message: '請輸入端口' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={1} max={65535} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="資料庫名稱"
                name="postgres_db"
                rules={[{ required: true, message: '請輸入資料庫名稱' }]}
              >
                <Input placeholder="trading_bot" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="用戶名"
                    name="postgres_user"
                    rules={[{ required: true, message: '請輸入用戶名' }]}
                  >
                    <Input placeholder="postgres" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="密碼"
                    name="postgres_password"
                    rules={[{ required: true, message: '請輸入密碼' }]}
                  >
                    <Input.Password placeholder="請輸入密碼" />
                  </Form.Item>
                </Col>
              </Row>

              <h4 style={{ color: '#ffffff', marginBottom: '16px', marginTop: '24px' }}>
                Redis 配置
              </h4>

              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    label="主機地址"
                    name="redis_host"
                    rules={[{ required: true, message: '請輸入主機地址' }]}
                  >
                    <Input placeholder="localhost" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="端口"
                    name="redis_port"
                    rules={[{ required: true, message: '請輸入端口' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={1} max={65535} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="密碼"
                name="redis_password"
              >
                <Input.Password placeholder="請輸入密碼（可選）" />
              </Form.Item>

              <h4 style={{ color: '#ffffff', marginBottom: '16px', marginTop: '24px' }}>
                <CloudUploadOutlined style={{ marginRight: '8px' }} />
                備份設置
              </h4>

              <Form.Item
                label="啟用自動備份"
                name="backup_enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="備份間隔"
                name="backup_interval"
                rules={[{ required: true, message: '請輸入備份間隔' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={168}
                  step={1}
                  addonAfter="小時"
                />
              </Form.Item>
            </Form>
          </Card>

          <Card title="系統日誌">
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#ffffff', margin: 0 }}>
                <HistoryOutlined style={{ marginRight: '8px' }} />
                最近日誌記錄
              </h4>
            </div>
            
            <Table
              dataSource={logData}
              columns={logColumns}
              size="small"
              pagination={false}
              scroll={{ y: 200 }}
            />
          </Card>
        </Col>
      </Row>

              <Card style={{ marginTop: '20px' }}>
        <Space style={{ width: '100%', justifyContent: 'center' }}>
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={handleSaveSettings}
            size="large"
          >
            保存所有設置
          </Button>
          
          <Button 
            type="default" 
            icon={<ReloadOutlined />}
            onClick={handleResetSettings}
            size="large"
          >
            重置設置
          </Button>
        </Space>
      </Card>
    </div>
  )
}

export default SystemSettings