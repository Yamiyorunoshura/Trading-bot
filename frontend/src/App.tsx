import React, { useState } from 'react'
import { Layout, Menu, ConfigProvider, theme } from 'antd'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { 
  DashboardOutlined, 
  LineChartOutlined, 
  BarChartOutlined,
  SettingOutlined,
  RobotOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import Dashboard from './components/Dashboard'
import StrategyManagement from './components/StrategyManagement'
import ProfitAnalysis from './components/ProfitAnalysis'
import BacktestAnalysis from './components/BacktestAnalysis'
import RiskManagement from './components/RiskManagement'
import SystemSettings from './components/SystemSettings'
import { useAppStore } from './stores/appStore'
import './App.css'

const { Header, Sider, Content } = Layout

// 菜單項目
const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: '儀表板',
  },
  {
    key: '/strategies',
    icon: <RobotOutlined />,
    label: '策略管理',
  },
  {
    key: '/profit',
    icon: <LineChartOutlined />,
    label: '盈利分析',
  },
  {
    key: '/backtest',
    icon: <BarChartOutlined />,
    label: '回測分析',
  },
  {
    key: '/risk',
    icon: <ExclamationCircleOutlined />,
    label: '風險管理',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系統設置',
  },
]

const AppContent: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { systemStatus, isWebSocketConnected } = useAppStore()

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
        style={{ 
          background: '#141414',
          borderRight: '1px solid #333'
        }}
      >
        <div style={{ 
          height: '64px', 
          margin: '16px', 
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1890ff'
        }}>
          {collapsed ? '交易' : '量化交易機器人'}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ background: '#141414' }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          background: '#1a1a1a', 
          padding: '0 20px',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{ 
            margin: 0, 
            color: '#ffffff',
            fontSize: '20px',
            fontWeight: 'bold'
          }}>
            量化交易機器人管理平台
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                color: systemStatus?.bot_running ? '#52c41a' : '#faad14' 
              }}>●</span>
              <span style={{ color: '#ffffff', marginLeft: '8px' }}>
                {systemStatus?.bot_running ? '運行中' : '已停止'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                color: isWebSocketConnected ? '#52c41a' : '#ff4d4f' 
              }}>●</span>
              <span style={{ color: '#ffffff', marginLeft: '8px', fontSize: '14px' }}>
                {isWebSocketConnected ? '實時連接' : '連接斷開'}
              </span>
            </div>
          </div>
        </Header>
        
        <Content style={{ 
          margin: '20px',
          padding: '20px',
          background: '#0a0a0a',
          color: '#ffffff',
          overflow: 'auto'
        }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/strategies" element={<StrategyManagement />} />
            <Route path="/profit" element={<ProfitAnalysis />} />
            <Route path="/backtest" element={<BacktestAnalysis />} />
            <Route path="/risk" element={<RiskManagement />} />
            <Route path="/settings" element={<SystemSettings />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          colorBgContainer: '#1a1a1a',
          colorBgElevated: '#262626',
          colorBorder: '#333',
          colorText: '#ffffff',
        },
      }}
    >
      <Router>
        <AppContent />
      </Router>
    </ConfigProvider>
  )
}

export default App