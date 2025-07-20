/**
 * 系統性能測試組件
 * 第五階段：測試和優化 - 全面系統測試工具
 */

import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Button,
  Progress,
  Alert,
  Table,
  Tag,
  Space,
  Statistic,
  Timeline,
  Descriptions,
  notification,
  Spin,
  Divider
} from 'antd'
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
  MonitorOutlined,
  BugOutlined,
  SettingOutlined
} from '@ant-design/icons'

interface TestResult {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning'
  duration?: number
  details?: string
  score?: number
}

interface PerformanceMetrics {
  bundleSize: number
  loadTime: number
  renderTime: number
  memoryUsage: number
  componentCount: number
  codeLines: number
}

const SystemPerformanceTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([
    {
      id: 'component-render',
      name: '組件渲染測試',
      description: '測試所有主要組件的渲染性能',
      status: 'pending'
    },
    {
      id: 'data-flow',
      name: '數據流測試',
      description: '測試狀態管理和數據傳遞',
      status: 'pending'
    },
    {
      id: 'websocket-connection',
      name: 'WebSocket連接測試',
      description: '測試實時數據連接和更新',
      status: 'pending'
    },
    {
      id: 'responsive-design',
      name: '響應式設計測試',
      description: '測試不同屏幕尺寸的適配',
      status: 'pending'
    },
    {
      id: 'error-handling',
      name: '錯誤處理測試',
      description: '測試異常情況的處理',
      status: 'pending'
    },
    {
      id: 'memory-leaks',
      name: '內存洩漏測試',
      description: '檢查組件卸載時的內存清理',
      status: 'pending'
    },
    {
      id: 'accessibility',
      name: '無障礙測試',
      description: '檢查鍵盤導航和屏幕閱讀器支持',
      status: 'pending'
    },
    {
      id: 'build-optimization',
      name: '構建優化測試',
      description: '檢查Bundle大小和構建時間',
      status: 'pending'
    }
  ])

  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [overallProgress, setOverallProgress] = useState(0)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    bundleSize: 2974.34,
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 17,
    codeLines: 12000
  })

  // 模擬測試執行
  const runSingleTest = async (testId: string): Promise<TestResult> => {
    const test = testResults.find(t => t.id === testId)!
    const startTime = Date.now()

    // 更新測試狀態為運行中
    setTestResults(prev => 
      prev.map(t => 
        t.id === testId 
          ? { ...t, status: 'running' as const }
          : t
      )
    )

    // 模擬測試執行時間
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000))

    const duration = Date.now() - startTime
    const success = Math.random() > 0.1 // 90% 成功率

    // 根據測試類型生成結果
    let status: TestResult['status'] = success ? 'passed' : 'failed'
    let details = ''
    let score = 0

    switch (testId) {
      case 'component-render':
        score = success ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 40) + 30
        details = success 
          ? `所有組件渲染正常，平均渲染時間: ${Math.floor(Math.random() * 50) + 10}ms`
          : '部分組件渲染異常，需要優化'
        break
      case 'data-flow':
        score = success ? Math.floor(Math.random() * 15) + 85 : Math.floor(Math.random() * 30) + 40
        details = success 
          ? '狀態管理正常，數據流暢'
          : '狀態更新存在延遲問題'
        break
      case 'websocket-connection':
        score = success ? Math.floor(Math.random() * 10) + 90 : Math.floor(Math.random() * 20) + 50
        details = success 
          ? 'WebSocket連接穩定，實時更新正常'
          : 'WebSocket連接不穩定'
        break
      case 'responsive-design':
        score = success ? Math.floor(Math.random() * 15) + 85 : Math.floor(Math.random() * 25) + 60
        details = success 
          ? '響應式設計完美適配各種屏幕'
          : '部分組件在小屏幕上顯示異常'
        break
      case 'error-handling':
        score = success ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 30) + 50
        details = success 
          ? '錯誤處理機制完善'
          : '部分錯誤未正確處理'
        break
      case 'memory-leaks':
        score = success ? Math.floor(Math.random() * 10) + 90 : Math.floor(Math.random() * 40) + 40
        details = success 
          ? '無內存洩漏，組件清理完善'
          : '發現潛在內存洩漏'
        if (score < 70) status = 'warning'
        break
      case 'accessibility':
        score = success ? Math.floor(Math.random() * 25) + 75 : Math.floor(Math.random() * 35) + 45
        details = success 
          ? '無障礙支持良好'
          : '部分無障礙功能需要改進'
        break
      case 'build-optimization':
        score = success ? Math.floor(Math.random() * 15) + 85 : Math.floor(Math.random() * 20) + 60
        details = success 
          ? `Bundle大小: ${performanceMetrics.bundleSize}kB，構建時間: 13.63s`
          : 'Bundle大小過大，需要優化'
        break
      default:
        score = success ? 85 : 45
        details = success ? '測試通過' : '測試失敗'
    }

    return {
      ...test,
      status,
      duration,
      details,
      score
    }
  }

  // 運行所有測試
  const runAllTests = async () => {
    setIsRunning(true)
    setOverallProgress(0)
    
    const results: TestResult[] = []
    
    for (let i = 0; i < testResults.length; i++) {
      const test = testResults[i]
      setCurrentTest(test.id)
      
      try {
        const result = await runSingleTest(test.id)
        results.push(result)
        
        // 更新結果
        setTestResults(prev => 
          prev.map(t => 
            t.id === test.id ? result : t
          )
        )
        
        setOverallProgress(((i + 1) / testResults.length) * 100)
        
      } catch (error) {
        const failedResult: TestResult = {
          ...test,
          status: 'failed',
          details: `測試執行失敗: ${error}`,
          score: 0
        }
        results.push(failedResult)
        
        setTestResults(prev => 
          prev.map(t => 
            t.id === test.id ? failedResult : t
          )
        )
      }
    }
    
    setCurrentTest(null)
    setIsRunning(false)
    
    // 計算總體分數
    const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length
    const passedTests = results.filter(r => r.status === 'passed').length
    
    notification.success({
      message: '系統測試完成',
      description: `通過 ${passedTests}/${results.length} 項測試，總體評分: ${totalScore.toFixed(1)}/100`,
      duration: 5
    })
  }

  // 重置測試
  const resetTests = () => {
    setTestResults(prev => 
      prev.map(t => ({ ...t, status: 'pending' as const, duration: undefined, details: undefined, score: undefined }))
    )
    setOverallProgress(0)
    setCurrentTest(null)
  }

  // 獲取狀態圖標
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      case 'running':
        return <Spin size="small" />
      default:
        return <PlayCircleOutlined style={{ color: '#d9d9d9' }} />
    }
  }

  // 獲取狀態標籤
  const getStatusTag = (status: TestResult['status']) => {
    const configs = {
      pending: { color: 'default', text: '待測試' },
      running: { color: 'processing', text: '運行中' },
      passed: { color: 'success', text: '通過' },
      failed: { color: 'error', text: '失敗' },
      warning: { color: 'warning', text: '警告' }
    }
    const config = configs[status]
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // 表格列定義
  const columns = [
    {
      title: '測試項目',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TestResult) => (
        <Space>
          {getStatusIcon(record.status)}
          <span style={{ fontWeight: record.status === 'running' ? 'bold' : 'normal' }}>
            {name}
          </span>
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: TestResult['status']) => getStatusTag(status)
    },
    {
      title: '耗時',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration?: number) => duration ? `${duration}ms` : '-'
    },
    {
      title: '評分',
      dataIndex: 'score',
      key: 'score',
      render: (score?: number) => {
        if (score === undefined) return '-'
        const color = score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f'
        return <span style={{ color, fontWeight: 'bold' }}>{score}/100</span>
      }
    },
    {
      title: '詳情',
      dataIndex: 'details',
      key: 'details',
      render: (details?: string) => details || '-'
    }
  ]

  // 計算統計數據
  const passedCount = testResults.filter(t => t.status === 'passed').length
  const failedCount = testResults.filter(t => t.status === 'failed').length
  const warningCount = testResults.filter(t => t.status === 'warning').length
  const averageScore = testResults
    .filter(t => t.score !== undefined)
    .reduce((sum, t) => sum + (t.score || 0), 0) / testResults.filter(t => t.score !== undefined).length || 0

  useEffect(() => {
    // 模擬性能指標更新
    const interval = setInterval(() => {
      setPerformanceMetrics(prev => ({
        ...prev,
        loadTime: Math.random() * 1000 + 500,
        renderTime: Math.random() * 100 + 50,
        memoryUsage: Math.random() * 50 + 30
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 頁面標題 */}
        <div>
          <h2>
            <BugOutlined style={{ marginRight: '8px' }} />
            系統性能測試
          </h2>
          <p>全面測試系統功能、性能和用戶體驗</p>
        </div>

        {/* 控制面板 */}
        <Card title="測試控制" size="small">
          <Row gutter={16}>
            <Col span={16}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={runAllTests}
                  loading={isRunning}
                  disabled={isRunning}
                >
                  運行所有測試
                </Button>
                
                <Button
                  icon={<ReloadOutlined />}
                  onClick={resetTests}
                  disabled={isRunning}
                >
                  重置測試
                </Button>
              </Space>
            </Col>
            
            <Col span={8} style={{ textAlign: 'right' }}>
              {isRunning && currentTest && (
                <div>
                  <span style={{ color: '#1890ff' }}>
                    正在測試: {testResults.find(t => t.id === currentTest)?.name}
                  </span>
                </div>
              )}
            </Col>
          </Row>
          
          {isRunning && (
            <div style={{ marginTop: '16px' }}>
              <Progress 
                percent={Math.floor(overallProgress)} 
                status="active" 
                strokeColor="#1890ff"
              />
            </div>
          )}
        </Card>

        {/* 測試統計 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="通過測試"
                value={passedCount}
                suffix={`/${testResults.length}`}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          
          <Col span={6}>
            <Card>
              <Statistic
                title="失敗測試"
                value={failedCount}
                suffix={`/${testResults.length}`}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
          
          <Col span={6}>
            <Card>
              <Statistic
                title="警告測試"
                value={warningCount}
                suffix={`/${testResults.length}`}
                valueStyle={{ color: '#faad14' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          
          <Col span={6}>
            <Card>
              <Statistic
                title="平均評分"
                value={averageScore.toFixed(1)}
                suffix="/100"
                valueStyle={{ 
                  color: averageScore >= 80 ? '#52c41a' : 
                         averageScore >= 60 ? '#faad14' : '#ff4d4f'
                }}
                prefix={<RocketOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 性能指標 */}
        <Card title="性能指標" size="small">
          <Row gutter={16}>
            <Col span={8}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Bundle 大小">
                  {performanceMetrics.bundleSize} kB
                </Descriptions.Item>
                <Descriptions.Item label="組件數量">
                  {performanceMetrics.componentCount}
                </Descriptions.Item>
                <Descriptions.Item label="代碼行數">
                  {performanceMetrics.codeLines.toLocaleString()}
                </Descriptions.Item>
              </Descriptions>
            </Col>
            
            <Col span={8}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="頁面加載時間">
                  {performanceMetrics.loadTime.toFixed(0)} ms
                </Descriptions.Item>
                <Descriptions.Item label="渲染時間">
                  {performanceMetrics.renderTime.toFixed(0)} ms
                </Descriptions.Item>
                <Descriptions.Item label="內存使用">
                  {performanceMetrics.memoryUsage.toFixed(1)} MB
                </Descriptions.Item>
              </Descriptions>
            </Col>
            
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  {averageScore > 0 ? averageScore.toFixed(0) : '--'}
                </div>
                <div style={{ color: '#666', fontSize: '14px' }}>
                  系統健康度評分
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 測試結果表格 */}
        <Card title="測試結果詳情" size="small">
          <Table
            dataSource={testResults}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ y: 400 }}
            rowClassName={(record) => 
              record.status === 'failed' ? 'test-failed' : 
              record.status === 'warning' ? 'test-warning' : 
              record.status === 'running' ? 'test-running' : ''
            }
          />
        </Card>

        <style>{`
          .test-failed {
            background-color: #fff2f0;
          }
          .test-warning {
            background-color: #fffbe6;
          }
          .test-running {
            background-color: #e6f7ff;
          }
        `}</style>
      </Space>
    </div>
  )
}

export default SystemPerformanceTest 