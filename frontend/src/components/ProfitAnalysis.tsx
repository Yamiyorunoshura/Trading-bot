import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Select, Button, Table, Space, Tag } from 'antd'
import { 
  CaretUpOutlined, 
  CaretDownOutlined, 
  DollarOutlined,
  RiseOutlined,
  ReloadOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts'
import dayjs from 'dayjs'
import { useAppStore } from '../stores/appStore'

const { Option } = Select

// 圖表顏色
const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2']

// 模擬數據
const profitData = [
  { date: '2024-01-01', daily_pnl: 120.5, cumulative_pnl: 120.5, trades: 5 },
  { date: '2024-01-02', daily_pnl: -80.2, cumulative_pnl: 40.3, trades: 3 },
  { date: '2024-01-03', daily_pnl: 200.8, cumulative_pnl: 241.1, trades: 8 },
  { date: '2024-01-04', daily_pnl: 150.3, cumulative_pnl: 391.4, trades: 6 },
  { date: '2024-01-05', daily_pnl: -50.1, cumulative_pnl: 341.3, trades: 4 },
  { date: '2024-01-06', daily_pnl: 320.7, cumulative_pnl: 662.0, trades: 12 },
  { date: '2024-01-07', daily_pnl: 180.9, cumulative_pnl: 842.9, trades: 7 },
]

const strategyProfitData = [
  { name: 'SMA交叉策略', profit: 1250.50, percentage: 45.2 },
  { name: '均值回歸策略', profit: 820.30, percentage: 29.6 },
  { name: '動量策略', profit: 560.80, percentage: 20.3 },
  { name: '套利策略', profit: 134.40, percentage: 4.9 },
]

const ProfitAnalysis: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d')
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

  // 計算統計數據
  const totalPnL = profitData.reduce((sum, item) => sum + item.daily_pnl, 0)
  const totalTrades = profitData.reduce((sum, item) => sum + item.trades, 0)
  const winningDays = profitData.filter(item => item.daily_pnl > 0).length
  const winRate = (winningDays / profitData.length) * 100
  const avgDailyPnL = totalPnL / profitData.length
  const maxDrawdown = Math.min(...profitData.map(item => item.daily_pnl))
  const bestDay = Math.max(...profitData.map(item => item.daily_pnl))

  const handleRefresh = () => {
    console.log('刷新利潤分析數據')
  }

  const handleExport = () => {
    console.log('導出利潤分析報告')
  }

  const profitColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '日收益',
      dataIndex: 'daily_pnl',
      key: 'daily_pnl',
      render: (value: number) => (
        <Statistic
          value={value}
          prefix={value >= 0 ? <CaretUpOutlined /> : <CaretDownOutlined />}
          valueStyle={{ color: value >= 0 ? '#3f8600' : '#cf1322', fontSize: '14px' }}
          precision={2}
        />
      )
    },
    {
      title: '累計收益',
      dataIndex: 'cumulative_pnl',
      key: 'cumulative_pnl',
      render: (value: number) => (
        <Statistic
          value={value}
          valueStyle={{ color: value >= 0 ? '#3f8600' : '#cf1322', fontSize: '14px' }}
          precision={2}
        />
      )
    },
    {
      title: '交易次數',
      dataIndex: 'trades',
      key: 'trades',
    },
    {
      title: '收益率',
      key: 'return_rate',
      render: (record: any) => {
        const rate = (record.daily_pnl / 10000) * 100 // 假設初始資金10000
        return (
          <Tag color={rate >= 0 ? 'green' : 'red'}>
            {rate >= 0 ? '+' : ''}{rate.toFixed(2)}%
          </Tag>
        )
      }
    }
  ]

  const strategyColumns = [
    {
      title: '策略名稱',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '利潤',
      dataIndex: 'profit',
      key: 'profit',
      render: (value: number) => (
        <Statistic
          value={value}
          prefix={<DollarOutlined />}
          valueStyle={{ color: '#3f8600', fontSize: '14px' }}
          precision={2}
        />
      )
    },
    {
      title: '佔比',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (value: number) => (
        <Tag color="blue">{value.toFixed(1)}%</Tag>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
                      <Card 
              title="利潤分析" 
              extra={
                <Space>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      color: isWebSocketConnected ? '#52c41a' : '#faad14',
                      fontSize: '12px'
                    }}>
                      ● {isWebSocketConnected ? '實時數據' : '連接中'}
                    </span>
                    {realtimeData.lastUpdate > 0 && (
                      <span style={{ color: '#888', fontSize: '12px' }}>
                        更新: {new Date(realtimeData.lastUpdate).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <Select value={timeRange} onChange={setTimeRange} style={{ width: 120 }}>
                    <Option value="7d">最近7天</Option>
                    <Option value="30d">最近30天</Option>
                    <Option value="90d">最近90天</Option>
                  </Select>
                  <Button onClick={handleRefresh} icon={<ReloadOutlined />}>
                    刷新
                  </Button>
                  <Button onClick={handleExport} icon={<DownloadOutlined />}>
                    導出
                  </Button>
                </Space>
              }
            >
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="總收益"
                    value={totalPnL}
                    precision={2}
                    valueStyle={{ color: totalPnL >= 0 ? '#3f8600' : '#cf1322' }}
                    prefix={totalPnL >= 0 ? <CaretUpOutlined /> : <CaretDownOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="平均日收益"
                    value={avgDailyPnL}
                    precision={2}
                    valueStyle={{ color: avgDailyPnL >= 0 ? '#3f8600' : '#cf1322' }}
                    prefix={<DollarOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="勝率"
                    value={winRate}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<RiseOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="總交易次數"
                    value={totalTrades}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="收益詳情">
            <Table
              dataSource={profitData}
              columns={profitColumns}
              rowKey="date"
              size="small"
              pagination={false}
            />
          </Card>
        </Col>

        <Col span={16}>
          <Card title="收益趨勢圖">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
                  tickFormatter={(value) => dayjs(value).format('MM-DD')}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                  formatter={(value, name) => [
                    `$${Number(value).toFixed(2)}`, 
                    name === 'daily_pnl' ? '日收益' : '累計收益'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cumulative_pnl" 
                  stroke="#1890ff" 
                  strokeWidth={2}
                  name="累計收益"
                  dot={{ fill: '#1890ff', strokeWidth: 2, r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="daily_pnl" 
                  stroke="#52c41a" 
                  strokeWidth={2}
                  name="日收益"
                  dot={{ fill: '#52c41a', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="策略收益分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={strategyProfitData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="profit"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {strategyProfitData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, '利潤']}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="策略收益表格">
            <Table
              dataSource={strategyProfitData}
              columns={strategyColumns}
              rowKey="name"
              size="small"
              pagination={false}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="風險指標">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="最大回撤"
                    value={Math.abs(maxDrawdown)}
                    precision={2}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<CaretDownOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="最佳單日"
                    value={bestDay}
                    precision={2}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CaretUpOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="夏普比率"
                    value={1.85}
                    precision={2}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ProfitAnalysis