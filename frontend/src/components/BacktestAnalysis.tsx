import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Select, DatePicker, Button, Table, Statistic, Row, Col, Progress, Alert, Space } from 'antd'
import { PlayCircleOutlined, BarChartOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'
import dayjs from 'dayjs'
import { useAppStore } from '../stores/appStore'

const { Option } = Select
const { RangePicker } = DatePicker

const BacktestAnalysis: React.FC = () => {
  const [form] = Form.useForm()
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { 
    isWebSocketConnected, 
    realtimeData, 
    connectWebSocket, 
    disconnectWebSocket 
  } = useAppStore()

  useEffect(() => {
    // 連接WebSocket以獲取實時數據
    connectWebSocket()
    
    return () => {
      disconnectWebSocket()
    }
  }, [connectWebSocket, disconnectWebSocket])

  const handleRunBacktest = async () => {
    try {
      setIsRunning(true)
      const values = await form.validateFields()
      console.log('Backtest config:', values)
      
      // 模擬回測過程
      setTimeout(() => {
        setResults({
          initial_capital: 10000,
          final_capital: 12350,
          total_return: 23.5,
          annual_return: 28.2,
          max_drawdown: 8.5,
          sharpe_ratio: 1.85,
          total_trades: 156,
          win_rate: 65.2,
          profit_factor: 2.34,
          volatility: 15.2,
          avg_trade_duration: 4.2,
          largest_win: 450.80,
          largest_loss: -120.50
        })
        setIsRunning(false)
      }, 3000)
    } catch (error) {
      console.error('Form validation failed:', error)
      setIsRunning(false)
    }
  }

  const handleClearResults = () => {
    setResults(null)
  }

  const handleExportResults = () => {
    if (results) {
      console.log('導出回測結果:', results)
    }
  }

  // 模擬回測數據
  const backtestData = [
    { date: '2024-01', balance: 10000, drawdown: 0, trades: 12 },
    { date: '2024-02', balance: 10250, drawdown: -2.5, trades: 18 },
    { date: '2024-03', balance: 10800, drawdown: -1.2, trades: 22 },
    { date: '2024-04', balance: 10600, drawdown: -5.8, trades: 15 },
    { date: '2024-05', balance: 11200, drawdown: -3.1, trades: 25 },
    { date: '2024-06', balance: 11800, drawdown: -4.2, trades: 20 },
    { date: '2024-07', balance: 12350, drawdown: -2.8, trades: 24 },
  ]

  const tradeColumns = [
    {
      title: '月份',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '資金餘額',
      dataIndex: 'balance',
      key: 'balance',
      render: (value: number) => `$${value.toLocaleString()}`
    },
    {
      title: '最大回撤',
      dataIndex: 'drawdown',
      key: 'drawdown',
      render: (value: number) => (
        <span style={{ color: value < 0 ? '#cf1322' : '#3f8600' }}>
          {value.toFixed(1)}%
        </span>
      )
    },
    {
      title: '交易次數',
      dataIndex: 'trades',
      key: 'trades',
    },
    {
      title: '月收益率',
      key: 'monthly_return',
      render: (_: any, record: any) => {
        // 簡化計算，使用固定的模擬收益率
        const rates = [0, 2.5, 5.37, -1.85, 5.66, 5.36, 4.66]
        const rateIndex = backtestData.findIndex(item => item.date === record.date)
        const rate = rates[rateIndex] || 0
        return (
          <span style={{ color: rate >= 0 ? '#3f8600' : '#cf1322' }}>
            {rate >= 0 ? '+' : ''}{rate.toFixed(2)}%
          </span>
        )
      }
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="回測配置">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                strategy: 'sma_crossover',
                timeframe: '1d',
                initial_capital: 10000,
                date_range: [dayjs('2024-01-01'), dayjs('2024-07-31')],
                commission: 0.1
              }}
            >
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Form.Item
                    label="策略選擇"
                    name="strategy"
                    rules={[{ required: true, message: '請選擇策略' }]}
                  >
                    <Select>
                      <Option value="sma_crossover">SMA交叉策略</Option>
                      <Option value="mean_reversion">均值回歸策略</Option>
                      <Option value="momentum">動量策略</Option>
                      <Option value="arbitrage">套利策略</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label="時間框架"
                    name="timeframe"
                    rules={[{ required: true, message: '請選擇時間框架' }]}
                  >
                    <Select>
                      <Option value="1m">1分鐘</Option>
                      <Option value="5m">5分鐘</Option>
                      <Option value="15m">15分鐘</Option>
                      <Option value="1h">1小時</Option>
                      <Option value="1d">1天</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label="初始資金"
                    name="initial_capital"
                    rules={[{ required: true, message: '請輸入初始資金' }]}
                  >
                    <Input prefix="$" placeholder="10000" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label="手續費率"
                    name="commission"
                    rules={[{ required: true, message: '請輸入手續費率' }]}
                  >
                    <Input suffix="%" placeholder="0.1" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label="回測時間範圍"
                    name="date_range"
                    rules={[{ required: true, message: '請選擇時間範圍' }]}
                  >
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="操作">
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={handleRunBacktest}
                        loading={isRunning}
                      >
                        {isRunning ? '運行中...' : '開始回測'}
                      </Button>
                      <Button onClick={handleClearResults} disabled={!results}>
                        清除結果
                      </Button>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={handleExportResults}
                        disabled={!results}
                      >
                        導出結果
                      </Button>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {isRunning && (
          <Col span={24}>
            <Card>
              <Alert
                message="回測進行中"
                description="正在分析歷史數據並執行交易策略，請稍候..."
                type="info"
                showIcon
              />
              <div style={{ marginTop: 16 }}>
                <Progress percent={75} status="active" />
              </div>
            </Card>
          </Col>
        )}

        {results && (
          <>
            <Col span={24}>
              <Card title="回測結果">
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="初始資金"
                        value={results.initial_capital}
                        prefix="$"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="最終資金"
                        value={results.final_capital}
                        prefix="$"
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="總收益率"
                        value={results.total_return}
                        suffix="%"
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="年化收益率"
                        value={results.annual_return}
                        suffix="%"
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col span={24}>
              <Card title="風險指標">
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="最大回撤"
                        value={results.max_drawdown}
                        suffix="%"
                        valueStyle={{ color: '#cf1322' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="夏普比率"
                        value={results.sharpe_ratio}
                        precision={2}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="波動率"
                        value={results.volatility}
                        suffix="%"
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="盈利因子"
                        value={results.profit_factor}
                        precision={2}
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col span={24}>
              <Card title="交易統計">
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="總交易次數"
                        value={results.total_trades}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="勝率"
                        value={results.win_rate}
                        suffix="%"
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="平均持倉時間"
                        value={results.avg_trade_duration}
                        suffix="小時"
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="最大盈利"
                        value={results.largest_win}
                        prefix="$"
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col span={24}>
              <Card title="資金曲線圖">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={backtestData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#888', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="balance"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#888', fontSize: 12 }}
                      domain={['dataMin - 500', 'dataMax + 500']}
                    />
                    <YAxis 
                      yAxisId="drawdown"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#888', fontSize: 12 }}
                      domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #333',
                        borderRadius: '6px',
                        color: '#fff'
                      }}
                      formatter={(value, name) => [
                        name === 'balance' ? `$${Number(value).toLocaleString()}` : `${Number(value).toFixed(1)}%`,
                        name === 'balance' ? '資金餘額' : '回撤'
                      ]}
                    />
                    <Legend />
                    <Line 
                      yAxisId="balance"
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#1890ff" 
                      strokeWidth={2}
                      name="資金餘額"
                      dot={{ fill: '#1890ff', strokeWidth: 2, r: 3 }}
                    />
                    <Line 
                      yAxisId="drawdown"
                      type="monotone" 
                      dataKey="drawdown" 
                      stroke="#ff4d4f" 
                      strokeWidth={2}
                      name="回撤"
                      dot={{ fill: '#ff4d4f', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col span={24}>
              <Card title="回測數據詳情">
                <Table
                  dataSource={backtestData}
                  columns={tradeColumns}
                  rowKey="date"
                  size="small"
                  pagination={false}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>
    </div>
  )
}

export default BacktestAnalysis